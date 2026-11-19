import unittest
from unittest.mock import patch
from app import app, build_plan, TOKEN
MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
def evidence(rain=5):
    return {'power':{'status':'Retrieved','data':{'properties':{'parameter':{'PRECTOTCORR':dict.fromkeys(MONTHS,rain),'T2M_MAX':dict.fromkeys(MONTHS,30),'GWETROOT':dict.fromkeys(MONTHS,.5)}}}},'weather':{'status':'Unavailable'}}
def inputs():
    return {'lat':8.45,'lon':124.63,'start':'2026-11','crops':[{'name':'A','family':'grass','months':4,'rain_min':4,'rain_max':10,'temp_max':35},{'name':'B','family':'legume','months':3,'rain_min':2,'rain_max':10,'temp_max':35}]}
class Checks(unittest.TestCase):
    def test_18_months_and_rollover(self):
        p=build_plan(inputs(),evidence());self.assertEqual(len(p['scenarios']),3)
        self.assertTrue(all(len(s['months'])==18 for s in p['scenarios']))
        self.assertEqual(p['scenarios'][0]['months'][-1]['month'],'2028-04')
    def test_rotation(self):
        p=build_plan(inputs(),evidence());self.assertEqual(p['scenarios'][0]['months'][4]['crop'],'B')
    def test_dry_changes_selection(self):
        p=build_plan(inputs(),evidence());self.assertEqual(p['scenarios'][0]['months'][0]['crop'],'A');self.assertEqual(p['scenarios'][1]['months'][0]['crop'],'B')
    def test_missing_climate_no_invented_crops(self):
        p=build_plan(inputs(),{});self.assertTrue(all(m['crop'] is None for s in p['scenarios'] for m in s['months']))
    def test_fill_values(self):
        p=build_plan(inputs(),evidence(-999));self.assertIsNone(p['scenarios'][0]['months'][0]['scenario_rain_mm_day'])
    def test_invalid_duration(self):
        d=inputs();d['crops'][0]['months']=0
        with self.assertRaises(ValueError):build_plan(d,evidence())
    def test_irrigation(self):
        d=inputs();d['irrigated']=True
        self.assertEqual(build_plan(d,evidence(1))['scenarios'][0]['months'][0]['crop'],'A')
    def test_user_notes_not_scored(self):
        d=inputs();d['notes']='raw SMAP unreviewed';p=build_plan(d,evidence());self.assertEqual(p['reviewed_field_notes'],d['notes'])
    def test_ui_routes(self):
        c=app.test_client();self.assertEqual(c.get('/').status_code,200);self.assertEqual(c.get('/console').status_code,200)
    def test_write_header(self):
        self.assertEqual(app.test_client().post('/api/plan',json=inputs()).status_code,403)
    def test_host_guard(self):
        self.assertEqual(app.test_client().get('/api/health',headers={'Host':'evil.example'}).status_code,403)
    @patch('app.evidence')
    def test_plan_endpoint(self,m):
        m.return_value=evidence();r=app.test_client().post('/api/plan',json=inputs(),headers={'X-Bantay-Local':'1'});self.assertEqual(r.status_code,200);self.assertEqual(len(r.json['scenarios'][0]['months']),18)
    def test_input_coords(self):
        r=app.test_client().post('/api/evidence',json={'lat':999,'lon':0},headers={'X-Bantay-Local':'1'});self.assertEqual(r.status_code,400)
    def test_login_not_stored(self):
        TOKEN.update(token=None,expires=0)
        with patch('app.remote') as m:
            m.return_value.json.return_value={'token':'test-only','expiration':'test'}
            r=app.test_client().post('/api/login',json={'username':'test','password':'test'},headers={'X-Bantay-Local':'1'})
            self.assertEqual(r.status_code,200);self.assertNotIn('token',r.json)
        TOKEN.update(token=None,expires=0)
    def test_task_dates(self):
        r=app.test_client().post('/api/tasks',json={'lat':8,'lon':124,'start':'2099-01-01','end':'2099-01-02','layers':[{'product':'x','layer':'y'}]},headers={'X-Bantay-Local':'1'});self.assertEqual(r.status_code,400)
if __name__=='__main__':unittest.main()
