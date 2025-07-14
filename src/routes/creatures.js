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
const mockCreatures = [
  {
    id: 1,
    name: 'Rex',
    slug: 'rex',
    temperament: 'aggressive',
    is_tameable: true,
    is_rideable: true,
    health: 1700,
    stamina: 420,
    food: 3000,
    weight: 500,
    melee_damage: 62
  },
  {
    id: 2,
    name: 'Dodo',
    slug: 'dodo', 
    temperament: 'passive',
    is_tameable: true,
    is_rideable: false,
    health: 40,
    stamina: 100,
    food: 450,
    weight: 50,
    melee_damage: 5
  },
  {
    id: 3,
    name: 'Argentavis',
    slug: 'argentavis',
    temperament: 'short-tempered',
    is_tameable: true,
    is_rideable: true,
    health: 365,
    stamina: 400,
    food: 2000,
    weight: 400,
    melee_damage: 25
  }
];

// Creatures API endpoints
router.get('/', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { page = 1, limit = 20, tameable, rideable, temperament, sort } = req.query;
  
  // If no database connection, return mock data
  if (!db) {
    let data = [...mockCreatures];
    
    // Apply filters
    if (tameable !== undefined) {
      data = data.filter(creature => creature.is_tameable === (tameable === 'true'));
    }
    
    if (rideable !== undefined) {
      data = data.filter(creature => creature.is_rideable === (rideable === 'true'));
    }
    
    if (temperament) {
      data = data.filter(creature => 
        creature.temperament && creature.temperament.toLowerCase() === temperament.toLowerCase()
      );
    }
    
    // Apply sorting
    if (sort) {
      data.sort((a, b) => {
        switch (sort) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'health':
            return (b.health || 0) - (a.health || 0);
          case 'damage':
            return (b.melee_damage || 0) - (a.melee_damage || 0);
          default:
            return 0;
        }
      });
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

  // Database query when database is available
  const offset = (page - 1) * limit;

  let countQuery = 'SELECT COUNT(*) FROM creatures WHERE 1=1';
  let dataQuery = 'SELECT * FROM creatures WHERE 1=1';
  const params = [];

  if (tameable !== undefined) {
    const condition = ` AND is_tameable = $${params.length + 1}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(tameable === 'true');
  }

  if (rideable !== undefined) {
    const condition = ` AND is_rideable = $${params.length + 1}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(rideable === 'true');
  }

  if (temperament) {
    const condition = ` AND LOWER(temperament) = LOWER($${params.length + 1})`;
    countQuery += condition;
    dataQuery += condition;
    params.push(temperament);
  }

  // Add sorting
  let orderClause = ' ORDER BY name';
  if (sort) {
    switch (sort) {
      case 'name':
        orderClause = ' ORDER BY name';
        break;
      case 'health':
        orderClause = ' ORDER BY base_health DESC';
        break;
      case 'damage':
        orderClause = ' ORDER BY base_damage DESC';
        break;
    }
  }

  dataQuery += orderClause + ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    const creature = mockCreatures.find(c => c.slug === slug);
    if (!creature) {
      return res.status(404).json({
        success: false,
        error: 'Creature not found'
      });
    }
    
    return res.json({
      success: true,
      data: creature,
      message: 'Using mock data - database not connected'
    });
  }

  try {
    const result = await db.query('SELECT * FROM creatures WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Creature not found'
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
