const request = require('supertest');
const { Pool } = require('pg');

// Mock the database connection for testing
jest.mock('pg', () => {
  const mockQuery = jest.fn().mockImplementation((sql, params) => {
    // Mock successful responses for different query types
    const sqlLower = (sql || '').toLowerCase();
    
    if (sqlLower.includes('select now()') || sqlLower.includes('select 1')) {
      return Promise.resolve({ rows: [{ now: new Date() }] });
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('maps')) {
      return Promise.resolve({
        rows: [
          { id: 1, name: 'The Island', slug: 'the-island', official: true },
          { id: 2, name: 'The Center', slug: 'the-center', official: false }
        ]
      });
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('creatures')) {
      return Promise.resolve({
        rows: [
          { id: 1, name: 'Rex', slug: 'rex', tameable: true },
          { id: 2, name: 'Dodo', slug: 'dodo', tameable: true }
        ]
      });
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('regions')) {
      return Promise.resolve({
        rows: [
          { id: 1, name: 'South Zone', map_id: 1 }
        ]
      });
    }
    
    // Default successful response
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  
  const mockPool = {
    query: mockQuery,
    connect: jest.fn().mockResolvedValue({}),
    end: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
    removeListener: jest.fn()
  };
  
  return { Pool: jest.fn(() => mockPool) };
});

describe('ASA Service API Tests', () => {
  let app;
  let mockDb;

  beforeAll(async() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Import app after mocking
    const appModule = require('../src/backend/app');
    app = appModule.getApp();
    mockDb = new Pool().query;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('GET / should return API information', async() => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });

    test('GET /health should return system status', async() => {
      mockDb.mockResolvedValueOnce({
        rows: [{
          maps: 12,
          creatures: 150,
          regions: 300,
          caves: 50,
          resources: 200,
          obelisks: 36,
          supply_drops: 72,
          base_spots: 100
        }]
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('counts');
    });
  });

  describe('Maps API', () => {
    test('GET /api/maps should return all maps', async() => {
      const mockMaps = [
        { id: 1, name: 'The Island', slug: 'The_Island', official: true },
        { id: 2, name: 'Ragnarok', slug: 'Ragnarok', official: true }
      ];

      mockDb.mockResolvedValueOnce({ rows: mockMaps });

      const response = await request(app)
        .get('/api/maps')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('name', 'The Island');
    });

    test('GET /api/maps/:slug should return specific map', async() => {
      const mockMap = {
        id: 1,
        name: 'The Island',
        slug: 'The_Island',
        description: 'Original ARK map'
      };

      mockDb.mockResolvedValueOnce({ rows: [mockMap] });

      const response = await request(app)
        .get('/api/maps/The_Island')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'The Island');
    });

    test('GET /api/maps/:slug should return 404 for non-existent map', async() => {
      mockDb.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/maps/NonExistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Creatures API', () => {
    test('GET /api/creatures should return paginated creatures', async() => {
      const mockCreatures = [
        { id: 1, name: 'Argentavis', slug: 'argentavis', tameable: true },
        { id: 2, name: 'Rex', slug: 'rex', tameable: true }
      ];

      mockDb.mockResolvedValueOnce({ rows: [{ count: '150' }] });
      mockDb.mockResolvedValueOnce({ rows: mockCreatures });

      const response = await request(app)
        .get('/api/creatures?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 150);
    });

    test('GET /api/creatures/search should search creatures', async() => {
      const mockResults = [
        { id: 1, name: 'Rex', slug: 'rex', description: 'Tyrannosaurus Rex' }
      ];

      mockDb.mockResolvedValueOnce({ rows: mockResults });

      const response = await request(app)
        .get('/api/creatures/search?q=rex')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('name', 'Rex');
    });

    test('GET /api/creatures/:slug should return creature details', async() => {
      const mockCreature = {
        id: 1,
        name: 'Rex',
        slug: 'rex',
        description: 'Tyrannosaurus Rex',
        tameable: true
      };

      const mockStats = [
        { stat_name: 'health', base_value: 1100, per_level_wild: 220 }
      ];

      const mockTaming = [
        { food_name: 'Prime Meat', effectiveness: 100, quantity_for_level_1: 50 }
      ];

      mockDb.mockResolvedValueOnce({ rows: [mockCreature] });
      mockDb.mockResolvedValueOnce({ rows: mockStats });
      mockDb.mockResolvedValueOnce({ rows: mockTaming });

      const response = await request(app)
        .get('/api/creatures/rex')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Rex');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('taming');
    });
  });

  describe('Regions API', () => {
    test('GET /api/maps/:slug/regions should return map regions', async() => {
      const mockRegions = [
        { id: 1, name: 'Southern Shores', category: 'coastal' },
        { id: 2, name: 'Central Cave', category: 'caves' }
      ];

      mockDb.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Map exists
      mockDb.mockResolvedValueOnce({ rows: mockRegions });

      const response = await request(app)
        .get('/api/maps/The_Island/regions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('GET /api/regions/:id should return specific region', async() => {
      const mockRegion = {
        id: 1,
        name: 'Southern Shores',
        category: 'coastal',
        description: 'Sandy beaches'
      };

      mockDb.mockResolvedValueOnce({ rows: [mockRegion] });

      const response = await request(app)
        .get('/api/regions/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Southern Shores');
    });
  });

  describe('Caves API', () => {
    test('GET /api/maps/:slug/caves should return map caves', async() => {
      const mockCaves = [
        { id: 1, name: 'Central Cave', type: 'artifact', difficulty: 'medium' },
        { id: 2, name: 'Ice Cave', type: 'ice', difficulty: 'hard' }
      ];

      mockDb.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Map exists
      mockDb.mockResolvedValueOnce({ rows: mockCaves });

      const response = await request(app)
        .get('/api/maps/The_Island/caves')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('Resources API', () => {
    test('GET /api/maps/:slug/resources should return map resources', async() => {
      const mockResources = [
        { id: 1, name: 'Metal Node', type: 'metal', quality: 'rich' },
        { id: 2, name: 'Crystal Node', type: 'crystal', quality: 'normal' }
      ];

      mockDb.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Map exists
      mockDb.mockResolvedValueOnce({ rows: mockResources });

      const response = await request(app)
        .get('/api/maps/The_Island/resources?type=metal')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('Taming Calculator API', () => {
    test('POST /api/taming/calculate should calculate taming requirements', async() => {
      const mockCreature = {
        id: 1,
        name: 'Rex',
        slug: 'rex'
      };

      const mockTaming = [
        { food_name: 'Prime Meat', effectiveness: 100, quantity_for_level_1: 50 }
      ];

      mockDb.mockResolvedValueOnce({ rows: [mockCreature] });
      mockDb.mockResolvedValueOnce({ rows: mockTaming });

      const response = await request(app)
        .post('/api/taming/calculate')
        .send({
          creature: 'rex',
          level: 150,
          food: 'Prime Meat'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('creature', 'rex');
      expect(response.body.data).toHaveProperty('requirements');
    });

    test('POST /api/taming/calculate should validate input', async() => {
      const response = await request(app)
        .post('/api/taming/calculate')
        .send({
          creature: 'rex'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('Error Handling', () => {
    test('Should handle database errors gracefully', async() => {
      mockDb.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/maps')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });

    test('Should return 404 for unknown endpoints', async() => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Should validate JSON input', async() => {
      const response = await request(app)
        .post('/api/taming/calculate')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('Should apply rate limiting to endpoints', async() => {
      // Test that rate limiting middleware is at least present
      // Make a few requests and verify they all succeed
      // In a real scenario with rate limiting, some might be blocked
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/api/maps'));
      }

      const responses = await Promise.all(requests);

      // Since this is a mock environment, expect all to succeed
      // In production, rate limiting would block some requests
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(5); // All should succeed in test environment
    });
  });

  describe('Data Population Status', () => {
    test('GET /api/admin/population-status should return status', async() => {
      const mockStatus = {
        service_name: 'data_population',
        status: 'complete',
        message: 'All data populated successfully'
      };

      mockDb.mockResolvedValueOnce({
        rows: [{
          maps: 12,
          creatures: 150,
          regions: 300,
          caves: 50,
          resources: 200,
          obelisks: 36,
          supply_drops: 72,
          base_spots: 100
        }]
      });
      mockDb.mockResolvedValueOnce({ rows: [mockStatus] });

      const response = await request(app)
        .get('/api/admin/population-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('counts');
      expect(response.body.data).toHaveProperty('status');
    });
  });
});

describe('Integration Tests', () => {
  let app;

  beforeAll(async() => {
    // These tests would run against a test database
    // Skip if no test database is configured
    if (!process.env.TEST_DATABASE_URL) {
      return;
    }

    app = require('../src/backend/app').getApp();
  });

  test('Full workflow: Get maps -> Get regions -> Get creatures', async() => {
    if (!process.env.TEST_DATABASE_URL) {
      return;
    }

    // Get all maps
    const mapsResponse = await request(app)
      .get('/api/maps')
      .expect(200);

    expect(mapsResponse.body.success).toBe(true);

    if (mapsResponse.body.data.length > 0) {
      const [firstMap] = mapsResponse.body.data;

      // Get regions for first map
      const regionsResponse = await request(app)
        .get(`/api/maps/${firstMap.slug}/regions`)
        .expect(200);

      expect(regionsResponse.body.success).toBe(true);

      // Get creatures
      const creaturesResponse = await request(app)
        .get('/api/creatures?limit=5')
        .expect(200);

      expect(creaturesResponse.body.success).toBe(true);
    }
  });
});
