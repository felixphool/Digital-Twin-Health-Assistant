# Digital Twin Health Assistant - Setup Guide

## 🚀 Complete Setup Instructions for Any PC

This guide will help you set up and run the Digital Twin Health Assistant on Windows, Mac, or Linux.

## 📋 Prerequisites

### Required Software
1. **Python 3.9+** 
   - Download from: https://python.org/downloads/
   - ⚠️ On Windows: Check "Add Python to PATH" during installation

2. **Node.js 18+** 
   - Download from: https://nodejs.org/
   - Includes npm (Node Package Manager)

3. **Git**
   - Download from: https://git-scm.com/downloads

### Optional (Recommended)
- **Visual Studio Code**: https://code.visualstudio.com/
- **Postman**: For API testing

## 🔧 Project Setup

### Step 1: Clone or Download the Project
```bash
# If using Git
git clone <your-repository-url>
cd team-5

# Or download and extract the ZIP file
```

### Step 2: Verify Prerequisites
```bash
# Check Python version
python --version
# or
python3 --version

# Check Node.js version
node --version

# Check npm version
npm --version
```

## 🐍 Backend Setup (Python/FastAPI)

### Step 3: Navigate to Backend Directory
```bash
cd backend
```

### Step 4: Create Virtual Environment
```bash
# Windows
python -m venv venv

# Mac/Linux
python3 -m venv venv
```

### Step 5: Activate Virtual Environment
```bash
# Windows (Command Prompt)
venv\Scripts\activate

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Mac/Linux
source venv/bin/activate
```

**Note**: You should see `(venv)` in your terminal prompt when activated.

### Step 6: Install Python Dependencies
```bash
pip install -r requirements.txt
```

**This installs:**
- FastAPI - Web framework
- LangChain - AI agent framework
- Google Gemini AI - Language model
- SQLModel - Database ORM
- And many other AI/ML libraries

### Step 7: Configure Environment (Optional)
Create a `.env` file in the backend directory:
```bash
# backend/.env
GOOGLE_API_KEY=your_google_api_key_here
DATABASE_URL=sqlite:///app.db
```

## ⚛️ Frontend Setup (React/TypeScript)

### Step 8: Navigate to Frontend Directory
```bash
# From project root
cd frontend
```

### Step 9: Install Node.js Dependencies
```bash
npm install
```

**This installs:**
- React 19 - UI framework
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server
- Chart.js - Data visualization
- And other UI libraries

## 🚀 Running the Application

### Step 10: Start Backend Server
Open a terminal in the `backend` directory:

```bash
# Activate virtual environment first
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:**
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Step 11: Start Frontend Server
Open a **new terminal** in the `frontend` directory:

```bash
cd frontend
npm run dev
```

**Frontend will be available at:**
- Application: http://localhost:5173 (or http://localhost:5174)

## ✅ Verify Installation

### Test Backend
```bash
curl http://localhost:8000/
# Should return: {"ok":true,"service":"DigitalTwin API"}
```

### Test Frontend
- Open http://localhost:5173 in your browser
- You should see the Digital Twin Health Assistant interface

## 🔧 Development Commands

### Backend Commands
```bash
# Activate virtual environment
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Start development server with auto-reload
uvicorn app.main:app --reload

# Run with specific host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Install new package
pip install package_name
pip freeze > requirements.txt  # Update requirements
```

### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Install new package
npm install package_name
```

## 🛠️ Troubleshooting

### Common Issues

#### Backend Issues

**1. "Python not found"**
- Ensure Python is installed and added to PATH
- Try `python3` instead of `python`

**2. "pip not found"**
- Reinstall Python with pip included
- Or install pip separately

**3. "Module not found" errors**
- Ensure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`

**4. "Port already in use"**
- Change port: `uvicorn app.main:app --port 8001`
- Or kill process using port 8000

#### Frontend Issues

**1. "npm not found"**
- Install Node.js from official website
- Restart terminal after installation

**2. "Permission denied" (Linux/Mac)**
- Use: `sudo npm install -g npm`
- Or use a Node.js version manager

**3. "Port already in use"**
- Vite will automatically try the next available port
- Or set specific port in `vite.config.ts`

#### General Issues

**1. Virtual Environment Issues**
- Delete `venv` folder and recreate it
- Ensure you're in the correct directory

**2. Database Issues**
- Delete `app.db` file to reset database
- Check file permissions

## 🌟 Features Overview

Your Digital Twin Health Assistant includes:

### Backend Features
- **FastAPI REST API** - Modern Python web framework
- **AI Medical Agents** - LangChain + Google Gemini
- **Document Processing** - OCR for medical reports
- **Database** - SQLite with SQLModel ORM
- **Security** - Malware scanning, input validation
- **Web Search** - Medical information retrieval

### Frontend Features
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Medical Report Upload** - PDF/image processing
- **Chat Interface** - AI conversation
- **Data Visualization** - Charts and graphs
- **Responsive Design** - Works on all devices

## 📁 Project Structure
```
team-5/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application entry
│   │   ├── config.py       # Configuration settings
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Business logic
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Virtual environment
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── config/         # API configuration
│   │   └── contexts/       # React contexts
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
└── SETUP_GUIDE.md         # This file
```

## 🔒 Environment Variables

Create these files for configuration:

**backend/.env**
```
GOOGLE_API_KEY=your_google_api_key_here
DATABASE_URL=sqlite:///app.db
APP_ENV=development
```

**frontend/.env** (optional)
```
VITE_API_URL=http://localhost:8000
```

## 📝 Next Steps

1. **Get Google API Key**: Visit https://console.cloud.google.com/
2. **Customize the UI**: Modify components in `frontend/src/components/`
3. **Add Features**: Extend backend routes and frontend components
4. **Deploy**: Consider Vercel (frontend) + Railway/Heroku (backend)

## 🆘 Need Help?

If you encounter issues:
1. Check this troubleshooting section
2. Verify all prerequisites are installed
3. Ensure both servers are running
4. Check browser console for frontend errors
5. Check terminal output for backend errors

## 🎉 You're All Set!

Your Digital Twin Health Assistant should now be running successfully!
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
