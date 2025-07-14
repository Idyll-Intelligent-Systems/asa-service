const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      database: {
        connected: false,
        status: 'disconnected'
      },
      services: {
        api: true
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    // If we have database initializer, check its health
    if (req.app.locals.dbInitializer) {
      try {
        const dbHealth = await req.app.locals.dbInitializer.healthCheck();
        healthInfo.database.connected = dbHealth.healthy;
        healthInfo.database.status = dbHealth.healthy ? 'connected' : 'error';
        healthInfo.database.details = dbHealth;
      } catch (error) {
        healthInfo.database.connected = false;
        healthInfo.database.status = 'error';
        healthInfo.database.error = error.message;
      }
    }

    res.json(healthInfo);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
