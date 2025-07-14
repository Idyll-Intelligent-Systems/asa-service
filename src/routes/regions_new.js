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

  // If no database connection, return mock data
  if (!db) {
    return res.json({
      success: true,
      data: mockRegions,
      message: 'Using mock data - database not connected'
    });
  }

  try {
    const result = await db.query(`
      SELECT mr.*, m.name as map_name, m.slug as map_slug
      FROM map_regions mr
      JOIN maps m ON mr.map_id = m.id
      ORDER BY m.name, mr.name
    `);

    res.json({
      success: true,
      data: result.rows
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
