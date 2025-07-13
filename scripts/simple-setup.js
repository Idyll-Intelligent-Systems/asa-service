#!/usr/bin/env node
/**
 * Simple Development Setup Script
 * Sets up development environment with optional database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SimpleDevelopmentSetup {
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asa_maps
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asa_maps_test

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

      // Try to setup database (optional)
      console.log('🗃️  Attempting database setup...');
      try {
        execSync('npm run db:migrate', { cwd: this.rootDir, stdio: 'inherit' });
        execSync('npm run db:seed', { cwd: this.rootDir, stdio: 'inherit' });
        console.log('✅ Database setup completed');
      } catch (dbError) {
        console.log('⚠️  Database setup failed (PostgreSQL not available)');
        console.log('   Application will run in standalone mode');
      }

      console.log('\n🎉 Development environment setup completed!');
      console.log('\n📋 Available commands:');
      console.log('   npm start              - Start production server');
      console.log('   npm run dev            - Start development server');
      console.log('   npm run test           - Run all tests');
      console.log('   npm run test:unit      - Run unit tests');
      console.log('   npm run lint:fix       - Fix code style issues');

      console.log('\n💡 Note: If PostgreSQL is not installed, the app will run with limited functionality');

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
      console.log('   1. Ensure Node.js version (requires Node.js 14+)');
      console.log('   2. PostgreSQL is optional for basic functionality');
      console.log('   3. Run individual commands manually to isolate issues');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new SimpleDevelopmentSetup();
  setup.run();
}

module.exports = SimpleDevelopmentSetup;
