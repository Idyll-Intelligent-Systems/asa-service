# Development Guide

This guide covers development setup, architecture, and contribution guidelines for the ASA Service.

## 🏗️ Architecture Overview

### Application Structure

The ASA Service follows a modular architecture with clear separation of concerns:

```
src/
├── backend/
│   ├── app.js              # Main application class
│   ├── config/
│   │   └── index.js        # Configuration management
│   ├── middleware/
│   │   ├── security.js     # Security middleware (CORS, rate limiting, etc.)
│   │   └── handlers.js     # Error handling and request processing
│   ├── routes/
│   │   └── core.js         # API route definitions
│   ├── services/
│   │   ├── DatabaseService.js          # Database connection management
│   │   ├── DataPopulationService.js    # Data import/export
│   │   └── SearchService.js            # Search functionality
│   └── utils/
│       ├── validation.js   # Input validation utilities
│       └── logger.js       # Logging utilities
└── database/
    ├── schema.sql          # Complete database schema
    ├── migrations/         # Versioned database changes
    └── seeds/             # Sample data for development
```

### Database Design

The database schema is designed for performance and scalability:

#### Core Tables
- **maps**: Official ARK maps with metadata
- **creatures**: All creatures with comprehensive stats
- **resources**: Materials and items with spawn data
- **locations**: Coordinates and points of interest
- **caves**: Cave systems with entrance/exit data
- **biomes**: Environmental regions

#### Performance Features
- **Full-text search**: PostgreSQL full-text search with tsvector
- **Spatial indexing**: GiST indexes for coordinate-based queries
- **Materialized views**: Pre-computed search results
- **Connection pooling**: Efficient database connection management

## 🛠️ Development Setup

### Prerequisites

- Node.js 14+ (recommended: Node.js 18+)
- PostgreSQL 12+
- Git

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd asa-service
   ```

2. **Automated setup** (recommended):
   ```bash
   npm run setup
   ```

3. **Manual setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your database settings
   
   # Setup database
   npm run db:migrate
   npm run db:seed
   
   # Start development server
   npm run dev
   ```

### Environment Variables

Create a `.env` file with the following variables:

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

# Logging
LOG_LEVEL=debug
```

## 🧪 Testing Strategy

### Test Types

1. **Unit Tests** (`tests/unit/`):
   - Individual function/class testing
   - No external dependencies
   - Fast execution

2. **Integration Tests** (`tests/integration/`):
   - API endpoint testing
   - Database integration
   - Real service interaction

3. **End-to-End Tests** (`tests/e2e/`):
   - Full application stack testing
   - Browser automation with Puppeteer
   - User journey validation

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Database

Integration and E2E tests use a separate test database:
- Automatically created and destroyed for each test run
- Isolated from development data
- Uses same schema as production

## 🔧 Development Workflow

### Adding New Features

1. **Create feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Write tests first** (TDD approach):
   - Create unit tests for new functions
   - Add integration tests for API endpoints
   - Add E2E tests for user-facing features

3. **Implement feature**:
   - Follow existing code patterns
   - Use appropriate service layer
   - Add proper error handling

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Update documentation** if needed

6. **Submit pull request**

### Code Style Guidelines

- Use ESLint configuration provided
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use async/await for asynchronous operations
- Implement proper error handling

### Database Migrations

When adding database changes:

1. **Create migration file**:
   ```bash
   # Create new migration (increment version number)
   touch src/database/migrations/003_your_change.sql
   ```

2. **Write migration SQL**:
   ```sql
   -- 003_your_change.sql
   -- Add your database changes here
   ALTER TABLE creatures ADD COLUMN new_field VARCHAR(255);
   ```

3. **Test migration**:
   ```bash
   npm run db:reset
   ```

4. **Update schema.sql** to reflect final state

## 🚀 Deployment

### Environment Preparation

1. **Production environment variables**:
   - Use strong JWT secrets
   - Configure proper database URLs
   - Set appropriate CORS origins
   - Configure logging levels

2. **Database setup**:
   ```bash
   npm run db:migrate
   ```

3. **Security considerations**:
   - Enable HTTPS in production
   - Configure rate limiting appropriately
   - Set up proper logging and monitoring

### Docker Deployment

```bash
# Build image
docker build -t asa-service .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

```bash
# Install production dependencies
npm install --production

# Run database migrations
npm run db:migrate

# Start application
npm start
```

## 🎯 Performance Considerations

### Database Performance

- Use appropriate indexes for common queries
- Implement pagination for large result sets
- Use connection pooling
- Consider read replicas for high-traffic scenarios

### Application Performance

- Implement response caching where appropriate
- Use compression middleware
- Optimize database queries
- Monitor memory usage

### Monitoring

- Use application performance monitoring (APM)
- Set up health checks
- Monitor database performance
- Track API response times

## 🤝 Contributing Guidelines

### Pull Request Process

1. Fork the repository
2. Create feature branch from `main`
3. Make changes following code style guidelines
4. Add/update tests as needed
5. Ensure all tests pass
6. Update documentation if needed
7. Submit pull request with clear description

### Code Review Criteria

- Code follows established patterns
- Tests are comprehensive and pass
- Documentation is updated
- No security vulnerabilities
- Performance implications considered

### Commit Message Format

Use conventional commits:
```
feat: add new search endpoint
fix: resolve database connection issue
docs: update API documentation
test: add integration tests for maps
```

## 🆘 Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check PostgreSQL is running
   - Verify connection string in .env
   - Ensure database exists

2. **Test failures**:
   - Check test database configuration
   - Ensure all dependencies installed
   - Run tests individually to isolate issues

3. **Port conflicts**:
   - Change PORT in .env file
   - Kill processes using required ports

### Getting Help

- Check existing GitHub issues
- Review documentation thoroughly
- Create detailed bug reports with reproduction steps
- Include environment information in issues

## 📋 Checklists

### Pre-commit Checklist
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] No console.log statements in production code
- [ ] Documentation updated if needed
- [ ] Environment variables documented

### Release Checklist
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] All tests pass in CI
- [ ] Database migrations tested
- [ ] Documentation reviewed
- [ ] Security review completed
