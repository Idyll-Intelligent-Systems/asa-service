const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Regions API endpoints
router.get('/:id', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { id } = req.params;

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
}));

module.exports = router;
