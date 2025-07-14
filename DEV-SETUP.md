# ASA Service Development Setup

## Quick Start

1. **Run the PowerShell setup script:**
   ```powershell
   .\run-dev.ps1
   ```

   This will:
   - Check prerequisites (Node.js, npm, PostgreSQL)
   - Install dependencies
   - Create and initialize the PostgreSQL database
   - Populate with sample ARK data
   - Start the application in development mode

## Prerequisites

### Required Software
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/windows/)
- **PowerShell** (Built into Windows)

### PostgreSQL Setup
Ensure PostgreSQL is installed with these settings:
- **Host:** localhost
- **Port:** 5432
- **Username:** postgres
- **Password:** postgres
- **Database:** asa_service (will be created automatically)

## Script Options

### Basic Usage
```powershell
# Standard development setup
.\run-dev.ps1

# Clean start (drops existing database)
.\run-dev.ps1 -CleanStart

# Skip database setup (use mock data)
.\run-dev.ps1 -SkipDatabase

# Verbose logging
.\run-dev.ps1 -Verbose

# Combine options
.\run-dev.ps1 -CleanStart -Verbose
```

### Manual Setup (Alternative)

If you prefer manual setup:

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Create database:**
   ```powershell
   # Connect to PostgreSQL
   psql -h localhost -p 5432 -U postgres

   # Create database
   CREATE DATABASE asa_service;
   ```

3. **Initialize database:**
   ```powershell
   psql -h localhost -p 5432 -U postgres -d asa_service -f database-init.sql
   ```

4. **Start application:**
   ```powershell
   npm run dev
   ```

## Environment Configuration

The application uses `.env.development` for development settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asa_service
DB_USER=postgres
DB_PASSWORD=postgres

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
VERBOSE_LOGGING=true

# Features
SKIP_DATABASE=false
AUTO_POPULATE_DATA=true
```

## Application URLs

Once running, access:
- **Frontend UI:** http://localhost:3000/
- **API Health:** http://localhost:3000/api/health
- **API Documentation:** http://localhost:3000/api/docs

## Database Schema

The application creates these main tables:
- `maps` - ARK map information
- `creatures` - Creature data with stats
- `taming_data` - Taming requirements and methods
- `regions` - Map regions and biomes
- `resources` - Harvestable resources
- `caves` - Cave locations and artifacts

## Sample Data

The database is populated with official ARK data including:
- 11 official maps (The Island, Ragnarok, etc.)
- 10+ creatures with stats and taming info
- Regions with spawn information
- Resources and their locations
- Cave systems with artifacts

## Development Features

### Enhanced Logging
- Color-coded console output
- File logging to `logs/app.log`
- Request/response logging
- Database operation timing
- Service operation tracking

### Mock Mode
If database connection fails, the application automatically falls back to mock mode with sample data.

### Hot Reload
The application uses nodemon for automatic restart on file changes.

## Troubleshooting

### PostgreSQL Connection Issues
1. Verify PostgreSQL service is running:
   ```powershell
   Get-Service postgresql*
   ```

2. Check connection manually:
   ```powershell
   psql -h localhost -p 5432 -U postgres -c "SELECT version();"
   ```

3. If issues persist, run with `-SkipDatabase` flag to use mock data.

### Port Already in Use
If port 3000 is busy:
1. Edit `.env.development` and change `PORT=3000` to another port
2. Or stop the process using port 3000:
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

### Permission Issues
Run PowerShell as Administrator if you encounter permission errors.

## Project Structure

```
asa-service/
├── src/
│   ├── backend/services/     # Data services
│   ├── database/            # Database setup
│   ├── frontend/            # Web UI
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   └── utils/               # Utilities (logger, etc.)
├── tests/                   # Test suites
├── logs/                    # Application logs
├── .env.development         # Development config
├── database-init.sql        # Database schema & data
├── run-dev.ps1             # Development setup script
└── package.json            # Dependencies
```

## Next Steps

After successful setup:
1. Explore the frontend UI at http://localhost:3000/
2. Test API endpoints at http://localhost:3000/api/
3. Check logs in the `logs/` directory
4. Modify code and see hot reload in action
5. Add your own data through the admin panel

## Need Help?

- Check the logs: `Get-Content logs/app.log -Tail 50`
- Run with verbose logging: `.\run-dev.ps1 -Verbose`
- Use mock mode if database issues: `.\run-dev.ps1 -SkipDatabase`
