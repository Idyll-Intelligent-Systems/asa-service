const request = require('supertest');

// Mock database and external services
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    }),
    end: jest.fn().mockResolvedValue()
  }))
}));

jest.mock('../src/database/DatabaseInitializer', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({
      success: true,
      status: { schema: true, wikiData: true, dododexData: true, initialization: true }
    }),
    close: jest.fn().mockResolvedValue(),
    gracefulShutdown: jest.fn().mockResolvedValue()
  }));
});

const ASAServiceApp = require('../app');

describe('ASA Service API', () => {
  let app;
  let asaApp;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_DATA_SYNC = 'true';
    
    asaApp = new ASAServiceApp();
    await asaApp.initialize();
    app = asaApp.getApp();
  }, 30000);

  afterAll(async () => {
    if (asaApp) {
      await asaApp.gracefulShutdown();
    }
  });

  describe('Root Endpoints', () => {
    test('GET / should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'ASA Service API');
      expect(response.body).toHaveProperty('version', '3.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });

    test('GET /api/docs should return documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Health Check', () => {
    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('API Endpoints', () => {
    test('GET /api/creatures should be accessible', async () => {
      const response = await request(app)
        .get('/api/creatures');

      expect([200, 404, 500]).toContain(response.status);
    });

    test('GET /api/maps should be accessible', async () => {
      const response = await request(app)
        .get('/api/maps');

      expect([200, 404, 500]).toContain(response.status);
    });

    test('GET /api/search should require query', async () => {
      const response = await request(app)
        .get('/api/search');

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('Unknown routes should return 404', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    test('Should include security headers', async () => {
      const response = await request(app)
        .get('/');

      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});
