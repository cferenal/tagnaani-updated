@echo off
setlocal
cd /d "%~dp0"
py -3.12 -c "import sys; print('Using Python',sys.version)" >nul 2>&1
if errorlevel 1 goto missing
if not exist ".venv312\Scripts\python.exe" py -3.12 -m venv .venv312
if errorlevel 1 goto fail
set "VPY=%~dp0.venv312\Scripts\python.exe"
"%VPY%" -m pip install --upgrade pip
if errorlevel 1 goto fail
"%VPY%" -m pip install -r requirements.txt
if errorlevel 1 goto fail
echo.
echo Installing optional IMERG dependencies using binary h5py/NumPy packages...
"%VPY%" -m pip install --only-binary=h5py,numpy -r requirements-satellite.txt
if errorlevel 1 (
 echo.
 echo WARNING: Optional IMERG dependencies failed. Starting core app anyway.
 echo AppEEARS and the historical climate planner do not require h5py.
 echo IMERG downloads will remain unavailable until satellite dependencies install.
 pause
)
echo.
echo Open http://127.0.0.1:8000 after the server starts.
"%VPY%" app.py
pause
exit /b
:missing
echo Python 3.12 was not found by the Python launcher.
echo Install 64-bit Python 3.12 with the Python launcher, then run this file again.
echo You do NOT need to uninstall Python 3.15.
py -0p
pause
exit /b 1
:fail
echo Core setup failed. Read the error above. No app has been started.
pause
exit /b 1
