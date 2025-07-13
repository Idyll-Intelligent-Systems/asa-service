const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Creatures API endpoints
router.get('/', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { page = 1, limit = 20, tameable, method } = req.query;
  const offset = (page - 1) * limit;

  let countQuery = 'SELECT COUNT(*) FROM creatures WHERE 1=1';
  let dataQuery = 'SELECT * FROM creatures WHERE 1=1';
  const params = [];

  if (tameable !== undefined) {
    const condition = ` AND tameable = $${params.length + 1}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(tameable === 'true');
  }

  if (method) {
    const condition = ` AND taming_method = $${params.length + 1}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(method);
  }

  dataQuery += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, [...params, limit, offset])
  ]);

  const total = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: dataResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1
    }
  });
}));

router.get('/search', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 2 characters long'
    });
  }

  const result = await db.query(`
    SELECT * FROM creatures 
    WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
    OR name ILIKE $2
    ORDER BY 
      CASE 
        WHEN name ILIKE $2 THEN 1
        WHEN name ILIKE $3 THEN 2
        ELSE 3
      END,
      name
    LIMIT $4
  `, [q, `%${q}%`, `${q}%`, limit]);

  res.json({
    success: true,
    data: result.rows,
    query: q,
    count: result.rows.length
  });
}));

router.get('/:slug', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;

  // Get creature details
  const creatureResult = await db.query('SELECT * FROM creatures WHERE slug = $1', [slug]);

  if (creatureResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Creature '${slug}' not found`
    });
  }

  const [creature] = creatureResult.rows;

  // Get creature stats
  const statsResult = await db.query(
    'SELECT * FROM creature_stats WHERE creature_id = $1 ORDER BY stat_name',
    [creature.id]
  );

  // Get taming data
  const tamingResult = await db.query(
    'SELECT * FROM creature_taming WHERE creature_id = $1 ORDER BY effectiveness DESC',
    [creature.id]
  );

  res.json({
    success: true,
    data: {
      ...creature,
      stats: statsResult.rows,
      taming: tamingResult.rows
    }
  });
}));

module.exports = router;
