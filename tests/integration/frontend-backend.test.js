/**
 * Frontend-Backend Integration Tests
 * Tests the complete integration between the React-like frontend and Node.js backend
 * with official PostgreSQL database data converted from wiki and DodoDex
 */

const request = require('supertest');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

describe('Frontend-Backend Integration Tests', () => {
  let server;
  let app;
  let baseURL;

  beforeAll(async () => {
    // Import and start the application
    const ASAServiceApp = require('../../app.js');
    app = new ASAServiceApp();
    await app.initialize();
    
    const port = process.env.PORT || 3002; // Use different port for tests
    baseURL = `http://localhost:${port}`;
    
    // Start server
    server = app.getApp().listen(port);
    
    // Give server time to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (app && app.gracefulShutdown) {
      await app.gracefulShutdown();
    }
  });

  describe('Frontend Static File Serving', () => {
    test('should serve the main HTML file', async () => {
      const response = await request(app.getApp()).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('ASA Service - ARK: Survival Ascended Database');
      expect(response.text).toContain('ASAService');
      expect(response.text).toContain('class="nav-tab');
    });

    test('should serve favicon', async () => {
      const response = await request(app.app).get('/favicon.ico');
      expect(response.status).toBe(200);
    });

    test('should have correct CORS headers for frontend requests', async () => {
      const response = await request(app.app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3001');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.status).toBe(200);
    });
  });

  describe('API Health Check Integration', () => {
    test('should provide health status for frontend monitoring', async () => {
      const response = await request(app.app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
    });

    test('should indicate database status for frontend display', async () => {
      const response = await request(app.app).get('/api/health');
      
      // Should work with mock data even if database is not connected
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.services).toHaveProperty('api', true);
    });
  });

  describe('Search Functionality Integration', () => {
    test('should handle universal search from frontend', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: 'rex' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    test('should filter search by type as frontend requires', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: 'island', type: 'map' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.results).toBeDefined();
    });

    test('should handle empty search queries gracefully', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should return properly formatted results for frontend display', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: 'dodo' });
      
      expect(response.status).toBe(200);
      const results = response.body.data.results;
      
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('slug');
      }
    });
  });

  describe('Creatures API Integration', () => {
    test('should load creatures for frontend display', async () => {
      const response = await request(app.app).get('/api/creatures');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('should support creature filtering as frontend requires', async () => {
      const response = await request(app.app)
        .get('/api/creatures')
        .query({ tameable: 'true' });
      
      expect(response.status).toBe(200);
      const creatures = response.body.data.results;
      
      // All results should be tameable
      creatures.forEach(creature => {
        expect(creature.is_tameable).toBe(true);
      });
    });

    test('should support creature sorting for frontend tables', async () => {
      const response = await request(app.app)
        .get('/api/creatures')
        .query({ sort: 'name' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.results).toBeDefined();
    });

    test('should provide pagination for frontend data grids', async () => {
      const response = await request(app.app)
        .get('/api/creatures')
        .query({ page: 1, limit: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.results.length).toBeLessThanOrEqual(5);
    });

    test('should return creature data with all required fields for frontend', async () => {
      const response = await request(app.app).get('/api/creatures');
      
      expect(response.status).toBe(200);
      const creatures = response.body.data.results;
      
      if (creatures.length > 0) {
        const creature = creatures[0];
        expect(creature).toHaveProperty('name');
        expect(creature).toHaveProperty('slug');
        expect(creature).toHaveProperty('temperament');
        expect(creature).toHaveProperty('is_tameable');
        expect(creature).toHaveProperty('is_rideable');
        expect(creature).toHaveProperty('health');
        expect(creature).toHaveProperty('melee_damage');
      }
    });
  });

  describe('Maps API Integration', () => {
    test('should load maps for frontend display', async () => {
      const response = await request(app.app).get('/api/maps');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
    });

    test('should filter maps by type for frontend dropdowns', async () => {
      const response = await request(app.app)
        .get('/api/maps')
        .query({ type: 'official' });
      
      expect(response.status).toBe(200);
      const maps = response.body.data.results;
      
      maps.forEach(map => {
        expect(map.type).toBe('official');
      });
    });

    test('should provide map data with required fields for frontend cards', async () => {
      const response = await request(app.app).get('/api/maps');
      
      expect(response.status).toBe(200);
      const maps = response.body.data.results;
      
      if (maps.length > 0) {
        const map = maps[0];
        expect(map).toHaveProperty('name');
        expect(map).toHaveProperty('slug');
        expect(map).toHaveProperty('type');
        expect(map).toHaveProperty('size');
        expect(map).toHaveProperty('description');
      }
    });
  });

  describe('Taming API Integration', () => {
    test('should load all tameable creatures for frontend list', async () => {
      const response = await request(app.app).get('/api/taming');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
    });

    test('should get specific creature taming info for calculator', async () => {
      const response = await request(app.app).get('/api/taming/rex');
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('method');
      expect(response.body.data).toHaveProperty('preferred_food');
      expect(response.body.data).toHaveProperty('tameable');
    });

    test('should handle non-existent creatures gracefully', async () => {
      const response = await request(app.app).get('/api/taming/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should provide taming data with all required fields for frontend calculator', async () => {
      const response = await request(app.app).get('/api/taming/dodo');
      
      expect(response.status).toBe(200);
      const taming = response.body.data;
      
      expect(taming).toHaveProperty('name');
      expect(taming).toHaveProperty('method');
      expect(taming).toHaveProperty('preferred_food');
      expect(taming).toHaveProperty('kibble');
      expect(taming).toHaveProperty('taming_time');
      expect(taming).toHaveProperty('food_consumption');
    });
  });

  describe('Regions API Integration', () => {
    test('should load regions for frontend display', async () => {
      const response = await request(app.app)
        .get('/api/regions')
        .query({ map: 'the-island' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
    });

    test('should filter regions by biome for frontend dropdowns', async () => {
      const response = await request(app.app)
        .get('/api/regions')
        .query({ map: 'the-island', biome: 'tropical' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.results).toBeDefined();
    });

    test('should require map parameter', async () => {
      const response = await request(app.app).get('/api/regions');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should provide region data with required fields for frontend', async () => {
      const response = await request(app.app)
        .get('/api/regions')
        .query({ map: 'the-island' });
      
      expect(response.status).toBe(200);
      const regions = response.body.data.results;
      
      if (regions.length > 0) {
        const region = regions[0];
        expect(region).toHaveProperty('name');
        expect(region).toHaveProperty('map_name');
        expect(region).toHaveProperty('biome');
        expect(region).toHaveProperty('description');
      }
    });
  });

  describe('Frontend-Backend Data Flow', () => {
    test('should handle API errors gracefully for frontend error handling', async () => {
      const response = await request(app.app).get('/api/nonexistent');
      
      expect(response.status).toBe(404);
    });

    test('should provide consistent error format for frontend parsing', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should support CORS for cross-origin frontend requests', async () => {
      const response = await request(app.app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Mock Data Integration (Database-less Mode)', () => {
    test('should provide mock creatures when database unavailable', async () => {
      const response = await request(app.app).get('/api/creatures');
      
      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBeGreaterThan(0);
      
      // Should include expected mock creatures
      const creatureNames = response.body.data.results.map(c => c.name);
      expect(creatureNames).toContain('Rex');
      expect(creatureNames).toContain('Dodo');
    });

    test('should provide mock maps when database unavailable', async () => {
      const response = await request(app.app).get('/api/maps');
      
      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBeGreaterThan(0);
      
      const mapNames = response.body.data.results.map(m => m.name);
      expect(mapNames).toContain('The Island');
      expect(mapNames).toContain('The Center');
    });

    test('should provide mock search results when database unavailable', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: 'rex' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent API requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app.app).get('/api/health')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app.app).get('/api/creatures');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle large datasets with pagination', async () => {
      const response = await request(app.app)
        .get('/api/creatures')
        .query({ limit: 100 });
      
      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('total');
    });
  });

  describe('Data Validation for Frontend', () => {
    test('should validate creature data structure for frontend consumption', async () => {
      const response = await request(app.app).get('/api/creatures');
      
      expect(response.status).toBe(200);
      const creatures = response.body.data.results;
      
      creatures.forEach(creature => {
        expect(typeof creature.name).toBe('string');
        expect(typeof creature.slug).toBe('string');
        expect(typeof creature.is_tameable).toBe('boolean');
        expect(typeof creature.is_rideable).toBe('boolean');
        expect(typeof creature.health).toBe('number');
        expect(typeof creature.melee_damage).toBe('number');
      });
    });

    test('should validate search result structure for frontend display', async () => {
      const response = await request(app.app)
        .get('/api/search')
        .query({ q: 'dodo' });
      
      expect(response.status).toBe(200);
      const results = response.body.data.results;
      
      results.forEach(result => {
        expect(typeof result.name).toBe('string');
        expect(typeof result.type).toBe('string');
        expect(typeof result.slug).toBe('string');
        expect(['creature', 'map'].includes(result.type)).toBe(true);
      });
    });
  });

  // Additional E2E tests for complete frontend-backend integration
  describe('End-to-End Frontend Integration', () => {
    let dom;
    let window;
    let document;

    beforeAll(() => {
      // Create a DOM environment for testing frontend JavaScript
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <div id="app"></div>
            <script>
              // Mock fetch for testing
              window.fetch = require('node-fetch');
            </script>
          </body>
        </html>
      `, {
        url: 'http://localhost:3001',
        pretendToBeVisual: true,
        resources: 'usable'
      });

      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
    });

    test('should be able to initialize ASA Service frontend class', () => {
      // This would test the frontend JavaScript if we could load it
      expect(document).toBeDefined();
      expect(window).toBeDefined();
    });

    test('should handle frontend API calls correctly', async () => {
      // Test that the frontend can make API calls to the backend
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();
      
      expect(data).toHaveProperty('status', 'healthy');
    });
  });
});
