const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Maps API endpoints
router.get('/', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { official, expansion } = req.query;

  let query = 'SELECT * FROM maps WHERE 1=1';
  const params = [];

  if (official !== undefined) {
    query += ` AND official = $${params.length + 1}`;
    params.push(official === 'true');
  }

  if (expansion !== undefined) {
    query += ` AND expansion = $${params.length + 1}`;
    params.push(expansion === 'true');
  }

  query += ' ORDER BY release_date DESC';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    count: result.rows.length
  });
}));

router.get('/:slug', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;

  const result = await db.query('SELECT * FROM maps WHERE slug = $1', [slug]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Map-specific resource routes
router.get('/:slug/regions', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;
  const { category } = req.query;

  // Verify map exists
  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  let query = 'SELECT * FROM map_regions WHERE map_id = $1';
  const params = [mapResult.rows[0].id];

  if (category) {
    query += ' AND category = $2';
    params.push(category);
  }

  query += ' ORDER BY name';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

router.get('/:slug/caves', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;
  const { type, difficulty } = req.query;

  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  let query = 'SELECT * FROM caves WHERE map_id = $1';
  const params = [mapResult.rows[0].id];

  if (type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(type);
  }

  if (difficulty) {
    query += ` AND difficulty = $${params.length + 1}`;
    params.push(difficulty);
  }

  query += ' ORDER BY name';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

router.get('/:slug/resources', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;
  const { type, quality } = req.query;

  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  let query = 'SELECT * FROM resources WHERE map_id = $1';
  const params = [mapResult.rows[0].id];

  if (type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(type);
  }

  if (quality) {
    query += ` AND quality = $${params.length + 1}`;
    params.push(quality);
  }

  query += ' ORDER BY name';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

router.get('/:slug/obelisks', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;

  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  const result = await db.query(
    'SELECT * FROM obelisks WHERE map_id = $1 ORDER BY name',
    [mapResult.rows[0].id]
  );

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

router.get('/:slug/supply-drops', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;
  const { quality } = req.query;

  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  let query = 'SELECT * FROM supply_drops WHERE map_id = $1';
  const params = [mapResult.rows[0].id];

  if (quality) {
    query += ` AND quality = $${params.length + 1}`;
    params.push(quality);
  }

  query += ' ORDER BY quality';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

router.get('/:slug/base-spots', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { slug } = req.params;
  const { rating_min: ratingMin } = req.query;

  const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [slug]);
  if (mapResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Map '${slug}' not found`
    });
  }

  let query = 'SELECT * FROM base_spots WHERE map_id = $1';
  const params = [mapResult.rows[0].id];

  if (ratingMin) {
    query += ` AND rating >= $${params.length + 1}`;
    params.push(parseFloat(ratingMin));
  }

  query += ' ORDER BY rating DESC';

  const result = await db.query(query, params);

  res.json({
    success: true,
    data: result.rows,
    map: slug,
    count: result.rows.length
  });
}));

module.exports = router;
