const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get database connection or return null if not available
const getDb = (req) => {
  return req.app.locals.db || null;
};

// Mock taming data for when database is not available
const mockTamingData = {
  'rex': {
    creature: 'rex',
    name: 'Rex',
    tameable: true,
    method: 'knockout',
    preferred_food: ['Raw Prime Meat', 'Cooked Prime Meat'],
    kibble: 'Exceptional Kibble',
    taming_time: '2 hours 30 minutes',
    torpor_depletion: 'Slow',
    food_consumption: 'Medium'
  },
  'dodo': {
    creature: 'dodo',
    name: 'Dodo',
    tameable: true,
    method: 'passive',
    preferred_food: ['Mejoberry', 'Crops'],
    kibble: 'Basic Kibble',
    taming_time: '15 minutes',
    torpor_depletion: 'N/A',
    food_consumption: 'Low'
  }
};

router.get('/:slug', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { slug } = req.params;
  
  // If no database connection, return mock data
  if (!db) {
    const tamingData = mockTamingData[slug];
    if (!tamingData) {
      return res.status(404).json({
        success: false,
        error: 'Taming data not found for this creature'
      });
    }
    
    return res.json({
      success: true,
      data: tamingData,
      message: 'Using mock data - database not connected'
    });
  }

  try {
    // Get creature and taming information
    const creatureQuery = `
      SELECT c.*, t.taming_method, t.preferred_foods, t.kibble_type, 
             t.unconscious_time, t.torpor_depletion_rate, t.feeding_interval,
             t.special_requirements, t.taming_notes
      FROM creatures c
      LEFT JOIN taming_data t ON c.id = t.creature_id
      WHERE c.slug = $1
    `;
    
    const result = await db.query(creatureQuery, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Creature not found'
      });
    }

    const creature = result.rows[0];
    
    if (!creature.is_tameable) {
      return res.json({
        success: true,
        data: {
          creature: slug,
          name: creature.name,
          tameable: false,
          message: 'This creature cannot be tamed'
        }
      });
    }

    res.json({
      success: true,
      data: {
        creature: slug,
        name: creature.name,
        tameable: creature.is_tameable,
        method: creature.taming_method,
        preferred_food: creature.preferred_foods ? JSON.parse(creature.preferred_foods) : [],
        kibble: creature.kibble_type,
        unconscious_time: creature.unconscious_time,
        torpor_depletion_rate: creature.torpor_depletion_rate,
        feeding_interval: creature.feeding_interval,
        special_requirements: creature.special_requirements,
        taming_notes: creature.taming_notes
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

// Get all taming methods
router.get('/', asyncHandler(async(req, res) => {
  const db = getDb(req);
  
  // If no database connection, return mock data
  if (!db) {
    return res.json({
      success: true,
      data: {
        results: Object.values(mockTamingData)
      },
      message: 'Using mock data - database not connected'
    });
  }

  try {
    const query = `
      SELECT c.slug, c.name, c.is_tameable, t.taming_method, t.preferred_foods, t.kibble_type
      FROM creatures c
      LEFT JOIN taming_data t ON c.id = t.creature_id
      WHERE c.is_tameable = true
      ORDER BY c.name
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: {
        results: result.rows
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

module.exports = router;
