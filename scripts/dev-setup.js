#!/usr/bin/env node
/**
 * Development Setup Script
 * Initializes development environment with database and dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevelopmentSetup {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
  }

  async setup() {
    console.log('🚀 Setting up development environment...');
    
    try {
      // Check if .env exists
      const envPath = path.join(this.rootDir, '.env');
      if (!fs.existsSync(envPath)) {
        console.log('📝 Creating .env file...');
        const envContent = `# Database Configuration
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
`;
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Created .env file');
      }

      // Install dependencies
      console.log('📦 Installing dependencies...');
      execSync('npm install', { cwd: this.rootDir, stdio: 'inherit' });

      // Run database migration
      console.log('🗃️  Setting up database...');
      execSync('npm run db:migrate', { cwd: this.rootDir, stdio: 'inherit' });

      // Seed database
      console.log('🌱 Seeding database...');
      execSync('npm run db:seed', { cwd: this.rootDir, stdio: 'inherit' });

      // Run tests to verify setup
      console.log('🧪 Running tests to verify setup...');
      execSync('npm run test:integration', { cwd: this.rootDir, stdio: 'inherit' });

      console.log('\n🎉 Development environment setup completed!');
      console.log('\n📋 Available commands:');
      console.log('   npm start              - Start production server');
      console.log('   npm run dev            - Start development server with nodemon');
      console.log('   npm run test           - Run all tests');
      console.log('   npm run test:unit      - Run unit tests');
      console.log('   npm run test:integration - Run integration tests');
      console.log('   npm run test:e2e       - Run end-to-end tests');
      console.log('   npm run db:migrate     - Run database migrations');
      console.log('   npm run db:seed        - Seed database with sample data');
      console.log('   npm run db:reset       - Reset database (migrate + seed)');
      console.log('   npm run cleanup        - Clean up old repository files');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      await this.setup();
    } catch (error) {
      console.error('❌ Development setup failed:', error.message);
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Ensure PostgreSQL is installed and running');
      console.log('   2. Check database connection in .env file');
      console.log('   3. Verify Node.js version (requires Node.js 14+)');
      console.log('   4. Run individual commands manually to isolate issues');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DevelopmentSetup();
  setup.run();
}

module.exports = DevelopmentSetup;
