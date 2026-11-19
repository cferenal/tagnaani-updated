import calendar, csv, hashlib, io, json, math, os, re, threading, time, uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import requests
from flask import Flask, jsonify, request, send_from_directory

BASE=Path(__file__).resolve().parent
DATA=BASE/'data'; DATA.mkdir(exist_ok=True)
APP='https://appeears.earthdatacloud.nasa.gov/api'
POWER='https://power.larc.nasa.gov/api/temporal/climatology/point'
WEATHER='https://api.open-meteo.com/v1/forecast'
MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
app=Flask(__name__,static_folder='static'); app.config['MAX_CONTENT_LENGTH']=1024*1024
TOKEN={'token':None,'expires':0}; LOCK=threading.Lock()

def stamp(): return datetime.now(timezone.utc).isoformat()
def number(x): return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)
def coords(d):
    lat,lon=float(d['lat']),float(d['lon'])
    if not math.isfinite(lat) or not math.isfinite(lon) or not (-90<=lat<=90 and -180<=lon<=180): raise ValueError('Invalid latitude/longitude')
    return lat,lon

def remote(method,url,**kw):
    r=requests.request(method,url,timeout=(15,90),**kw)
    if not r.ok: raise ValueError(f'Upstream HTTP {r.status_code}: '+r.text[:350])
    return r

def cached(url,params):
    key=hashlib.sha256((url+json.dumps(params,sort_keys=True)).encode()).hexdigest()
    p=DATA/(key+'.json')
    try:
        data=remote('GET',url,params=params).json()
        result={'status':'Retrieved','retrieved_at':stamp(),'data':data,'source_url':url,'query':params}
        tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(result));tmp.replace(p)
        return result
    except Exception as e:
        if p.exists():
            result=json.loads(p.read_text()); result.update(status='Cached',refresh_error=str(e));return result
        return {'status':'Unavailable','error':str(e),'source_url':url,'query':params}

def auth():
    with LOCK:
        if TOKEN['token'] and time.time()<TOKEN['expires']: return {'Authorization':'Bearer '+TOKEN['token']}
    u,p=os.getenv('EARTHDATA_USERNAME'),os.getenv('EARTHDATA_PASSWORD')
    if not u or not p: raise ValueError('Earthdata login required: use the login form (memory only) or set EARTHDATA_USERNAME / EARTHDATA_PASSWORD.')
    login(u,p)
    return {'Authorization':'Bearer '+TOKEN['token']}

def login(u,p):
    d=remote('POST',APP+'/login',auth=(u,p)).json()
    if not d.get('token'): raise ValueError('Login did not return a token')
    with LOCK: TOKEN.update(token=d['token'],expires=time.time()+47*3600)
    return {'status':'Authenticated','expiration':d.get('expiration')}

def ae(method,path,**kw):
    h=auth();r=requests.request(method,APP+path,headers=h,timeout=(15,90),**kw)
    if r.status_code in (401,403):
        with LOCK: TOKEN.update(token=None,expires=0)
        raise ValueError('Earthdata session expired or access denied. Log in again; check dataset access terms.')
    if not r.ok: raise ValueError(f'AppEEARS HTTP {r.status_code}: '+r.text[:500])
    return r

@app.before_request
def local_only():
    if request.host.split(':')[0] not in ('127.0.0.1','localhost'): return jsonify(error='Localhost only'),403
    if request.method=='POST' and request.headers.get('X-Bantay-Local')!='1': return jsonify(error='Missing local request header'),403

@app.errorhandler(Exception)
def errors(e):
    from werkzeug.exceptions import HTTPException
    return jsonify(error=str(e)),e.code if isinstance(e,HTTPException) else 400

@app.get('/')
def home(): return send_from_directory(BASE/'static','planner.html')
@app.get('/console')
def console(): return send_from_directory(BASE/'static','console.html')
@app.get('/api/health')
def health(): return jsonify(status='ok',earthdata_authenticated=bool(TOKEN['token'] and TOKEN['expires']>time.time()),time=stamp())
@app.post('/api/login')
def api_login():
    d=request.get_json();return jsonify(login(d['username'],d['password']))
@app.post('/api/logout')
def logout():
    with LOCK: TOKEN.update(token=None,expires=0)
    return jsonify(status='Local token cleared')
@app.get('/api/power')
def power_proxy():
    params=request.args.to_dict();return jsonify(remote('GET',POWER,params=params).json())
@app.get('/api/weather')
def weather_proxy(): return jsonify(remote('GET',WEATHER,params=request.args.to_dict()).json())

def evidence(lat,lon):
    jobs={
      'power':(POWER,dict(parameters='PRECTOTCORR,T2M_MAX,T2M_MIN,GWETROOT,ALLSKY_SFC_SW_DWN',community='AG',latitude=lat,longitude=lon,format='JSON')),
      'weather':(WEATHER,dict(latitude=lat,longitude=lon,daily='temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',timezone='Asia/Manila',forecast_days=7))}
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures={k:pool.submit(cached,*v) for k,v in jobs.items()}
        return {k:f.result() for k,f in futures.items()}
@app.post('/api/evidence')
def get_evidence():
    lat,lon=coords(request.get_json());return jsonify(evidence(lat,lon))

@app.get('/api/products')
def products():
    d=cached(APP+'/product',{})
    if isinstance(d.get('data'),list):
        q=request.args.get('q','').casefold()
        d['data']=[p for p in d['data'] if p.get('Available') and not p.get('Deleted') and q in json.dumps(p).casefold()]
    return jsonify(d)
@app.get('/api/layers/<product>')
def layers(product):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+',product): raise ValueError('Invalid product ID')
    return jsonify(cached(APP+'/product/'+product,{}))
@app.post('/api/tasks')
def submit_task():
    d=request.get_json();lat,lon=coords(d)
    start=date.fromisoformat(d['start']);end=date.fromisoformat(d['end'])
    if end<start or (end-start).days>366: raise ValueError('Choose 1–367 days per extraction')
    if end>date.today(): raise ValueError('Satellite requests must use past dates')
    chosen=d.get('layers',[])
    if not 1<=len(chosen)<=20: raise ValueError('Select 1–20 layers')
    for layer in chosen:
        if set(layer)!={'product','layer'} or not all(isinstance(v,str) and len(v)<200 for v in layer.values()): raise ValueError('Invalid layer')
    task={'task_type':'point','task_name':'Bantay-Ani-'+datetime.now().strftime('%Y%m%d-%H%M%S'), 'params':{'dates':[{'startDate':start.strftime('%m-%d-%Y'),'endDate':end.strftime('%m-%d-%Y')}], 'layers':chosen,'coordinates':[{'latitude':lat,'longitude':lon,'id':'farm','category':'agriculture'}]}}
    out=ae('POST','/task',json=task).json()
    p=DATA/'tasks.json'
    with LOCK:
        saved=json.loads(p.read_text()) if p.exists() else []
        saved.insert(0,{'response':out,'request':task,'created':stamp()});p.write_text(json.dumps(saved))
    return jsonify(out)
@app.get('/api/tasks')
def tasks():
    p=DATA/'tasks.json'; return jsonify(json.loads(p.read_text()) if p.exists() else [])
def valid_id(s):
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',s): raise ValueError('Invalid identifier')
    return s
@app.get('/api/tasks/<tid>')
def task_status(tid): return jsonify(ae('GET','/task/'+valid_id(tid)).json())
@app.get('/api/tasks/<tid>/bundle')
def bundle(tid): return jsonify(ae('GET','/bundle/'+valid_id(tid)).json())
@app.get('/api/tasks/<tid>/files/<fid>')
def task_file(tid,fid):
    valid_id(tid);valid_id(fid)
    bundle=ae('GET','/bundle/'+tid).json()
    meta=next((f for f in bundle.get('files',[]) if f['file_id']==fid),None)
    if not meta: raise ValueError('File not found in task bundle')
    if meta.get('file_size',0)>30*1024*1024: raise ValueError('File too large for preview; download through AppEEARS website')
    if not meta['file_name'].lower().endswith('.csv'): raise ValueError('Only CSV previews supported')
    r=ae('GET','/bundle/'+tid+'/'+fid)
    rows=list(csv.DictReader(io.StringIO(r.content.decode('utf-8-sig'))))
    return jsonify(file=meta['file_name'],rows=rows[:200],total_rows=len(rows),warning='Raw values/QA only. No automatic scaling or quality screening is assumed. Review product metadata before using in recommendations.')

@app.get('/api/cmr')
def cmr():
    lat,lon=coords(request.args);q=request.args.get('q','GPM IMERG')[:80]
    return jsonify(cached('https://cmr.earthdata.nasa.gov/search/collections.json',{'keyword':q,'point':f'{lon},{lat}','page_size':20,'has_granules':'true'}))

@app.post('/api/plan')
def make_plan():
    d=request.get_json();lat,lon=coords(d)
    ev=evidence(lat,lon)
    return jsonify(build_plan(d,ev))

def build_plan(d,ev):
    start=date.fromisoformat(d['start']+'-01')
    crops=d.get('crops',[])
    if not 1<=len(crops)<=10: raise ValueError('Provide 1–10 crop assumptions')
    for c in crops:
        if not isinstance(c.get('name'),str) or not c['name'].strip(): raise ValueError('Name each crop')
        for k in ['months','rain_min','rain_max','temp_max']:
            if not number(c.get(k)): raise ValueError('Numeric crop assumptions required')
        if not 1<=c['months']<=18 or int(c['months'])!=c['months']: raise ValueError('Crop months must be whole numbers 1–18')
        if not 0<=c['rain_min']<=c['rain_max']<=1000 or not -30<=c['temp_max']<=65: raise ValueError('Invalid climate screening assumptions')
    p=ev.get('power',{}).get('data',{}).get('properties',{}).get('parameter',{})
    def value(k,m):
        v=p.get(k,{}).get(MONTHS[m-1]);return v if number(v) and v!=-999 else None
    irrigated=bool(d.get('irrigated',False));scenarios=[]
    hold=int(d.get('review_hold_months',0))
    if not 0<=hold<=3: raise ValueError('Reviewed planting hold must be 0–3 months')
    if hold and not str(d.get('notes','')).strip(): raise ValueError('Document the reviewed observation/source supporting a planting hold')
    # Relative scenario factors are user-selected stress tests, not forecast probabilities.
    for name,factor in [('Historical baseline',1.0),('Drier sensitivity',float(d.get('dry_factor',0.75))),('Wetter sensitivity',float(d.get('wet_factor',1.25)))]:
        if not .1<=factor<=3: raise ValueError('Scenario multipliers must be between 0.1 and 3')
        rows=[];remaining=0;active=None;previous=None
        for i in range(18):
            idx=start.year*12+start.month-1+i;y,m=divmod(idx,12);m+=1
            rain=value('PRECTOTCORR',m);temp=value('T2M_MAX',m)
            candidates=[]
            if remaining==0:
                for c in crops:
                    valid=True;why=[]
                    for j in range(int(c['months'])):
                        mm=(m-1+j)%12+1;rr=value('PRECTOTCORR',mm);tt=value('T2M_MAX',mm)
                        if rr is None or tt is None: valid=False;why.append('missing climate');break
                        if (not irrigated and rr*factor<c['rain_min']) or rr*factor>c['rain_max'] or tt>c['temp_max']: valid=False;break
                    if valid: candidates.append(c)
                # Prefer a different user-declared family; no numeric suitability score.
                candidates.sort(key=lambda c:(bool(previous and c.get('family','').casefold()==previous.get('family','').casefold()),crops.index(c)))
                if i<hold:candidates=[]
                if candidates:
                    active=candidates[0];remaining=int(active['months']);stage='Plant / establish'
                else: active=None;stage='Review / soil-cover interval'
            else: stage='Grow / monitor'
            if active and remaining==1: stage='Plant and harvest in this month' if int(active['months'])==1 else 'Harvest window'
            row={'month':f'{y:04d}-{m:02d}','crop':active['name'] if active else None,'action':stage,'historical_rain_mm_day':rain,'scenario_rain_mm_day':round(rain*factor,2) if rain is not None else None,'historical_max_air_c':temp,'root_wetness_index':value('GWETROOT',m),'reason':'Passes user-entered monthly climate screen across assumed crop duration; not a validated suitability model.' if active else ('Missing climate evidence; no crop selected.' if rain is None or temp is None else 'No supplied crop passes this scenario screen. Review irrigation, drainage, variety or planting date.')}
            if i<hold:row['reason']='Manual reviewed-evidence planting hold: '+str(d.get('notes',''))[:500]
            rows.append(row)
            if active:
                remaining-=1
                if remaining==0:previous=active
        scenarios.append({'name':name,'rain_multiplier':factor,'months':rows})
    return {'generated_at':stamp(),'coordinates':{'lat':float(d['lat']),'lon':float(d['lon'])},'basis':'18-month repeating historical climate with user-defined crop screens; NOT an 18-month weather forecast.', 'limitations':['Crop durations and thresholds are editable assumptions, not calibrated agronomy.','No yield, profit, pest probability or guaranteed savings are predicted.','Satellite task previews are not automatically quality-screened. Only an explicit user-reviewed planting hold changes the initial schedule.','Review observations and farm conditions before acting. Re-run as new evidence arrives.','A final crop may mature beyond the 18-month display.'], 'assumptions':{'crops':crops,'irrigated':irrigated,'review_hold_months':hold},'reviewed_field_notes':str(d.get('notes',''))[:6000], 'evidence':ev,'scenarios':scenarios}


GPM_JOBS={}
@app.post('/api/gpm')
def gpm_start():
    d=request.get_json();lat,lon=coords(d)
    start=date.fromisoformat(d['start']);end=date.fromisoformat(d['end'])
    if end<start or (end-start).days>7 or end>date.today(): raise ValueError('IMERG: choose a past range of at most eight dates')
    jid=str(uuid.uuid4());GPM_JOBS[jid]={'status':'Downloading','job_id':jid}
    def run():
        try:
            from gpm import extract
            folder=DATA/('gpm-'+jid);folder.mkdir()
            GPM_JOBS[jid]=extract(lat,lon,start.isoformat(),end.isoformat(),folder)
        except Exception as e:GPM_JOBS[jid]={'status':'Unavailable','error':str(e)}
    threading.Thread(target=run,daemon=True).start()
    return jsonify(job_id=jid,status='Downloading')
@app.get('/api/gpm/<jid>')
def gpm_status(jid):
    if jid not in GPM_JOBS: raise ValueError('Unknown job (jobs in memory reset after server restart; downloaded files remain in data/)')
    return jsonify(GPM_JOBS[jid])



if __name__=='__main__':
    print('Bantay-Ani local build: http://127.0.0.1:8000 — keep this window open.')
    app.run(host='127.0.0.1',port=8000,debug=False,threaded=True)
