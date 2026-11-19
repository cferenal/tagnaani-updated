@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (set PY=python) else (set PY=py)
if not exist .venv\Scripts\python.exe %PY% -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-satellite.txt
if errorlevel 1 goto fail
echo Open http://127.0.0.1:8000 after the server starts.
.venv\Scripts\python.exe app.py
pause
exit /b
:fail
echo Installation failed. Check your internet and Python installation. See README for core-only setup.
pause
