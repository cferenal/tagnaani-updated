@echo off
setlocal enabledelayedexpansion

:: 1. Set your folder paths here
set "FRONTEND_DIR=C:\Users\user\Downloads\tagnaAni"
set "BACKEND_DIR=C:\Users\user\Downloads\Bantay-Ani-Local"

:: 2. Detect your Wi-Fi / LAN IPv4 address
set "LAN_IP=127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "TEMP_IP=%%a"
    set "LAN_IP=!TEMP_IP:~1!"
)

echo ============================================================
echo   TAGNA-ANI UNIFIED LAUNCHER
echo ============================================================
echo   Backend (Local)   : http://127.0.0.1:8000
echo   Frontend (Local)  : http://localhost:5173
echo   Frontend (Network): http://!LAN_IP!:5173
echo ------------------------------------------------------------
echo   TERMINAL COMMANDS (Press key then Enter):
echo     h + Enter : Show all commands
echo     l + Enter : List tagna:session_user, tagna:users ^& subscribers
echo     w + Enter : Wipe all registered users ^& active sessions
echo ============================================================
echo.

:: 3. Start Python Backend in a background minimized window
if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    start "Tagna-Ani Backend" /min cmd /k "cd /d "%BACKEND_DIR%" && .venv\Scripts\python.exe app.py"
) else (
    start "Tagna-Ani Backend" /min cmd /k "cd /d "%BACKEND_DIR%" && py app.py"
)

:: 4. Start Vite Frontend with --host
cd /d "%FRONTEND_DIR%"
npm run dev -- --host