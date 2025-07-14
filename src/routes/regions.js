const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get database connection or return null if not available
const getDb = (req) => {
  return req.app.locals.db || null;
};

// Mock region data for when database is not available
const mockRegions = [
  {
    id: 1,
    name: 'Tropical Island South',
    map_id: 1,
    map_name: 'The Island',
    map_slug: 'the-island',
    biome: 'tropical',
    description: 'Southern tropical beaches with abundant resources'
  },
  {
    id: 2,
    name: 'Snowy Mountains',
    map_id: 1,
    map_name: 'The Island',
    map_slug: 'the-island',
    biome: 'snow',
    description: 'Dangerous snowy peaks with rare resources'
  },
  {
    id: 3,
    name: 'Volcano',
    map_id: 1,
    map_name: 'The Island',
    map_slug: 'the-island',
    biome: 'volcanic',
    description: 'Dangerous volcanic region with obsidian and metal'
  },
  {
    id: 4,
    name: 'Desert Dunes',
    map_id: 2,
    map_name: 'Scorched Earth',
    map_slug: 'scorched-earth',
    biome: 'desert',
    description: 'Vast desert with sandstorms and rare resources'
  },
  {
    id: 5,
    name: 'World Scar',
    map_id: 2,
    map_name: 'Scorched Earth',
    map_slug: 'scorched-earth',
    biome: 'canyon',
    description: 'Dangerous canyon home to wyverns'
  },
  {
    id: 6,
    name: 'Fertile Chamber',
    map_id: 3,
    map_name: 'Aberration',
    map_slug: 'aberration',
    biome: 'underground',
    description: 'Safe underground area with mushroom trees'
  },
  {
    id: 7,
    name: 'The Surface',
    map_id: 3,
    map_name: 'Aberration',
    map_slug: 'aberration',
    biome: 'radiation',
    description: 'Irradiated surface area extremely dangerous'
  },
  {
    id: 8,
    name: 'Sanctuary',
    map_id: 4,
    map_name: 'Extinction',
    map_slug: 'extinction',
    biome: 'city',
    description: 'Safe central dome with advanced technology'
  },
  {
    id: 9,
    name: 'Wasteland',
    map_id: 4,
    map_name: 'Extinction',
    map_slug: 'extinction',
    biome: 'corrupted',
    description: 'Corrupted wasteland with element veins'
  }
];

// Regions API endpoints
router.get('/:id', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  // If no database connection, return mock data
  if (!db) {
    const region = mockRegions.find(r => r.id === parseInt(id));
    if (!region) {
      return res.status(404).json({
        success: false,
        error: `Region with id '${id}' not found`
      });
    }
    
    return res.json({
      success: true,
      data: region,
      message: 'Using mock data - database not connected'
    });
  }

  try {
    const result = await db.query(`
      SELECT mr.*, m.name as map_name, m.slug as map_slug
      FROM map_regions mr
      JOIN maps m ON mr.map_id = m.id
      WHERE mr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Region with id '${id}' not found`
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Database query failed'
    });
  }
}));

// Get all regions
router.get('/', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { map_id, map, biome, page = 1, limit = 20 } = req.query;

  // Require either map_id or map parameter
  if (!map_id && !map) {
    return res.status(400).json({
      success: false,
      error: 'Map parameter is required. Please provide either map_id or map parameter.',
      example: '/api/regions?map=the-island'
    });
  }

  // If no database connection, return mock data
  if (!db) {
    let data = [...mockRegions];
    
    // Apply filters
    if (map_id) {
      data = data.filter(region => region.map_id === parseInt(map_id));
    }
    
    if (map) {
      data = data.filter(region => region.map_slug === map || region.map_name.toLowerCase() === map.toLowerCase());
    }
    
    if (biome) {
      data = data.filter(region => region.biome && region.biome.toLowerCase() === biome.toLowerCase());
    }
    
    // Pagination
    const total = data.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    data = data.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: {
        results: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: 'Using mock data - database not connected'
    });
  }

  try {
    let query = `
      SELECT mr.*, m.name as map_name, m.slug as map_slug
      FROM map_regions mr
      JOIN maps m ON mr.map_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (map_id) {
      query += ` AND mr.map_id = $${params.length + 1}`;
      params.push(map_id);
    }

    if (map) {
      query += ` AND (m.slug = $${params.length + 1} OR LOWER(m.name) = LOWER($${params.length + 1}))`;
      params.push(map);
    }

    if (biome) {
      query += ` AND LOWER(mr.biome) = LOWER($${params.length + 1})`;
      params.push(biome);
    }

    query += ` ORDER BY m.name, mr.name`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        results: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length,
          pages: Math.ceil(result.rows.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Database query failed'
    });
  }
}));

module.exports = router;
