const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Search API endpoint
router.get('/', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { q, type, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 2 characters long'
    });
  }

  const results = {
    creatures: [],
    maps: [],
    regions: []
  };

  const searchTypes = type ? [type] : ['creatures', 'maps', 'regions'];

  if (searchTypes.includes('creatures')) {
    const creatureResults = await db.query(`
      SELECT 'creature' as type, slug, name, description
      FROM creatures 
      WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
      OR name ILIKE $2
      ORDER BY name
      LIMIT $3
    `, [q, `%${q}%`, Math.ceil(limit / searchTypes.length)]);

    results.creatures = creatureResults.rows;
  }

  if (searchTypes.includes('maps')) {
    const mapResults = await db.query(`
      SELECT 'map' as type, slug, name, description
      FROM maps 
      WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
      OR name ILIKE $2
      ORDER BY name
      LIMIT $3
    `, [q, `%${q}%`, Math.ceil(limit / searchTypes.length)]);

    results.maps = mapResults.rows;
  }

  if (searchTypes.includes('regions')) {
    const regionResults = await db.query(`
      SELECT 'region' as type, mr.id, mr.name, mr.description, m.slug as map_slug
      FROM map_regions mr
      JOIN maps m ON mr.map_id = m.id
      WHERE to_tsvector('english', mr.name || ' ' || COALESCE(mr.description, '')) @@ plainto_tsquery('english', $1)
      OR mr.name ILIKE $2
      ORDER BY mr.name
      LIMIT $3
    `, [q, `%${q}%`, Math.ceil(limit / searchTypes.length)]);

    results.regions = regionResults.rows;
  }

  res.json({
    success: true,
    query: q,
    results,
    total_results: Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
  });
}));

module.exports = router;
