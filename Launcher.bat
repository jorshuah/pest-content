@echo off
setlocal enabledelayedexpansion

title Pest Content Launcher

echo ==========================================
echo       Pest Content One-Click Launcher
echo ==========================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please download and install Node.js from https://nodejs.org/
    echo opening the download page for you...
    start https://nodejs.org/
    pause
    exit /b
)

:: 2. Check for .env.local and prompt for API Key if missing
if not exist .env.local (
    echo [SETUP] It looks like this is your first time running the app.
    echo You need a Google Gemini API Key to generate AI content.
    echo Get one for free at: https://aistudio.google.com/app/apikey
    echo.
    set /p API_KEY="Please enter your Gemini API Key: "
    echo GOOGLE_GENERATION_AI_API_KEY=!API_KEY! > .env.local
    echo [SUCCESS] API Key saved to .env.local
    echo.
)

:: 3. Install dependencies if node_modules is missing
if not exist node_modules (
    echo [SETUP] Installing dependencies... This may take a minute.
    call npm install
)

:: 4. Start the app
echo [LAUNCH] Starting the application...
echo The app will open in your browser automatically once it's ready.
echo.

:: Start a background process to wait for the port and open the browser
:: We use a slightly longer timeout to ensure Next.js has started
start /b cmd /c "timeout /t 10 >nul && start http://localhost:3042"

:: Run the dev server
:: We use call to ensure the script continues if npm finishes (though it shouldn't)
call npm run dev

pause
