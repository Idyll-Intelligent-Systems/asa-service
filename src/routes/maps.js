const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get database connection or return null if not available
const getDb = (req) => {
  return req.app.locals.db || null;
};

// Mock data for when database is not available
const mockMaps = [
  {
    id: 1,
    name: 'The Island',
    slug: 'the-island',
    type: 'official',
    size: 'large',
    description: 'The original ARK map with diverse biomes'
  },
  {
    id: 2,
    name: 'The Center',
    slug: 'the-center',
    type: 'official',
    size: 'large',
    description: 'A large map with a massive floating island in the center'
  },
  {
    id: 3,
    name: 'Ragnarok',
    slug: 'ragnarok',
    type: 'official',
    size: 'large',
    description: 'A massive map with varied terrain and unique features'
  },
  {
    id: 4,
    name: 'Crystal Isles',
    slug: 'crystal-isles',
    type: 'official',
    size: 'large',
    description: 'A mystical map featuring floating islands and crystal formations'
  }
];

router.get('/', asyncHandler(async(req, res) => {
  const db = getDb(req);
  
  // If no database connection, return mock data
  if (!db) {
    const { page = 1, limit = 20, type } = req.query;
    let data = [...mockMaps];
    
    // Apply filters
    if (type) {
      data = data.filter(map => map.type === type);
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

  // Database query
  const { page = 1, limit = 20, type } = req.query;
  const offset = (page - 1) * limit;

  let countQuery = 'SELECT COUNT(*) FROM maps WHERE 1=1';
  let dataQuery = 'SELECT * FROM maps WHERE 1=1';
  const params = [];

  if (type) {
    const condition = ` AND type = $${params.length + 1}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(type);
  }

  dataQuery += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  try {
    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, params.slice(0, -2)),
      db.query(dataQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        results: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
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

router.get('/:slug', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { slug } = req.params;
  
  // If no database connection, return mock data
  if (!db) {
    const map = mockMaps.find(m => m.slug === slug);
    if (!map) {
      return res.status(404).json({
        success: false,
        error: 'Map not found'
      });
    }
    
    return res.json({
      success: true,
      data: map,
      message: 'Using mock data - database not connected'
    });
  }

  try {
    const result = await db.query('SELECT * FROM maps WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Map not found'
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

module.exports = router;
