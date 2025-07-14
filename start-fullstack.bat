@echo off
REM ASA Service Full Stack Production Script
REM This script sets up and runs the application with full PostgreSQL integration
REM and official data scraping from ARK Wiki and Dododex

echo ========================================
echo   ASA Service Full Stack Setup
echo   PostgreSQL + Real Data Integration
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js not found
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: npm not found
    pause
    exit /b 1
)

echo ✅ Node.js and npm found
echo.

REM Install dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Create logs directory
if not exist "logs" mkdir logs

echo ========================================
echo   Database Configuration
echo ========================================
echo.
echo Setting up for PostgreSQL integration:
echo   Username: postgres
echo   Password: postgres
echo   Database: asa_service
echo   Host: localhost
echo   Port: 5432
echo.
echo ⚠️  IMPORTANT: PostgreSQL Setup Required
echo.
echo If you don't have PostgreSQL installed:
echo   1. Download from: https://www.postgresql.org/download/windows/
echo   2. During installation, set:
echo      - Username: postgres
echo      - Password: postgres
echo   3. Make sure PostgreSQL service is running
echo   4. Add PostgreSQL bin directory to your system PATH
echo.
echo If PostgreSQL is already installed but not accessible:
echo   - Ensure the service is running
echo   - Add PostgreSQL bin directory to PATH
echo   - Verify credentials: username=postgres, password=postgres
echo.

REM Set all environment variables for full integration
set NODE_ENV=production
set PORT=3000
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=asa_service
set DB_USER=postgres
set DB_PASSWORD=postgres
set SKIP_DATABASE=false
set DROP_EXISTING_DB=false
set ENABLE_DATA_SCRAPING=true
set POPULATE_WITH_REAL_DATA=true
set ENABLE_DODODEX_SCRAPING=true
set ENABLE_WIKIDATA_SCRAPING=true
set ENABLE_WIKILY_SCRAPING=true

echo ========================================
echo   Starting ASA Service
echo ========================================
echo.
echo 🚀 Configuration:
echo   • Environment: Production
echo   • Database: PostgreSQL (Full Integration)
echo   • Data Scraping: ENABLED (ARK Wiki + Dododex)
echo   • Real Data Population: ENABLED
echo   • Port: 3000
echo.
echo 🌐 Available URLs:
echo   • Frontend UI: http://localhost:3000/
echo   • API Documentation: http://localhost:3000/api/docs
echo   • Health Check: http://localhost:3000/api/health
echo.
echo 📊 The application will:
echo   1. Connect to PostgreSQL database
echo   2. Create 'asa_service' database if needed
echo   3. Initialize database schema
echo   4. Scrape and populate real creature data from:
echo      - ARK Official Wiki
echo      - Dododex community database
echo   5. Start the full-stack application
echo.
echo Press Ctrl+C to stop the application
echo.

REM Start the application with full database integration
npm run prod:full
