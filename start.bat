@echo off
rem Digital Twin Health Assistant - Start Script (Windows)
rem Run with: start.bat

echo 🚀 Starting Digital Twin Health Assistant...
echo ============================================

rem Check if setup has been run
if not exist "backend\venv" (
    echo ❌ Backend virtual environment not found.
    echo Please run setup first: setup.bat
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ❌ Frontend dependencies not found.
    echo Please run setup first: setup.bat
    pause
    exit /b 1
)

echo ✅ Dependencies found. Starting services...

rem Start backend
echo 🐍 Starting backend server...
start "Backend Server" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

rem Wait a moment for backend to start
timeout /t 3 /nobreak >nul

rem Start frontend
echo ⚛️ Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo 🎉 Application is starting!
echo ===========================
echo.
echo Two new terminal windows should have opened:
echo 1. Backend Server (running on http://localhost:8000)
echo 2. Frontend Server (running on http://localhost:5173)
echo.
echo If the windows didn't open, you can start them manually:
echo.
echo Backend:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload
echo.
echo Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo 📖 For detailed instructions, see SETUP_GUIDE.md
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
pause
