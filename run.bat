@echo off
title PDFForge Starter
color 0B

echo ===================================================
echo             STARTING PDFFORGE PLATFORM             
echo ===================================================
echo.

:: Check if Node.js modules are installed
if not exist "backend-api\node_modules\" (
    echo [Backend] node_modules not found. Installing dependencies...
    cd backend-api
    call npm install
    cd ..
)

if not exist "frontend\node_modules\" (
    echo [Frontend] node_modules not found. Installing dependencies...
    cd frontend
    call npm install
    cd ..
)

:: Start Backend Server in a new window
echo [System] Starting Backend API Server (Port 7860)...
start "PDFForge - Backend Server" cmd /k "cd backend-api && title Backend Server && npm run dev"

:: Start Frontend React Client in a new window
echo [System] Starting Frontend Client (Port 5173)...
start "PDFForge - Frontend Client" cmd /k "cd frontend && title Frontend Client && npm run dev"

echo.
echo ===================================================
echo  PDFForge is launching!
echo  - Backend API:   http://localhost:7860
echo  - Frontend App:  http://localhost:5173
echo.
echo  Close the spawned command prompt windows to stop the servers.
echo ===================================================
echo.
pause
