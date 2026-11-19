"""Optional IMERG daily point sampler. Downloads at most three real granules."""
import json, math
from pathlib import Path
from datetime import datetime, timezone

def extract(lat,lon,start,end,folder):
    import earthaccess
    import h5py
    import numpy as np
    auth=earthaccess.login(strategy='environment',persist=False)
    if not auth.authenticated: raise ValueError('Set EARTHDATA_USERNAME and EARTHDATA_PASSWORD before launching the server for IMERG.')
    results=earthaccess.search_data(short_name='GPM_3IMERGDF',temporal=(start,end),bounding_box=(max(-180,lon-.02),max(-90,lat-.02),min(180,lon+.02),min(90,lat+.02)),count=3)
    if not results: return {'status':'No granules','observations':[]}
    paths=earthaccess.download(results,local_path=str(folder),threads=1)
    observations=[]
    for path in paths:
        with h5py.File(path,'r') as f:
            group=f['Grid'] if 'Grid' in f else f
            latitudes=np.asarray(group['lat']).reshape(-1);longitudes=np.asarray(group['lon']).reshape(-1)
            ilat=int(np.argmin(abs(latitudes-lat)));ilon=int(np.argmin(abs(longitudes-lon)))
            key=next((k for k in ('precipitation','precipitationCal') if k in group),None)
            if key is None: raise ValueError('IMERG precipitation layer not found; inspect file schema')
            ds=group[key];index=[]
            for size in ds.shape:
                if size==len(longitudes):index.append(ilon)
                elif size==len(latitudes):index.append(ilat)
                elif size==1:index.append(0)
                else: raise ValueError('Unrecognized IMERG dimensions: '+str(ds.shape))
            raw=float(np.asarray(ds[tuple(index)]).squeeze())
            def attr(k):
                v=ds.attrs.get(k)
                if isinstance(v,bytes):return v.decode(errors='replace')
                if hasattr(v,'tolist'):return v.tolist()
                return v
            fill=attr('_FillValue');scale=attr('scale_factor');offset=attr('add_offset')
            valid=math.isfinite(raw) and raw>=0 and (not isinstance(fill,(int,float)) or raw!=fill)
            value=raw*(float(scale) if isinstance(scale,(int,float)) else 1)+(float(offset) if isinstance(offset,(int,float)) else 0) if valid else None
            observations.append({'file':Path(path).name,'source':'GPM_3IMERGDF','layer':key,'requested_lat':lat,'requested_lon':lon,'pixel_lat':float(latitudes[ilat]),'pixel_lon':float(longitudes[ilon]),'value':value,'units':attr('units'),'raw':raw if math.isfinite(raw) else None,'scale_factor':scale,'add_offset':offset,'quality':'Fill/nonnegative check only; no scientific QA certification','granule_metadata':str(f.attrs.get('FileHeader',''))[:4000]})
    out={'status':'Retrieved','retrieved_at':datetime.now(timezone.utc).isoformat(),'observations':observations,'warning':'Up to three returned daily granules only, not a complete period total. Use reported units. Not automatically assimilated into planner.'}
    (Path(folder)/'summary.json').write_text(json.dumps(out,default=str,indent=2));return out
