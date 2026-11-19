# BANTAY-ANI — Local 18-month planning development build

## Start here (Windows)
1. Install Python 3.11 or 3.12 with its Python launcher / PATH option.
2. Extract the entire ZIP into a writable folder. Do not run files inside the ZIP.
3. Double-click start_windows.bat. The first launch creates a virtual environment and installs dependencies; internet is required.
4. When the server prints its address, open http://127.0.0.1:8000 in your browser. Keep the terminal open.
5. For the previous farmer/SMS interface choose “Farmer / SMS console”. Its demo login is demo / demo123.

Do NOT double-click the HTML files: the new workbench needs the localhost server.
The original console's browser-local profile data may not transfer from file:// to localhost. Re-enter a test profile. The planner and console have separate inputs: coordinates and crops are not auto-synchronized.

## What this package implements
- Existing v3 console retained, with simpler demo credentials, profile-save navigation fix, and NASA/weather calls proxied through Python.
- Separate local planning dashboard with editable farm coordinates, crop assumptions, irrigation flag, and 18 monthly rows per scenario.
- NASA POWER climatology and seven-day Open-Meteo forecasts with exact-query server cache and explicit Retrieved/Cached/Unavailable labels.
- Historical-baseline, drier and wetter rainfall sensitivity scenarios; these are not forecast probabilities.
- Crop-duration checks across assumed growth months, rotation-group preference, review intervals on missing evidence, and CSV/JSON plan export.
- A manual reviewed-evidence planting hold (0–3 initial months), requiring source/field notes. This lets reviewed observations constrain the schedule without inventing an automatic satellite classifier.
- AppEEARS real catalog and layer discovery; Earthdata authentication; real point extraction task submission; status/bundle checks; CSV science/QA previews. No fabricated source measurements.
- SMAP, MODIS, VIIRS, ECOSTRESS, GEDI, HLS and Landsat searches use the live catalog, not assumed product IDs. A catalog search alone is NOT marked as retrieved observations. If no product is returned, the UI says so. HLS is Landsat/Sentinel-2 harmonized data, not Landsat-only data.
- Separate GPM_3IMERGDF daily sampler via earthaccess: downloads up to three daily granules, samples the nearest pixel, applies numeric scale/offset attributes where present, and reports units, filename, pixel coordinates and limited quality status. This is NOT a full rainfall time-series service.
- NASA CMR collection discovery fallback clearly labelled metadata only.

## Important scope boundary — read before using recommendations
This is an executable development scaffold, NOT a completed or scientifically calibrated multi-satellite crop recommendation system.
Satellite extraction is implemented, but product-specific QA/scaling for every AppEEARS product, automated sensor fusion and crop ranking from those measurements are NOT implemented. CSV previews are raw: consult layer metadata, fill values, scale factors and QA. The planner automatically uses POWER historical climate; satellite evidence affects scheduling only through an explicitly reviewed/manual planting hold. It does not silently treat unreviewed numbers as valid.
The sample crop durations and rainfall/temperature screens are DEMONSTRATION ASSUMPTIONS, not agronomic facts or crop-water-demand estimates. Replace them with local cultivar-specific values reviewed by an agriculturist. Family-based rotation is a heuristic, not disease/nutrient modelling. Ranking follows your input order after preferring a different crop family.
No 18-month weather forecast, calibrated drought probability, yield, pest probability, fertilizer prescription, income prediction or guaranteed water savings is supplied. Historical monthly climate is repeated into the calendar. The +/-25% rainfall examples are stress tests, not an ENSO prediction. Crop cycles may extend beyond the display horizon.
No public server, APK, server-side SMS scheduler, shared farmer database or production authentication is added. Farmer console records and subscriptions remain browser-local, not shared through the Python backend. Existing MacroDroid delivery still requires phone testing.

## Earthdata / AppEEARS setup
Create/use your own NASA Earthdata account and accept access terms for requested services/products as needed.
For AppEEARS, enter credentials in the dashboard. They are sent to NASA by the backend; this app does not save them. The AppEEARS bearer token stays in server memory and is cleared on restart. If the session expires, authenticate again. Do not put credentials into notes or code.
1. Set actual farm coordinates.
2. Set a historical observation date range. Example: a short period several weeks in the past, avoiding data latency.
3. Search a dataset family. Select an available product and load layers.
4. Review units/resolution/time coverage. Select the science layer AND appropriate QA layers.
5. Add checked layers; submit a point extraction. This creates a real NASA job under your account.
6. Refresh local task history; check status. When done, list result files and preview CSVs.
7. Review quality and field applicability; document conclusions in notes. Optionally apply a manual planting hold before regenerating the plan.
Tasks are asynchronous and may take minutes or longer. A task can finish with no observations for that location/date. A task is not successful merely because it has an ID. AppEEARS can change product availability; CMR fallback only discovers other datasets and does not implement their extraction. AppEEARS outputs expire according to NASA service policy; previews are not permanently archived by this app.

## IMERG credentials (separate from the dashboard token)
Before starting the server, set environment credentials in the SAME terminal. Do not share screenshots containing the password.
PowerShell:
    $env:EARTHDATA_USERNAME="your_username"
    $env:EARTHDATA_PASSWORD="your_password"
    .\start_windows.bat
Command Prompt:
    set EARTHDATA_USERNAME=your_username
    set EARTHDATA_PASSWORD=your_password
    start_windows.bat
macOS/Linux:
    export EARTHDATA_USERNAME='your_username'
    export EARTHDATA_PASSWORD='your_password'
    sh start_mac_linux.sh
Use a short past range (up to eight dates) in the dashboard and start IMERG. Click Check IMERG job until it completes or reports an error. The maximum three granules are not guaranteed to cover the complete requested period. Preserve reported units; do not add daily rates as if they were a complete month total. Downloads can take substantial time/storage and require correct Earthdata authorizations. Files/summary persist in data/gpm-JOB-ID; in-memory job status resets on restart. Inspect NASA FileHeader metadata for observation dates.

## Manual / core-only installation
Windows:
    py -m venv .venv
    .venv\Scripts\python -m pip install -r requirements.txt
    .venv\Scripts\python app.py
macOS/Linux:
    python3 -m venv .venv
    .venv/bin/python -m pip install -r requirements.txt
    .venv/bin/python app.py
Core-only setup supports planner, console, AppEEARS and CMR. For IMERG also install requirements-satellite.txt. If satellite optional dependencies are not installed, the IMERG job reports an explicit import error rather than supplying fake data.

## Tests and validation status
- Python source compilation and JavaScript syntax checks passed in the build environment.
- Ten standard-library-only planner checks passed: 18 months, year rollover, rotation, dry scenario selection, missing-data behavior, NASA fill-value exclusion, irrigation override, evidence hold, invalid duration rejection, and evidence-note requirement.
- Full Flask route/integration tests are supplied in test_app.py but could NOT run in the build environment because Flask was not installed. Dependencies are installed on your machine by the launcher.
- Authenticated NASA jobs, IMERG downloads, browser rendering and real SMS delivery were NOT exercised in the build environment. No live-data success is claimed.
After installing dependencies, run:
    python -m unittest -v test_app
from the activated virtual environment (or use its Python executable). Tests use mocked evidence, not real NASA responses.

## Security and troubleshooting
The server binds only to 127.0.0.1. Do not change it to 0.0.0.0, port-forward it or publish it. Demo credentials secure nothing; the dashboard itself is not login-gated. This is for a trusted personal computer only.
The app requires a custom header for POST requests and restricts Host to localhost, but is not a hardened public service. Do not commit the data directory or environment credentials. It contains farm coordinates and extraction history. Data/cache files have no expiry/deletion automation; delete them manually when appropriate with server stopped.
Cached source data is timestamped and may be stale. Review retrieval age before making decisions; stale weather is not a current forecast. Backend errors are surfaced in the page's status strip; inspect source responses for details.
If a product is not available via AppEEARS, it does not become connected via the CMR metadata fallback. A dedicated extraction adapter may still be needed. This build does not promise valid measurements from every named mission at every farm/date.
If no crops pass the screen, it shows review/cover intervals rather than automatically recommending a locally unsuitable crop.

## Documentation used
NASA AppEEARS API: https://appeears.earthdatacloud.nasa.gov/api/
NASA POWER climatology: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
NASA Earthdata earthaccess: https://earthaccess.readthedocs.io/
Open-Meteo forecast API / attribution: https://open-meteo.com/en/docs
