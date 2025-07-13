const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Admin API endpoints
router.get('/population-status', asyncHandler(async(req, res) => {
  const { dataService } = req.app.locals;
  const status = await dataService.getPopulationStatus();

  res.json({
    success: true,
    data: status
  });
}));

router.post('/populate-data', asyncHandler(async(req, res) => {
  const { dataService } = req.app.locals;
  const { type = 'all' } = req.body;

  // This should be run in background for production
  // For demo, we'll just trigger it
  try {
    if (type === 'all') {
      // Don't await in production - run in background
      dataService.populateAllData().catch(console.error);
    } else if (type === 'creatures') {
      dataService.populateCreatures().catch(console.error);
    } else if (type === 'regions') {
      dataService.populateRegions().catch(console.error);
    }

    res.json({
      success: true,
      message: `Data population started for: ${type}`,
      note: 'Check /api/admin/population-status for progress'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;
