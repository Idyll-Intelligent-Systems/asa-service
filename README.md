# ASA Service

Ark Survival Ascended server information service providing maps, creatures, and coordinate data.

## 🚀 Quick Start

### Development Setup
```bash
# Clone and setup development environment
npm run setup

# Or manual setup:
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Production Setup
```bash
npm install --production
npm run db:migrate
npm start
```

## 📁 Project Structure

```
src/
├── backend/          # Application server code
│   ├── app.js       # Main application entry point
│   ├── config/      # Configuration management
│   ├── middleware/  # Express middleware
│   ├── routes/      # API route definitions
│   ├── services/    # Business logic services
│   └── utils/       # Utility functions
├── frontend/        # Frontend static assets
├── database/        # Database related files
│   ├── schema.sql   # Complete database schema
│   ├── migrations/  # Database migration files
│   └── seeds/       # Sample data for development
tests/
├── unit/           # Unit tests
├── integration/    # API integration tests
└── e2e/           # End-to-end tests
scripts/           # Utility scripts
docs/             # Documentation
docker/           # Docker configurations
```

## 🔗 API Endpoints

### Core Endpoints
- `GET /api/health` - Service health check
- `GET /api/maps` - List all maps with details
- `GET /api/maps/:mapName` - Get specific map information
- `GET /api/creatures` - List all creatures with filtering
- `GET /api/creatures/:id` - Get specific creature details
- `GET /api/search` - Advanced search across all content

### Map-Specific Endpoints
- `GET /api/maps/:mapName/creatures` - Creatures available on specific map
- `GET /api/maps/:mapName/resources` - Resources available on specific map
- `GET /api/maps/:mapName/coordinates` - Notable coordinates for map

### Advanced Search
- `GET /api/search/creatures?q=term` - Search creatures by name/type
- `GET /api/search/locations?q=term` - Search locations and coordinates
- `GET /api/search/all?q=term` - Global search across all content

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run setup           # Complete development environment setup

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Populate database with sample data
npm run db:reset        # Reset database (migrate + seed)

# Testing
npm test               # Run all tests
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e       # Run end-to-end tests
npm run test:watch     # Run tests in watch mode

# Maintenance
npm run cleanup        # Clean up old repository files
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/asa_service
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/asa_service_test

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing with real database
- **E2E Tests**: Full application stack testing with browser automation

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode during development
npm run test:watch
```

## 🗃️ Database

### Schema Overview

The database includes comprehensive tables for:
- **Maps**: Official ARK maps with metadata
- **Creatures**: All creatures with stats and behaviors
- **Resources**: Materials and items with spawn information
- **Locations**: Notable coordinates and POIs
- **Cave Systems**: Cave networks with connections
- **Biomes**: Environmental regions with characteristics

### Migration System

Database changes are managed through versioned migrations:

```bash
# Run pending migrations
npm run db:migrate

# Reset database to clean state
npm run db:reset
```

## 📚 API Documentation

### Response Formats

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Handling

Errors are returned with appropriate HTTP status codes and detailed messages:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid map name provided",
    "details": { ... }
  }
}
```

### Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Proper HTTP headers included in responses

## 🚢 Deployment

### Docker Deployment

```bash
# Build application image
docker build -t asa-service .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Set production environment variables
2. Install dependencies: `npm install --production`
3. Run migrations: `npm run db:migrate`
4. Start application: `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the established patterns
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- ESLint configuration enforces consistent code style
- Run `npm run lint:fix` to automatically fix style issues
- Follow existing patterns for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
{
  "map": "Ragnarok",
  "type": "resource",
  "lat": 50.0,
  "lon": 50.0
}
```

#### Data Browser
```bash
# Get all locations with filtering
GET /locations?map=Ragnarok&type=resource&name=metal&limit=50&offset=0

# Response includes pagination info
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### Wiki Integration
```bash
# Update from official wiki
POST /wiki_update
{ "map": "Ragnarok" }  # or { "map": "all" }

# Check wiki update status
GET /wiki_status
```

#### System Management
```bash
# System status
GET /status

# Available maps
GET /maps

# Available types  
GET /types

# Export map data
GET /export/Ragnarok
```

### CRUD Operations
```bash
# Add location
POST /locations
{
  "map": "Ragnarok",
  "type": "resource",
  "name": "Metal Node",
  "lat": 45.5,
  "lon": 30.2
}

# Delete location (requires database)
DELETE /locations/123?map=Ragnarok&type=resource
```

## 🗄️ Database Integration

### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE asa_maps;

-- Run initialization script
\i init-db.sql
```

### Environment Variables
```bash
# Database Configuration
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=asa_maps

# Service Configuration
PORT=4000
NODE_ENV=production
AUTO_WIKI_UPDATE=true
```

### Automatic Features
- **Table Creation**: Tables created automatically when needed
- **Schema Evolution**: Missing columns added automatically
- **Performance Indexes**: Automatically created for optimal performance
- **Connection Monitoring**: Auto-reconnection every 30 seconds

## 🌐 Frontend Interface

### Modern UI Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Status**: Live database connection status
- **Dynamic Loading**: Auto-refreshing data and status
- **Advanced Filtering**: Search and filter with instant results
- **Export Functionality**: Download data as JSON
- **Modal Dialogs**: Clean interface for actions

### Usage
1. Open http://localhost:4000 in your browser
2. Select map and type to find locations
3. Use the data browser to explore all locations
4. Access wiki updates and system status from the navigation

## 📁 Project Structure

```
asa-service/
├── backend.js              # Main server application
├── init-db.sql            # Database initialization script
├── setup.ps1              # Windows setup script
├── package.json           # Node.js dependencies
├── .env                   # Environment configuration
├── data/                  # CSV data files
│   ├── Ragnarok.csv
│   ├── TheIsland.csv
│   └── ...
├── frontend/              # Web interface
│   ├── index.html        # Modern UI
│   └── nginx.conf        # Nginx configuration
├── docs/                 # Documentation
└── tests/               # Test files
```

## 🔧 Configuration

### Wiki Update Configuration
The service automatically fetches data from the official ARK wiki:
- **Schedule**: Every 6 hours (configurable)
- **Source**: https://ark.wiki.gg/ official wiki API
- **Fallback**: CSV files used when wiki is unavailable
- **Manual Trigger**: Available via API or UI

### Performance Tuning
```javascript
// Connection pool settings
const db = new Pool({
  max: 20,          // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pagination settings
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL service
sc query postgresql-x64-13  # Windows
systemctl status postgresql  # Linux

# Test connection manually
psql -U postgres -d asa_maps -c "SELECT 1;"
```

#### Service won't start
```bash
# Check port availability
netstat -an | findstr :4000  # Windows
lsof -i :4000                # Linux/macOS

# Check logs
npm start  # View console output
```

#### Wiki updates failing
```bash
# Check internet connection
curl https://ark.wiki.gg/

# Manual wiki update
curl -X POST http://localhost:4000/wiki_update \
  -H "Content-Type: application/json" \
  -d '{"map": "all"}'
```

### CSV-Only Mode
If database connection fails, the service automatically falls back to CSV mode:
- All read operations work normally
- Add/Delete operations save to memory only
- Data persists only during session
- Status API shows current mode

## 🔄 Development

### Development Setup
```bash
# Install with dev dependencies
npm install

# Start with auto-reload
npm run dev

# Or use the setup script
.\setup.ps1 -Development
```

### API Testing
```bash
# Test all endpoints
curl http://localhost:4000/status
curl http://localhost:4000/maps
curl -X POST http://localhost:4000/nearest \
  -H "Content-Type: application/json" \
  -d '{"map":"Ragnarok","type":"resource","lat":50,"lon":50}'
```

## 📈 Monitoring

### Health Checks
```bash
# Service health
curl http://localhost:4000/status

# Database health
curl http://localhost:4000/status | jq '.database'

# Wiki update status
curl http://localhost:4000/wiki_status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- ARK: Survival Ascended community for map data
- Official ARK Wiki for coordinate information
- Contributors and testers


```bash
./fetch_wiki_coords.sh The_Island --update
```

Repeat for each map you wish to populate.
The updated CSVs will then contain the official wiki coordinates used by the service.