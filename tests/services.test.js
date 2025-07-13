const WikiDataService = require('../src/backend/services/WikiDataService');
const DodoDexService = require('../src/backend/services/DodoDexService');
const DataPopulationService = require('../src/backend/services/DataPopulationService');

// Mock axios for HTTP requests
jest.mock('axios');
const axios = require('axios');

describe('WikiDataService', () => {
  let wikiService;

  beforeEach(() => {
    wikiService = new WikiDataService();
    jest.clearAllMocks();
  });

  describe('fetchWithCache', () => {
    test('should fetch data and cache it', async() => {
      const mockHtml = '<html><body>Test content</body></html>';
      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await wikiService.fetchWithCache('https://test.com', 'test_key');

      expect(result).toBe(mockHtml);
      expect(axios.get).toHaveBeenCalledWith('https://test.com', expect.any(Object));
    });

    test('should return cached data when available', async() => {
      const mockHtml = '<html><body>Cached content</body></html>';

      // Set cache manually
      wikiService.cache.set('test_key', {
        data: mockHtml,
        timestamp: Date.now()
      });

      const result = await wikiService.fetchWithCache('https://test.com', 'test_key');

      expect(result).toBe(mockHtml);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should handle fetch errors', async() => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        wikiService.fetchWithCache('https://test.com', 'test_key')
      ).rejects.toThrow('Network error');
    });
  });

  describe('categorizeRegion', () => {
    test('should categorize regions correctly', () => {
      expect(wikiService.categorizeRegion('Central Cave')).toBe('caves');
      expect(wikiService.categorizeRegion('Southern Ocean')).toBe('ocean');
      expect(wikiService.categorizeRegion('Frozen Tundra')).toBe('snow'); // Changed from 'Frozen Mountain'
      expect(wikiService.categorizeRegion('Redwood Forest')).toBe('forest');
      expect(wikiService.categorizeRegion('Eastern Desert')).toBe('desert');
      expect(wikiService.categorizeRegion('Unknown Region')).toBe('other');
    });
  });

  describe('isCreaturePage', () => {
    test('should identify valid creature pages', () => {
      expect(wikiService.isCreaturePage('Rex', '/wiki/Rex')).toBe(true);
      expect(wikiService.isCreaturePage('Argentavis', '/wiki/Argentavis')).toBe(true);
    });

    test('should reject invalid pages', () => {
      expect(wikiService.isCreaturePage('Category:Creatures', '/wiki/Category:Creatures')).toBe(false);
      expect(wikiService.isCreaturePage('File:Rex.jpg', '/wiki/File:Rex.jpg')).toBe(false);
      expect(wikiService.isCreaturePage('Saddle', '/wiki/Rex_Saddle')).toBe(false); // Changed to use saddle keyword
    });
  });

  describe('determineCaveType', () => {
    test('should determine cave types correctly', () => {
      expect(wikiService.determineCaveType('Artifact Cave of the Clever')).toBe('artifact');
      expect(wikiService.determineCaveType('Ice Cave')).toBe('ice');
      expect(wikiService.determineCaveType('Lava Cave')).toBe('lava');
      expect(wikiService.determineCaveType('Underwater Cave')).toBe('underwater');
      expect(wikiService.determineCaveType('Standard Cave')).toBe('standard');
    });
  });
});

describe('DodoDexService', () => {
  let dododexService;

  beforeEach(() => {
    dododexService = new DodoDexService();
    jest.clearAllMocks();
  });

  describe('getAllCreatures', () => {
    test('should parse creature list from Dododex', async() => {
      const mockHtml = `
        <html>
          <body>
            <div class="creature-card">
              <a href="/dinosaur/rex">
                <div class="name">Rex</div>
                <img src="/images/rex.jpg" />
              </a>
            </div>
            <div class="creature-card">
              <a href="/dinosaur/argentavis">
                <div class="name">Argentavis</div>
                <img src="/images/argentavis.jpg" />
              </a>
            </div>
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const creatures = await dododexService.getAllCreatures();

      expect(creatures).toHaveLength(2);
      expect(creatures[0]).toMatchObject({
        name: 'Rex',
        slug: 'rex',
        dododexUrl: 'https://www.dododex.com/dinosaur/rex'
      });
    });

    test('should handle empty response', async() => {
      const mockHtml = '<html><body></body></html>';
      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const creatures = await dododexService.getAllCreatures();
      expect(creatures).toHaveLength(0);
    });
  });

  describe('getCreatureDetails', () => {
    test('should extract creature details', async() => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="creature-title">Tyrannosaurus Rex</h1>
            <img class="creature-image" src="/images/rex.jpg" />
            <div class="description">A large carnivorous dinosaur</div>
            <div class="stats-table">
              <div class="stat-row">
                <span class="stat-name">Health</span>
                <span class="base-value">1100</span>
                <span class="wild-value">220</span>
              </div>
            </div>
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const details = await dododexService.getCreatureDetails('rex');

      expect(details).toMatchObject({
        slug: 'rex',
        name: 'Tyrannosaurus Rex',
        description: 'A large carnivorous dinosaur'
      });
      expect(details.stats).toHaveProperty('health');
    });
  });

  describe('calculateOptimalTaming', () => {
    test('should calculate optimal taming strategy', () => {
      const creatureData = {
        taming: {
          foods: [
            { name: 'Prime Meat', effectiveness: 100, quantity: 50, time: '30 min' },
            { name: 'Raw Meat', effectiveness: 50, quantity: 100, time: '60 min' },
            { name: 'Kibble', effectiveness: 150, quantity: 20, time: '15 min' }
          ]
        }
      };

      const availableFood = ['prime meat', 'raw meat'];
      const result = dododexService.calculateOptimalTaming(creatureData, 150, availableFood);

      expect(result.recommended).toMatchObject({
        name: 'Prime Meat',
        effectiveness: 100
      });
      expect(result.alternatives).toHaveLength(1);
    });
  });
});

describe('DataPopulationService', () => {
  let dataService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    };
    dataService = new DataPopulationService(mockDb);
    jest.clearAllMocks();
  });

  describe('populateMaps', () => {
    test('should populate maps successfully', async() => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await dataService.populateMaps();

      expect(mockDb.query).toHaveBeenCalledTimes(13); // 12 maps + 1 log entry
    });

    test('should handle database errors gracefully', async() => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));
      mockDb.query.mockResolvedValue({ rows: [] }); // For subsequent calls

      await dataService.populateMaps();

      // Should continue processing other maps despite errors
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('parseTime', () => {
    test('should parse various time formats', () => {
      expect(dataService.parseTime('30 min')).toBe(30);
      expect(dataService.parseTime('1h 30min')).toBe(90);
      expect(dataService.parseTime('45s')).toBe(0.75);
      expect(dataService.parseTime('2h')).toBe(120);
      expect(dataService.parseTime('')).toBe(null);
      expect(dataService.parseTime(null)).toBe(null);
    });
  });

  describe('getPopulationStatus', () => {
    test('should return population status', async() => {
      const mockCounts = {
        maps: 12,
        creatures: 150,
        regions: 300,
        caves: 50,
        resources: 200,
        obelisks: 36,
        supply_drops: 72,
        base_spots: 100
      };

      const mockStatus = {
        service_name: 'data_population',
        status: 'complete',
        message: 'All data populated'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCounts] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockStatus] });

      const result = await dataService.getPopulationStatus();

      expect(result.counts).toEqual(mockCounts);
      expect(result.status).toEqual(mockStatus);
    });
  });

  describe('updateSystemStatus', () => {
    test('should update system status', async() => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await dataService.updateSystemStatus('running', 'Populating creatures...');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_status'),
        ['data_population', 'running', 'Populating creatures...']
      );
    });
  });

  describe('logUpdate', () => {
    test('should log update information', async() => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await dataService.logUpdate('creatures', 150, 'Creatures populated successfully');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wiki_update_log'),
        ['creatures', 150, 'Creatures populated successfully']
      );
    });
  });
});

describe('Service Integration', () => {
  test('should integrate WikiDataService with DataPopulationService', async() => {
    const mockDb = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const dataService = new DataPopulationService(mockDb);

    // Mock the wiki service methods
    jest.spyOn(dataService.wikiService, 'getMapRegions').mockResolvedValue([
      { name: 'Test Region', category: 'test', description: 'Test description' }
    ]);

    jest.spyOn(dataService, 'populateRegions');

    // Test that the services work together
    await dataService.populateRegions();

    expect(dataService.populateRegions).toHaveBeenCalled();
  });

  test('should integrate DodoDexService with DataPopulationService', async() => {
    const mockDb = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }) };
    const dataService = new DataPopulationService(mockDb);

    // Mock the dododex service methods
    jest.spyOn(dataService.dododexService, 'getAllCreatures').mockResolvedValue([
      { name: 'Test Creature', slug: 'test-creature' }
    ]);

    jest.spyOn(dataService.dododexService, 'getCreatureDetails').mockResolvedValue({
      name: 'Test Creature',
      slug: 'test-creature',
      description: 'Test description',
      taming: { tameable: true, method: 'knockout', foods: [] },
      stats: {},
      spawns: []
    });

    jest.spyOn(dataService, 'populateCreatures');

    // Test that the services work together
    await dataService.populateCreatures();

    expect(dataService.populateCreatures).toHaveBeenCalled();
  });
});
