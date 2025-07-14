# ASA Service Full Stack Production Setup

## 🎯 Overview

This setup runs the complete ASA Service stack with:
- **Frontend UI** (Modern React-like interface)
- **Backend API** (Express.js with all endpoints)
- **PostgreSQL Database** (Full integration with real data)
- **Official Data Scraping** (ARK Wiki + Dododex integration)

## 🚀 Quick Start

### Option 1: Batch Script (Windows)
```bash
start-fullstack.bat
```

### Option 2: PowerShell Script (Recommended)
```powershell
.\start-production.ps1
```

### Option 3: Manual npm Command
```bash
npm run prod:full
```

## 📋 Prerequisites

### 1. Node.js & npm
- Download from: https://nodejs.org/
- Version 16+ required

### 2. PostgreSQL Database
- Download from: https://www.postgresql.org/download/windows/
- **IMPORTANT**: During installation, set:
  - Username: `postgres`
  - Password: `postgres`
  - Port: `5432` (default)

### 3. System PATH Configuration
Add PostgreSQL bin directory to your system PATH:
- Default location: `C:\Program Files\PostgreSQL\15\bin`
- Or wherever you installed PostgreSQL

## 🗃️ Database Configuration

The application expects these PostgreSQL credentials:
```
Host: localhost
Port: 5432
Database: asa_service (will be created automatically)
Username: postgres
Password: postgres
```

## 🔧 Environment Variables

The scripts automatically set these variables:

```bash
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asa_service
DB_USER=postgres
DB_PASSWORD=postgres
SKIP_DATABASE=false
ENABLE_DATA_SCRAPING=true
POPULATE_WITH_REAL_DATA=true
ENABLE_DODODEX_SCRAPING=true
ENABLE_WIKIDATA_SCRAPING=true
ENABLE_WIKILY_SCRAPING=true
```

## 📊 What Happens During Startup

1. **Dependency Check**: Verifies Node.js, npm, and PostgreSQL
2. **Database Setup**: 
   - Connects to PostgreSQL server
   - Creates `asa_service` database if needed
   - Initializes database schema
3. **Data Population**:
   - Scrapes creature data from ARK Official Wiki
   - Fetches taming information from Dododex
   - Populates maps and regions data
   - Sets up search indices
4. **Application Start**: Launches full-stack application on port 3000

## 🌐 Access Points

Once running, access your application at:

- **Frontend UI**: http://localhost:3000/
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health
- **Creatures API**: http://localhost:3000/api/creatures
- **Maps API**: http://localhost:3000/api/maps
- **Taming Calculator**: http://localhost:3000/api/taming
- **Search API**: http://localhost:3000/api/search

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `start-fullstack.bat` | Windows batch script for full setup |
| `start-production.ps1` | PowerShell script with advanced options |
| `npm run prod:full` | Direct npm command for production |
| `npm run dev` | Development mode (mock data) |
| `npm run test` | Run all tests |

## 🔍 Troubleshooting

### PostgreSQL Connection Issues

1. **"password authentication failed"**
   - Verify PostgreSQL credentials: username=postgres, password=postgres
   - Check if PostgreSQL service is running

2. **"psql command not found"**
   - Add PostgreSQL bin directory to system PATH
   - Restart command prompt/PowerShell after PATH change

3. **"database connection failed"**
   - Ensure PostgreSQL service is running
   - Check Windows services for "postgresql-x64-15" (or your version)

### Application Issues

1. **Port 3000 already in use**
   - Stop any existing Node.js processes
   - Or use different port: `set PORT=3001` before running

2. **Module not found errors**
   - Run `npm install` to reinstall dependencies
   - Delete `node_modules` folder and run `npm install` again

## 📈 Performance Notes

- **Initial startup** may take 2-5 minutes for data scraping
- **Subsequent starts** are faster (data is cached in database)
- **Memory usage** ~200-500MB depending on data size
- **Database size** ~50-100MB after full population

## 🔒 Security Considerations

For production deployment:
- Change default PostgreSQL credentials
- Set up proper firewall rules
- Use environment variables for sensitive data
- Enable HTTPS/SSL

## 📞 Support

If you encounter issues:
1. Check the logs in `logs/app.log`
2. Verify all prerequisites are installed
3. Ensure PostgreSQL is properly configured
4. Run `npm run test` to verify functionality

## 🎉 Success Indicators

You'll know everything is working when you see:
```
✅ ASA Service is ready to handle requests!
🌐 Frontend UI: http://localhost:3000/
🗃️ Database: Connected to PostgreSQL
📊 Data: Populated with real ARK creature data
```
