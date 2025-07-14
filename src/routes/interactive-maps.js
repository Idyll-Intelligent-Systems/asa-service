const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get database connection
const getDb = (req) => {
  return req.app.locals.db || null;
};

// Mock data for interactive maps
const mockMapData = {
  'ragnarok': {
    name: 'Ragnarok',
    bounds: { north: 100, south: 0, east: 100, west: 0 },
    center: { lat: 50, lng: 50 },
    locations: [
      {
        id: '1',
        name: 'Green Obelisk',
        category: 'landmark',
        subcategory: 'obelisk',
        latitude: 25.5,
        longitude: 25.5,
        description: 'Green Obelisk - Easy boss arena',
        image_url: '/images/obelisk-green.png',
        marker_color: '#00FF00'
      },
      {
        id: '2',
        name: 'Metal Rich Mountain',
        category: 'resource',
        subcategory: 'metal',
        latitude: 75.2,
        longitude: 30.8,
        description: 'High concentration of metal nodes',
        rarity: 'common',
        image_url: '/images/metal-node.png',
        marker_color: '#808080'
      },
      {
        id: '3',
        name: 'Rex Valley',
        category: 'creature',
        subcategory: 'rex',
        latitude: 45.7,
        longitude: 65.3,
        description: 'Common Rex spawning area',
        danger_level: 8,
        image_url: '/images/rex-icon.png',
        marker_color: '#FF0000'
      }
    ]
  },
  'the-island': {
    name: 'The Island',
    bounds: { north: 100, south: 0, east: 100, west: 0 },
    center: { lat: 50, lng: 50 },
    locations: [
      {
        id: '4',
        name: 'Herbivore Island',
        category: 'landmark',
        subcategory: 'safe_zone',
        latitude: 85.4,
        longitude: 85.4,
        description: 'Safe area with only herbivore spawns',
        image_url: '/images/island-icon.png',
        marker_color: '#00AA00'
      }
    ]
  }
};

// Get interactive map data for a specific map
router.get('/:mapSlug/interactive', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { mapSlug } = req.params;
  const { category, user_id } = req.query;
  
  if (!db) {
    // Return mock data when database not available
    const mockData = mockMapData[mapSlug];
    if (!mockData) {
      return res.status(404).json({
        success: false,
        error: 'Map not found'
      });
    }
    
    let locations = mockData.locations;
    if (category) {
      locations = locations.filter(loc => loc.category === category);
    }
    
    return res.json({
      success: true,
      data: {
        map: {
          name: mockData.name,
          slug: mapSlug,
          bounds: mockData.bounds,
          center: mockData.center,
          default_zoom: 10
        },
        locations: locations,
        user_locations: [],
        routes: []
      },
      message: 'Using mock data - database not connected'
    });
  }
  
  try {
    // Get map details
    const mapQuery = 'SELECT * FROM maps WHERE slug = $1';
    const mapResult = await db.query(mapQuery, [mapSlug]);
    
    if (mapResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Map not found'
      });
    }
    
    const map = mapResult.rows[0];
    
    // Build location query with optional category filter
    let locationQuery = `
      SELECT id, name, slug, category, subcategory, latitude, longitude,
             image_url, icon_url, marker_color, description, rarity,
             difficulty, danger_level, properties
      FROM map_locations 
      WHERE map_id = $1
    `;
    let params = [map.id];
    
    if (category) {
      locationQuery += ' AND category = $2';
      params.push(category);
    }
    
    locationQuery += ' ORDER BY category, name';
    
    const locationsResult = await db.query(locationQuery, params);
    
    // Get user locations if user_id provided
    let userLocations = [];
    if (user_id) {
      const userLocQuery = `
        SELECT id, name, description, latitude, longitude, 
               is_base, is_favorite, color, icon
        FROM user_locations 
        WHERE map_id = $1 AND user_id = $2
        ORDER BY is_base DESC, name
      `;
      const userLocResult = await db.query(userLocQuery, [map.id, user_id]);
      userLocations = userLocResult.rows;
    }
    
    // Get routes for this map
    const routesQuery = `
      SELECT r.*, 
             sl.name as start_location_name,
             el.name as end_location_name
      FROM map_routes r
      LEFT JOIN map_locations sl ON r.start_location_id = sl.id
      LEFT JOIN map_locations el ON r.end_location_id = el.id
      WHERE r.map_id = $1
      ORDER BY r.name
    `;
    const routesResult = await db.query(routesQuery, [map.id]);
    
    res.json({
      success: true,
      data: {
        map: {
          id: map.id,
          name: map.name,
          slug: map.slug,
          bounds: map.map_bounds,
          center: map.center_coordinates,
          default_zoom: map.default_zoom || 10,
          interactive_map_url: map.interactive_map_url,
          has_interactive_data: map.has_interactive_data
        },
        locations: locationsResult.rows,
        user_locations: userLocations,
        routes: routesResult.rows,
        total_locations: locationsResult.rows.length
      }
    });
    
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interactive map data'
    });
  }
}));

// Get locations by category
router.get('/:mapSlug/locations/:category', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { mapSlug, category } = req.params;
  const { subcategory, rarity, difficulty } = req.query;
  
  if (!db) {
    const mockData = mockMapData[mapSlug];
    if (!mockData) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    
    let locations = mockData.locations.filter(loc => loc.category === category);
    if (subcategory) {
      locations = locations.filter(loc => loc.subcategory === subcategory);
    }
    
    return res.json({
      success: true,
      data: locations,
      message: 'Using mock data'
    });
  }
  
  try {
    // Get map ID
    const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [mapSlug]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    
    const mapId = mapResult.rows[0].id;
    
    // Build query with filters
    let query = `
      SELECT * FROM map_locations 
      WHERE map_id = $1 AND category = $2
    `;
    let params = [mapId, category];
    let paramIndex = 3;
    
    if (subcategory) {
      query += ` AND subcategory = $${paramIndex}`;
      params.push(subcategory);
      paramIndex++;
    }
    
    if (rarity) {
      query += ` AND rarity = $${paramIndex}`;
      params.push(rarity);
      paramIndex++;
    }
    
    if (difficulty) {
      query += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }
    
    query += ' ORDER BY name';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locations'
    });
  }
}));

// Add user location
router.post('/:mapSlug/user-locations', asyncHandler(async(req, res) => {
  const db = getDb(req);
  const { mapSlug } = req.params;
  const { user_id, name, description, latitude, longitude, is_base, color, icon } = req.body;
  
  if (!user_id || !name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: user_id, name, latitude, longitude'
    });
  }
  
  if (!db) {
    return res.json({
      success: true,
      data: {
        id: 'mock-' + Date.now(),
        name,
        latitude,
        longitude,
        is_base: is_base || false
      },
      message: 'User location saved (mock mode)'
    });
  }
  
  try {
    // Get map ID
    const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [mapSlug]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    
    const mapId = mapResult.rows[0].id;
    
    // Insert user location
    const insertQuery = `
      INSERT INTO user_locations 
      (user_id, map_id, name, description, latitude, longitude, is_base, color, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      user_id, mapId, name, description || null,
      latitude, longitude, is_base || false,
      color || '#0066CC', icon || 'home'
    ];
    
    const result = await db.query(insertQuery, values);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'User location added successfully'
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add user location'
    });
  }
}));

// Find nearest locations
router.get('/:mapSlug/nearest', asyncHandler(async(req, res) => {
  const { mapSlug } = req.params;
  const { lat, lng, radius = 10, category } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: lat, lng'
    });
  }
  
  const db = getDb(req);
  
  if (!db) {
    // Mock nearest locations
    const mockData = mockMapData[mapSlug];
    if (!mockData) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxRadius = parseFloat(radius);
    
    let nearestLocations = mockData.locations.map(location => {
      // Simple distance calculation
      const distance = Math.sqrt(
        Math.pow(location.latitude - userLat, 2) + 
        Math.pow(location.longitude - userLng, 2)
      );
      
      return {
        ...location,
        distance: distance
      };
    })
    .filter(loc => loc.distance <= maxRadius)
    .sort((a, b) => a.distance - b.distance);
    
    if (category) {
      nearestLocations = nearestLocations.filter(loc => loc.category === category);
    }
    
    return res.json({
      success: true,
      data: nearestLocations.slice(0, 10),
      message: 'Using mock data'
    });
  }
  
  try {
    // Get map ID
    const mapResult = await db.query('SELECT id FROM maps WHERE slug = $1', [mapSlug]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    
    const mapId = mapResult.rows[0].id;
    
    // Find nearest locations using PostgreSQL distance calculation
    let query = `
      SELECT *,
        sqrt(power(latitude - $2, 2) + power(longitude - $3, 2)) as distance
      FROM map_locations 
      WHERE map_id = $1
        AND sqrt(power(latitude - $2, 2) + power(longitude - $3, 2)) <= $4
    `;
    
    let params = [mapId, parseFloat(lat), parseFloat(lng), parseFloat(radius)];
    
    if (category) {
      query += ' AND category = $5';
      params.push(category);
    }
    
    query += ' ORDER BY distance LIMIT 20';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearest locations'
    });
  }
}));

// Calculate route between two points
router.post('/:mapSlug/route', asyncHandler(async(req, res) => {
  const { mapSlug } = req.params;
  const { start_lat, start_lng, end_lat, end_lng, route_type = 'walking' } = req.body;
  
  if (!start_lat || !start_lng || !end_lat || !end_lng) {
    return res.status(400).json({
      success: false,
      error: 'Missing required coordinates'
    });
  }
  
  // Simple route calculation (in production, use proper pathfinding)
  const distance = Math.sqrt(
    Math.pow(end_lat - start_lat, 2) + 
    Math.pow(end_lng - start_lng, 2)
  );
  
  // Estimated time based on route type (minutes per unit distance)
  const speedMultipliers = {
    walking: 2,
    flying: 0.5,
    swimming: 1.5,
    vehicle: 0.8
  };
  
  const estimatedTime = Math.round(distance * (speedMultipliers[route_type] || 2));
  
  // Generate simple waypoints (straight line for now)
  const waypoints = [
    { lat: start_lat, lng: start_lng, note: 'Start' },
    { lat: end_lat, lng: end_lng, note: 'Destination' }
  ];
  
  res.json({
    success: true,
    data: {
      distance_km: Math.round(distance * 100) / 100,
      estimated_time: estimatedTime,
      route_type: route_type,
      waypoints: waypoints,
      dangers: ['rex', 'lava'], // Mock dangers
      difficulty: distance > 20 ? 'hard' : distance > 10 ? 'medium' : 'easy'
    }
  });
}));

module.exports = router;
