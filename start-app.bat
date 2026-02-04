@echo off

REM Start the application after stopping any existing instances

echo ===== Starting cleanup of existing application processes =====

REM Find and stop processes using port 3200
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3200"') do (
    taskkill /F /PID %%a 2>nul
    if not errorlevel 1 echo Terminated process PID: %%a
)

REM Find and stop all electron.exe processes
for /f "tokens=2" %%a in ('tasklist ^| findstr "electron.exe"') do (
    taskkill /F /PID %%a 2>nul
    if not errorlevel 1 echo Terminated electron process PID: %%a
)

echo ===== Process cleanup completed =====

echo Starting application...
npm run dev
