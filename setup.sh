#!/bin/bash

# Digital Twin Health Assistant - Quick Setup Script (Mac/Linux)
# Run with: bash setup.sh

echo "🚀 Setting up Digital Twin Health Assistant..."
echo "================================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(python3 --version)"
else
    echo "❌ Python3 not found. Please install Python 3.9+ from https://python.org"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ npm not found. Please install Node.js which includes npm"
    exit 1
fi

echo ""
echo "🐍 Setting up Backend..."
echo "========================"

# Setup backend
cd backend

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Backend setup complete!"

cd ..

echo ""
echo "⚛️ Setting up Frontend..."
echo "========================="

# Setup frontend
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete!"

cd ..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "To run the application:"
echo ""
echo "1. Start Backend (in one terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open your browser:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📖 For detailed instructions, see SETUP_GUIDE.md"
echo ""
