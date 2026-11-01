@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  python server.py
  goto :eof
)

echo Python 3 is required to launch Graveyard Grab.
echo Install it from https://www.python.org/downloads/ and run this launcher again.
pause
exit /b 1
