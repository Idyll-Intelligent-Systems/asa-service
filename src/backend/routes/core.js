const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'ASA Service API - Comprehensive ARK: Survival Ascended Database',
    version: '2.0.0-enhanced',
    endpoints: {
      maps: '/api/maps',
      creatures: '/api/creatures',
      regions: '/api/maps/:slug/regions',
      caves: '/api/maps/:slug/caves',
      resources: '/api/maps/:slug/resources',
      obelisks: '/api/maps/:slug/obelisks',
      supply_drops: '/api/maps/:slug/supply-drops',
      base_spots: '/api/maps/:slug/base-spots',
      taming_calculator: '/api/taming/calculate',
      search: '/api/search',
      health: '/health',
      admin: '/api/admin/*'
    },
    documentation: 'https://github.com/your-repo/asa-service/README.md'
  });
});

// Health check endpoint
router.get('/health', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;

  try {
    // Test database connection
    const dbTest = await db.query('SELECT NOW()');

    // Get database counts
    const counts = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM maps) as maps,
        (SELECT COUNT(*) FROM creatures) as creatures,
        (SELECT COUNT(*) FROM map_regions) as regions,
        (SELECT COUNT(*) FROM caves) as caves,
        (SELECT COUNT(*) FROM resources) as resources,
        (SELECT COUNT(*) FROM obelisks) as obelisks,
        (SELECT COUNT(*) FROM supply_drops) as supply_drops,
        (SELECT COUNT(*) FROM base_spots) as base_spots
    `);

    res.json({
      status: 'healthy',
      timestamp: dbTest.rows[0].now,
      database: 'connected',
      counts: counts.rows[0],
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '2.0.0-enhanced'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

module.exports = router;
