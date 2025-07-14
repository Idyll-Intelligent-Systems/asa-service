const express = require('express');
const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get database connection or return null if not available
const getDb = (req) => {
  return req.app.locals.db || null;
};

// Mock search results for when database is not available
const mockSearchResults = [
  {
    type: 'creature',
    id: 1,
    name: 'Rex',
    slug: 'rex',
    description: 'Large carnivorous theropod'
  },
  {
    type: 'creature',
    id: 2,
    name: 'Dodo',
    slug: 'dodo',
    description: 'Small passive bird'
  },
  {
    type: 'map',
    id: 1,
    name: 'The Island',
    slug: 'the-island',
    description: 'The original ARK map'
  }
];

router.get('/', asyncHandler(async(req, res) => {
  const { q, type, page = 1, limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Search query parameter "q" is required'
    });
  }

  const db = getDb(req);
  
  // If no database connection, return mock search results
  if (!db) {
    let results = mockSearchResults.filter(item => 
      item.name.toLowerCase().includes(q.toLowerCase()) ||
      item.description.toLowerCase().includes(q.toLowerCase())
    );
    
    if (type && type !== 'all') {
      results = results.filter(item => item.type === type);
    }
    
    // Pagination
    const total = results.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    results = results.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: {
        query: q,
        type: type || 'all',
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: 'Using mock data - database not connected'
    });
  }

  // Database search
  const offset = (page - 1) * limit;
  const searchTerm = `%${q}%`;
  let searchResults = [];

  try {
    if (!type || type === 'all' || type === 'creature') {
      const creatureQuery = `
        SELECT 'creature' as type, id, name, slug, 
               COALESCE(description, temperament) as description
        FROM creatures 
        WHERE name ILIKE $1 OR description ILIKE $1 OR temperament ILIKE $1
        LIMIT $2 OFFSET $3
      `;
      const creatureResults = await db.query(creatureQuery, [searchTerm, limit, offset]);
      searchResults = searchResults.concat(creatureResults.rows);
    }

    if (!type || type === 'all' || type === 'map') {
      const mapQuery = `
        SELECT 'map' as type, id, name, slug, description
        FROM maps 
        WHERE name ILIKE $1 OR description ILIKE $1
        LIMIT $2 OFFSET $3
      `;
      const mapResults = await db.query(mapQuery, [searchTerm, limit, offset]);
      searchResults = searchResults.concat(mapResults.rows);
    }

    // Get total count for pagination
    let totalCount = 0;
    if (!type || type === 'all' || type === 'creature') {
      const creatureCountQuery = `
        SELECT COUNT(*) FROM creatures 
        WHERE name ILIKE $1 OR description ILIKE $1 OR temperament ILIKE $1
      `;
      const creatureCount = await db.query(creatureCountQuery, [searchTerm]);
      totalCount += parseInt(creatureCount.rows[0].count);
    }

    if (!type || type === 'all' || type === 'map') {
      const mapCountQuery = `
        SELECT COUNT(*) FROM maps 
        WHERE name ILIKE $1 OR description ILIKE $1
      `;
      const mapCount = await db.query(mapCountQuery, [searchTerm]);
      totalCount += parseInt(mapCount.rows[0].count);
    }

    res.json({
      success: true,
      data: {
        query: q,
        type: type || 'all',
        results: searchResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search query error:', error);
    res.status(500).json({
      success: false,
      error: 'Search query failed'
    });
  }
}));

module.exports = router;
