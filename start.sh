#!/bin/bash

# Digital Twin Health Assistant - Start Script (Mac/Linux)
# Run with: bash start.sh

echo "🚀 Starting Digital Twin Health Assistant..."
echo "============================================"

# Check if setup has been run
if [ ! -d "backend/venv" ]; then
    echo "❌ Backend virtual environment not found."
    echo "Please run setup first: bash setup.sh"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not found."
    echo "Please run setup first: bash setup.sh"
    exit 1
fi

echo "✅ Dependencies found. Starting services..."

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Start backend in background
echo "🐍 Starting backend server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend started on http://localhost:8000"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend in background
echo "⚛️ Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Give frontend time to start
sleep 3

# Check if frontend started successfully
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend started on http://localhost:5173"
else
    echo "❌ Frontend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Application is running!"
echo "=========================="
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait
