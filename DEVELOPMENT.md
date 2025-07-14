# ASA Service Development Guide

## 🎯 Overview

This guide provides comprehensive instructions for setting up and developing the ASA Service, a complete ARK: Survival Ascended database API with integrated frontend.

## 🚀 Quick Start Commands

### PowerShell (Recommended)
```powershell
# Full setup with database
.\run-dev.ps1

# Clean start (resets database)
.\run-dev.ps1 -CleanStart

# Mock mode (no database required)
.\run-dev.ps1 -SkipDatabase

# With verbose logging
.\run-dev.ps1 -Verbose
```

### NPM Commands
```bash
# Development with database
npm run dev

# Development with mock data
npm run dev:mock

# Production
npm start
```

### VS Code Tasks
- `Ctrl+Shift+P` → "Tasks: Run Task"
- Select "ASA Service: Start Development"
- Or "ASA Service: Clean Start (Reset Database)"
- Or "ASA Service: Mock Mode (No Database)"

## 📋 Prerequisites

### Required
- **Node.js** v16+ - [Download](https://nodejs.org/)
- **PowerShell** (built into Windows)

### Optional (for full database features)
- **PostgreSQL** v12+ - [Download](https://www.postgresql.org/download/windows/)

## 🗃️ Database Setup

### Automatic (via run-dev.ps1)
The PowerShell script handles everything:
1. Checks PostgreSQL service
2. Creates `asa_service` database
3. Runs schema initialization
4. Populates with sample ARK data

### Manual Setup
```powershell
# 1. Start PostgreSQL service
Start-Service postgresql*

# 2. Create database
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE asa_service;"

# 3. Initialize schema and data
psql -h localhost -p 5432 -U postgres -d asa_service -f database-init.sql

# 4. Verify setup
psql -h localhost -p 5432 -U postgres -d asa_service -c "SELECT COUNT(*) FROM creatures;"
```

### Database Configuration
Default settings (change in `.env.development`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asa_service
DB_USER=postgres
DB_PASSWORD=postgres
```

## 🔧 Environment Configuration

### .env.development
```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asa_service
DB_USER=postgres
DB_PASSWORD=postgres
SKIP_DATABASE=false

# Logging
LOG_LEVEL=debug
VERBOSE_LOGGING=true

# Features
AUTO_POPULATE_DATA=true
ENABLE_MOCK_DATA=true
```

## 📊 Logging System

### Console Output
- 🚀 Startup messages
- ℹ️ General information
- 🔍 Debug information
- ⚠️ Warnings
- ❌ Errors
- ✅ Success messages
- 🗃️ Database operations
- 🌐 API requests
- ⚡ Performance metrics
- 🔒 Security events

### File Logging
All logs are also written to `logs/app.log` with timestamps and metadata.

### Log Levels
- `debug` - Detailed debugging info
- `info` - General application info
- `warn` - Warning conditions
- `error` - Error conditions

## 🏗️ Project Structure

```
asa-service/
├── src/
│   ├── backend/services/     # External service integrations
│   ├── database/            # Database initialization
│   ├── frontend/            # Single-page web application
│   ├── middleware/          # Express middleware
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions (logger, etc.)
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── logs/                   # Application logs
├── .vscode/                # VS Code configuration
├── .env.development        # Development environment
├── database-init.sql       # Database schema and sample data
├── run-dev.ps1            # PowerShell development script
├── start-dev.bat          # Batch file alternative
└── DEV-SETUP.md           # Detailed setup instructions
```

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Database
Tests automatically use a separate test database or mock data.

## 🔄 Development Workflow

### 1. Initial Setup
```powershell
git clone <repository>
cd asa-service
.\run-dev.ps1
```

### 2. Development Loop
1. Make code changes
2. Application auto-restarts (nodemon)
3. Test changes at http://localhost:3000
4. Check logs for any issues
5. Commit changes

### 3. Database Changes
```powershell
# Reset database with new schema
.\run-dev.ps1 -CleanStart
```

## 🌐 API Endpoints

### Core Endpoints
- `GET /api/health` - Service health check
- `GET /api/creatures` - List creatures
- `GET /api/maps` - List maps
- `GET /api/regions` - List regions
- `GET /api/search` - Search functionality
- `GET /api/taming` - Taming information

### Admin Endpoints
- `POST /admin/scrape/ark-wiki/creatures` - Scrape creature data
- `POST /admin/scrape/ark-wiki/maps` - Scrape map data
- `POST /admin/scrape/dododex/taming` - Scrape taming data

### Frontend
- `/` - Main application UI
- `/api/docs` - API documentation

## 🎨 Frontend Development

### Technology Stack
- Vanilla JavaScript (ES6+)
- CSS3 with custom properties
- FontAwesome icons
- Responsive design

### Key Features
- Creature database browser
- Map exploration tool
- Taming calculator
- Search functionality
- Region browser
- Data update modal

## 🔍 Debugging

### Common Issues

**PostgreSQL Connection Failed:**
```powershell
# Check service status
Get-Service postgresql*

# Start service
Start-Service postgresql*

# Or run in mock mode
.\run-dev.ps1 -SkipDatabase
```

**Port 3000 Already in Use:**
```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or change port in .env.development
```

**Module Not Found:**
```bash
# Reinstall dependencies
npm install
```

### Debug Logging
```env
# Enable verbose logging
LOG_LEVEL=debug
VERBOSE_LOGGING=true
```

### VS Code Debugging
1. Set breakpoints in code
2. Press F5 or use Debug menu
3. Select "Node.js" configuration

## 📝 Sample Data

The database is pre-populated with:
- **11 Official Maps** (The Island, Ragnarok, etc.)
- **10+ Creatures** with stats and taming info
- **Multiple Regions** per map with biome info
- **Resources** and their spawn locations
- **Cave Systems** with artifact locations
- **Taming Requirements** for different levels

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker (if available)
```bash
npm run docker:build
npm run docker:run
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Make changes with proper logging
5. Test thoroughly
6. Submit a pull request

## 📚 Additional Resources

- [ASA Wiki](https://ark.wiki.gg/) - Official game wiki
- [Dododex](https://www.dododex.com/) - Taming calculator
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - Database documentation
- [Express.js Guide](https://expressjs.com/) - Web framework docs

## 💡 Tips

1. **Use VS Code Tasks** for easy development
2. **Check logs regularly** for issues
3. **Run tests before committing** changes
4. **Use mock mode** when database isn't needed
5. **Clean start** when schema changes
6. **Monitor performance** with built-in timing logs

## 🆘 Support

If you encounter issues:
1. Check the logs: `Get-Content logs/app.log -Tail 20`
2. Run with verbose logging: `.\run-dev.ps1 -Verbose`
3. Try mock mode: `.\run-dev.ps1 -SkipDatabase`
4. Check prerequisites are installed
5. Ensure PostgreSQL is running (if using database)

---

Happy coding! 🎮
