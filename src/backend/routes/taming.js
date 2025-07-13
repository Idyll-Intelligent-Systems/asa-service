const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Taming Calculator API endpoint
router.post('/calculate', asyncHandler(async(req, res) => {
  const { db } = req.app.locals;
  const { creature, level, food } = req.body;

  if (!creature || !level || !food) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: creature, level, food'
    });
  }

  // Get creature data
  const creatureResult = await db.query('SELECT * FROM creatures WHERE slug = $1', [creature]);
  if (creatureResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Creature '${creature}' not found`
    });
  }

  // Get taming data for the food
  const tamingResult = await db.query(
    'SELECT * FROM creature_taming WHERE creature_id = $1 AND food_name ILIKE $2',
    [creatureResult.rows[0].id, food]
  );

  if (tamingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: `Taming data for '${food}' not found for '${creature}'`
    });
  }

  const [tamingData] = tamingResult.rows;

  // Calculate requirements based on level
  const levelMultiplier = Math.pow(level / 30, 0.85);
  const quantity = Math.ceil(tamingData.quantity_for_level_1 * levelMultiplier);
  const time = Math.ceil(tamingData.taming_time_minutes * levelMultiplier);

  // Calculate narcotic requirements (approximate)
  const narcotics = Math.ceil(time / 5 * (level / 30));

  res.json({
    success: true,
    data: {
      creature,
      level,
      food,
      requirements: {
        quantity,
        time_minutes: time,
        narcotics_needed: narcotics,
        effectiveness: tamingData.effectiveness
      },
      calculations: {
        level_multiplier: levelMultiplier,
        base_quantity: tamingData.quantity_for_level_1,
        base_time: tamingData.taming_time_minutes
      }
    }
  });
}));

module.exports = router;
