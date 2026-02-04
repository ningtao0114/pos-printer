@echo off
REM Cashier System Dependency Installation Script

REM Check if NVM is installed
echo Checking if NVM is installed...
where nvm >nul 2>&1
if errorlevel 1 (
    echo ERROR: NVM is not installed!
    echo Please install NVM from: https://github.com/coreybutler/nvm-windows/releases
    pause
    exit /b 1
)

REM Display current Node.js version
echo Checking current Node.js version...
for /f "tokens=*" %%i in ('nvm current 2^>^&1') do set CURRENT_VERSION=%%i

echo Current Node.js version: %CURRENT_VERSION%

if "%CURRENT_VERSION%"=="18.18.0" (
    echo Already using Node.js 18.18.0
) else (
    echo Not using Node.js 18.18.0
    echo Checking if Node.js 18.18.0 is installed...

    REM Check if Node.js 18.18.0 is installed
    nvm list 2^>^&1 | find "18.18.0" >nul 2>&1
    if errorlevel 1 (
        echo Node.js 18.18.0 is not installed. Installing now...
        nvm install 18.18.0 2^>^&1
        if errorlevel 1 (
            echo ERROR: Failed to install Node.js 18.18.0
            pause
            exit /b 1
        )
        echo Node.js 18.18.0 installed successfully
    ) else (
        echo Node.js 18.18.0 is already installed
    )

    echo Switching to Node.js 18.18.0...
    nvm use 18.18.0 2^>^&1
    if errorlevel 1 (
        echo ERROR: Failed to switch to Node.js 18.18.0
        echo Please run this script as Administrator
        pause
        exit /b 1
    )
    echo Switched to Node.js 18.18.0
)

REM Verify Node.js version after switching
echo Verifying Node.js version...
for /f "tokens=*" %%i in ('nvm current 2^>^&1') do set CURRENT_VERSION=%%i

echo Current Node.js version: %CURRENT_VERSION%

REM Terminate any running application processes
echo Terminating any running application processes...

REM Terminate Electron processes
taskkill /f /im electron.exe >nul 2>&1
if errorlevel 1 (
    echo No electron.exe processes found
) else (
    echo electron.exe processes terminated
)

REM Terminate Node.js processes (related to this project)
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo No node.exe processes found
) else (
    echo node.exe processes terminated
)

REM Terminate any npm processes
taskkill /f /im npm.exe >nul 2>&1
if errorlevel 1 (
    echo No npm.exe processes found
) else (
    echo npm.exe processes terminated
)

REM Wait a moment to ensure processes are fully terminated
timeout /t 2 /nobreak >nul

REM Delete node_modules directory if it exists
echo Checking for existing node_modules directory...
if exist "node_modules" (
    echo Deleting node_modules directory...
    rd /s /q "node_modules"
    echo node_modules directory deleted successfully
) else (
    echo No node_modules directory found
)

REM Start dependency installation
echo Starting dependency installation...

REM Install electron-rebuild
echo Installing electron-rebuild...
npm install --save-dev electron-rebuild --legacy-peer-deps
if errorlevel 1 goto error

echo electron-rebuild installed successfully

REM Install prebuild-install
echo Installing prebuild-install...
npm install --save-dev prebuild-install --legacy-peer-deps
if errorlevel 1 goto error

echo prebuild-install installed successfully

REM Install sqlite3
echo Installing sqlite3...
npm install sqlite3 --save --legacy-peer-deps
if errorlevel 1 (
    echo sqlite3 installation failed. Trying alternative method...
    npm install sqlite3 --save --legacy-peer-deps --build-from-source=false
    if errorlevel 1 goto error
)

echo sqlite3 installed successfully

REM Run electron-rebuild
echo Running electron-rebuild...
npm run rebuild
if errorlevel 1 (
    echo WARNING: electron-rebuild failed, but dependencies are installed
    echo You can run npm run rebuild manually later
)

echo All dependencies installed successfully!
echo.
echo Next steps:
echo - To run the application: npm run dev
echo - To build the application: npm run build

goto end

:error
echo ERROR: Dependency installation failed!
pause
exit /b 1

:end
pause
