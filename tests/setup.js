// Global test setup
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.TEST_PORT || 3001;

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random test data
  randomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Helper to create test creature data
  createTestCreature: (overrides = {}) => ({
    name: `Test Creature ${Math.floor(Math.random() * 1000)}`,
    slug: `test_creature_${Date.now()}`,
    description: 'A test creature for unit testing',
    tameable: true,
    taming_method: 'knockout',
    ...overrides
  }),

  // Helper to create test map data
  createTestMap: (overrides = {}) => ({
    name: `Test Map ${Math.floor(Math.random() * 1000)}`,
    slug: `test_map_${Date.now()}`,
    official: true,
    expansion: false,
    release_date: '2023-01-01',
    size_km: 100,
    description: 'A test map for unit testing',
    ...overrides
  })
};

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output in tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  if (!process.env.VERBOSE_TESTS) {
    Object.assign(console, originalConsole);
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Increase timeout for async operations
jest.setTimeout(30000);
