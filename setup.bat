@echo off
rem Digital Twin Health Assistant - Quick Setup Script (Windows)
rem Run with: setup.bat

echo 🚀 Setting up Digital Twin Health Assistant...
echo ================================================

rem Check prerequisites
echo 📋 Checking prerequisites...

rem Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
) else (
    echo ✅ Python found
    python --version
)

rem Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
    node --version
)

rem Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install Node.js which includes npm
    pause
    exit /b 1
) else (
    echo ✅ npm found
    npm --version
)

echo.
echo 🐍 Setting up Backend...
echo ========================

rem Setup backend
cd backend

rem Create virtual environment
echo Creating Python virtual environment...
python -m venv venv

rem Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

rem Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

echo ✅ Backend setup complete!

cd ..

echo.
echo ⚛️ Setting up Frontend...
echo =========================

rem Setup frontend
cd frontend

rem Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

echo ✅ Frontend setup complete!

cd ..

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo To run the application:
echo.
echo 1. Start Backend (in one terminal):
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn app.main:app --reload
echo.
echo 2. Start Frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open your browser:
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 📖 For detailed instructions, see SETUP_GUIDE.md
echo.
pause
