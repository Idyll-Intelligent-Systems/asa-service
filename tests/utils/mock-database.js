// Mock database for tests that don't require actual PostgreSQL
class MockDatabase {
  constructor() {
    this.data = {
      maps: [],
      creatures: [],
      regions: [],
      creature_stats: [],
      map_regions: []
    };
    this.lastInsertId = 1;
  }

  async query(text, params = []) {
    // Simulate database operations for common queries
    const sql = text.toLowerCase().trim();
    
    // Handle SELECT queries
    if (sql.startsWith('select')) {
      if (sql.includes('from maps')) {
        if (sql.includes('where slug')) {
          const slug = params[0];
          return { rows: this.data.maps.filter(m => m.slug === slug) };
        }
        return { rows: this.data.maps };
      }
      
      if (sql.includes('from creatures')) {
        if (sql.includes('where slug')) {
          const slug = params[0];
          return { rows: this.data.creatures.filter(c => c.slug === slug) };
        }
        if (sql.includes('where') && sql.includes('name')) {
          const searchTerm = params[0] || '';
          const results = this.data.creatures.filter(c => 
            c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return { rows: results };
        }
        return { rows: this.data.creatures };
      }
      
      if (sql.includes('from regions') || sql.includes('from map_regions')) {
        if (sql.includes('join') && sql.includes('maps')) {
          // Complex join query
          const regions = this.data.map_regions.map(region => {
            const map = this.data.maps.find(m => m.id === region.map_id);
            return {
              ...region,
              map_name: map ? map.name : null,
              category: region.category || 'unknown'
            };
          });
          return { rows: regions };
        }
        return { rows: this.data.map_regions };
      }
      
      if (sql.includes('from creature_stats')) {
        if (sql.includes('join') && sql.includes('creatures')) {
          // Join with creatures table
          const stats = this.data.creature_stats.map(stat => {
            const creature = this.data.creatures.find(c => c.id === stat.creature_id);
            return {
              ...stat,
              creature_name: creature ? creature.name : null
            };
          });
          return { rows: stats };
        }
        return { rows: this.data.creature_stats };
      }
      
      // Default health check
      if (sql.includes('select now()') || sql.includes('select 1')) {
        return { rows: [{ now: new Date() }] };
      }
      
      return { rows: [] };
    }

    // Handle INSERT queries
    if (sql.startsWith('insert')) {
      const id = this.lastInsertId++;
      
      if (sql.includes('into maps')) {
        // Check for unique constraint on slug
        const slug = params[1];
        if (this.data.maps.some(m => m.slug === slug)) {
          const error = new Error('duplicate key value violates unique constraint');
          error.code = '23505';
          throw error;
        }
        
        const map = {
          id,
          name: params[0],
          slug: params[1],
          official: params[2],
          expansion: params[3],
          release_date: params[4],
          size_km: params[5],
          description: params[6],
          created_at: new Date(),
          updated_at: new Date()
        };
        this.data.maps.push(map);
        return { rows: [{ id }], rowCount: 1 };
      }
      
      if (sql.includes('into creatures')) {
        const creature = {
          id,
          name: params[0],
          slug: params[1],
          image_url: params[2] || null,
          description: params[3] || null,
          tameable: params[4] !== undefined ? params[4] : true,
          taming_method: params[5] || null,
          created_at: new Date(),
          updated_at: new Date()
        };
        this.data.creatures.push(creature);
        return { rows: [{ id }], rowCount: 1 };
      }
      
      if (sql.includes('into map_regions')) {
        // Check foreign key constraint
        const mapId = params[0];
        if (!this.data.maps.some(m => m.id === mapId)) {
          const error = new Error('violates foreign key constraint');
          error.code = '23503';
          throw error;
        }
        
        const region = {
          id,
          map_id: params[0],
          name: params[1],
          category: params[2] || 'unknown',
          description: params[3] || null,
          created_at: new Date(),
          updated_at: new Date()
        };
        this.data.map_regions.push(region);
        return { rows: [{ id }], rowCount: 1 };
      }
      
      if (sql.includes('into creature_stats')) {
        // Check foreign key constraint
        const creatureId = params[0];
        if (!this.data.creatures.some(c => c.id === creatureId)) {
          const error = new Error('violates foreign key constraint');
          error.code = '23503';
          throw error;
        }
        
        const stats = {
          id,
          creature_id: params[0],
          stat_name: params[1],
          base_value: params[2],
          per_level_wild: params[3],
          per_level_tamed: params[4],
          created_at: new Date(),
          updated_at: new Date()
        };
        this.data.creature_stats.push(stats);
        return { rows: [{ id }], rowCount: 1 };
      }
      
      return { rows: [{ id }], rowCount: 1 };
    }

    // Handle DELETE queries
    if (sql.startsWith('delete')) {
      return { rowCount: 1 };
    }

    // Handle UPDATE queries
    if (sql.startsWith('update')) {
      return { rowCount: 1 };
    }

    // Handle CREATE/DROP/ALTER (schema operations)
    if (sql.startsWith('create') || sql.startsWith('drop') || sql.startsWith('alter')) {
      return { rows: [], rowCount: 0 };
    }

    // Handle EXPLAIN queries for index performance tests
    if (sql.startsWith('explain')) {
      return {
        rows: [{
          'QUERY PLAN': [{
            Plan: {
              'Node Type': 'Index Scan',
              'Index Name': 'creatures_slug_idx'
            }
          }]
        }]
      };
    }

    // Default response
    return { rows: [], rowCount: 0 };
  }

  async end() {
    // Mock cleanup
    return Promise.resolve();
  }

  // Mock connection check
  async connect() {
    return Promise.resolve();
  }

  // Clear data for test isolation
  clearData() {
    this.data = {
      maps: [],
      creatures: [],
      regions: [],
      creature_stats: [],
      map_regions: []
    };
    this.lastInsertId = 1;
  }
}

// Factory function to create mock pool
function createMockPool() {
  const mockDb = new MockDatabase();
  
  return {
    query: mockDb.query.bind(mockDb),
    end: mockDb.end.bind(mockDb),
    connect: mockDb.connect.bind(mockDb),
    clearData: mockDb.clearData.bind(mockDb),
    on: () => {},
    removeListener: () => {}
  };
}

module.exports = { MockDatabase, createMockPool };
