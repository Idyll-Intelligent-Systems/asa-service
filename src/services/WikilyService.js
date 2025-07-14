const axios = require('axios');
const cheerio = require('cheerio');

class WikilyService {
  constructor() {
    this.baseUrl = 'https://wikily.gg';
    this.arkBaseUrl = 'https://wikily.gg/ark-survival-ascended';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Fetch with caching and error handling
   */
  async fetchWithCache(url, cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      console.log(`🌐 Fetching from Wikily: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'ASA-Service/1.0.0 (Educational Tool)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch all available maps from Wikily
   */
  async fetchAllMaps() {
    try {
      const mapsData = [];
      
      // Fetch from maps index page
      const indexMaps = await this.fetchMapsFromIndex();
      mapsData.push(...indexMaps);

      // Fetch specific popular maps
      const specificMaps = await this.fetchSpecificMaps();
      mapsData.push(...specificMaps);

      // Remove duplicates
      const uniqueMaps = mapsData.filter((map, index, self) => 
        index === self.findIndex(m => m.slug === map.slug)
      );

      console.log(`✅ Fetched ${uniqueMaps.length} maps from Wikily`);
      return uniqueMaps;
    } catch (error) {
      console.error('❌ Failed to fetch maps from Wikily:', error);
      return [];
    }
  }

  /**
   * Fetch maps from the main maps index
   */
  async fetchMapsFromIndex() {
    try {
      const url = `${this.arkBaseUrl}/maps`;
      const html = await this.fetchWithCache(url, 'wikily_maps_index');
      const $ = cheerio.load(html);
      
      const maps = [];
      
      // Look for map cards or links
      $('.map-card, .card, [href*="/maps/"]').each((i, element) => {
        const $el = $(element);
        const link = $el.attr('href') || $el.find('a').attr('href');
        const title = $el.attr('title') || $el.find('h3, h4, .title').text().trim();
        const image = $el.find('img').attr('src') || $el.attr('data-src');
        
        if (link && title && link.includes('/maps/')) {
          const slug = link.split('/maps/')[1]?.split('/')[0];
          if (slug && slug !== 'index') {
            maps.push({
              name: title,
              slug: slug,
              type: 'official',
              source: 'wikily',
              url: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
              image_url: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
              description: $el.find('.description, .excerpt').text().trim() || null
            });
          }
        }
      });

      return maps;
    } catch (error) {
      console.error('❌ Failed to fetch maps index from Wikily:', error);
      return [];
    }
  }

  /**
   * Fetch specific popular maps
   */
  async fetchSpecificMaps() {
    const mapSlugs = [
      'ragnarok', 'the-island', 'the-center', 'scorched-earth', 
      'aberration', 'extinction', 'genesis', 'crystal-isles',
      'valguero', 'genesis-part-2', 'lost-island', 'fjordur'
    ];

    const maps = [];
    
    for (const slug of mapSlugs) {
      try {
        const mapData = await this.fetchMapDetails(slug);
        if (mapData) {
          maps.push(mapData);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch map ${slug}:`, error.message);
      }
    }

    return maps;
  }

  /**
   * Fetch detailed information for a specific map
   */
  async fetchMapDetails(mapSlug) {
    try {
      const url = `${this.arkBaseUrl}/maps/${mapSlug}`;
      const html = await this.fetchWithCache(url, `wikily_map_${mapSlug}`);
      const $ = cheerio.load(html);
      
      // Extract map information
      const title = $('h1, .page-title, .title').first().text().trim();
      const description = $('.description, .summary, .excerpt, p').first().text().trim();
      const image = $('img[src*="map"], .map-image img, .hero-image img').first().attr('src');
      
      // Extract map size if available
      const sizeMatch = html.match(/size[:\s]*(\d+\.?\d*)\s*(km|kilometers?)/i);
      const size = sizeMatch ? parseFloat(sizeMatch[1]) : null;

      // Extract interactive map data
      const interactiveMapData = await this.extractInteractiveMapData($, mapSlug);

      return {
        name: title || mapSlug,
        slug: mapSlug,
        type: this.determineMapType(mapSlug),
        source: 'wikily',
        url: url,
        description: description || null,
        image_url: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
        size_km: size,
        interactive_data: interactiveMapData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to fetch map details for ${mapSlug}:`, error);
      return null;
    }
  }

  /**
   * Extract interactive map data (resources, creatures, locations)
   */
  async extractInteractiveMapData($, mapSlug) {
    try {
      const mapData = {
        resources: [],
        creatures: [],
        caves: [],
        landmarks: [],
        spawn_points: []
      };

      // Look for interactive map scripts or data
      $('script').each((i, script) => {
        const content = $(script).html();
        if (content && content.includes('map') && (content.includes('lat') || content.includes('lng'))) {
          try {
            // Try to extract coordinates and markers
            const markerMatches = content.match(/(\{[^}]*lat[^}]*\})/g);
            if (markerMatches) {
              markerMatches.forEach(match => {
                try {
                  const marker = JSON.parse(match);
                  if (marker.lat && marker.lng) {
                    const category = this.determineMarkerCategory(marker);
                    mapData[category].push({
                      name: marker.title || marker.name || 'Unknown',
                      coordinates: [marker.lat, marker.lng],
                      type: marker.type || 'unknown',
                      description: marker.description || null,
                      image_url: marker.icon || marker.image || null
                    });
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              });
            }
          } catch (e) {
            // Skip if unable to parse
          }
        }
      });

      // Look for resource/creature tables
      $('.resource-table tr, .creature-table tr, table tr').each((i, row) => {
        const $row = $(row);
        const name = $row.find('td:first, th:first').text().trim();
        const coords = $row.find('td').text().match(/(\d+\.?\d*),\s*(\d+\.?\d*)/);
        
        if (name && coords) {
          mapData.resources.push({
            name: name,
            coordinates: [parseFloat(coords[1]), parseFloat(coords[2])],
            type: 'resource'
          });
        }
      });

      return mapData;
    } catch (error) {
      console.error('❌ Failed to extract interactive map data:', error);
      return { resources: [], creatures: [], caves: [], landmarks: [], spawn_points: [] };
    }
  }

  /**
   * Determine marker category based on marker data
   */
  determineMarkerCategory(marker) {
    const title = (marker.title || marker.name || '').toLowerCase();
    const type = (marker.type || '').toLowerCase();
    
    if (title.includes('cave') || type.includes('cave')) return 'caves';
    if (title.includes('resource') || type.includes('resource') || type.includes('metal') || type.includes('crystal')) return 'resources';
    if (title.includes('creature') || type.includes('creature') || type.includes('dino')) return 'creatures';
    if (title.includes('spawn') || type.includes('spawn')) return 'spawn_points';
    return 'landmarks';
  }

  /**
   * Determine map type
   */
  determineMapType(slug) {
    const officialMaps = ['the-island', 'the-center', 'scorched-earth', 'ragnarok', 'aberration', 'extinction', 'valguero', 'genesis', 'crystal-isles', 'genesis-part-2', 'lost-island', 'fjordur'];
    const dlcMaps = ['scorched-earth', 'aberration', 'extinction', 'genesis', 'genesis-part-2'];
    
    if (dlcMaps.includes(slug)) return 'dlc';
    if (officialMaps.includes(slug)) return 'official';
    return 'community';
  }

  /**
   * Fetch creatures data for a specific map
   */
  async fetchMapCreatures(mapSlug) {
    try {
      const url = `${this.arkBaseUrl}/maps/${mapSlug}/creatures`;
      const html = await this.fetchWithCache(url, `wikily_creatures_${mapSlug}`);
      const $ = cheerio.load(html);
      
      const creatures = [];
      
      $('.creature-card, .creature-item, table tr').each((i, element) => {
        const $el = $(element);
        const name = $el.find('.name, .title, td:first').text().trim();
        const image = $el.find('img').attr('src');
        const coords = $el.text().match(/(\d+\.?\d*),\s*(\d+\.?\d*)/);
        
        if (name && name !== 'Name' && name !== 'Creature') {
          creatures.push({
            name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            image_url: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
            coordinates: coords ? [parseFloat(coords[1]), parseFloat(coords[2])] : null,
            map: mapSlug,
            source: 'wikily'
          });
        }
      });

      return creatures;
    } catch (error) {
      console.error(`❌ Failed to fetch creatures for map ${mapSlug}:`, error);
      return [];
    }
  }

  /**
   * Fetch resources data for a specific map
   */
  async fetchMapResources(mapSlug) {
    try {
      const url = `${this.arkBaseUrl}/maps/${mapSlug}/resources`;
      const html = await this.fetchWithCache(url, `wikily_resources_${mapSlug}`);
      const $ = cheerio.load(html);
      
      const resources = [];
      
      $('.resource-card, .resource-item, table tr').each((i, element) => {
        const $el = $(element);
        const name = $el.find('.name, .title, td:first').text().trim();
        const image = $el.find('img').attr('src');
        const coords = $el.text().match(/(\d+\.?\d*),\s*(\d+\.?\d*)/);
        const rarity = $el.find('.rarity, .quality').text().trim().toLowerCase();
        
        if (name && name !== 'Name' && name !== 'Resource') {
          resources.push({
            name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            image_url: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
            coordinates: coords ? [parseFloat(coords[1]), parseFloat(coords[2])] : null,
            rarity: rarity || 'common',
            map: mapSlug,
            source: 'wikily'
          });
        }
      });

      return resources;
    } catch (error) {
      console.error(`❌ Failed to fetch resources for map ${mapSlug}:`, error);
      return [];
    }
  }

  /**
   * Fetch caves data for a specific map
   */
  async fetchMapCaves(mapSlug) {
    try {
      const url = `${this.arkBaseUrl}/maps/${mapSlug}/caves`;
      const html = await this.fetchWithCache(url, `wikily_caves_${mapSlug}`);
      const $ = cheerio.load(html);
      
      const caves = [];
      
      $('.cave-card, .cave-item, table tr').each((i, element) => {
        const $el = $(element);
        const name = $el.find('.name, .title, td:first').text().trim();
        const image = $el.find('img').attr('src');
        const coords = $el.text().match(/(\d+\.?\d*),\s*(\d+\.?\d*)/);
        const difficulty = $el.find('.difficulty, .level').text().trim();
        
        if (name && name !== 'Name' && name !== 'Cave') {
          caves.push({
            name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            image_url: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
            coordinates: coords ? [parseFloat(coords[1]), parseFloat(coords[2])] : null,
            difficulty: difficulty || 'medium',
            map: mapSlug,
            source: 'wikily'
          });
        }
      });

      return caves;
    } catch (error) {
      console.error(`❌ Failed to fetch caves for map ${mapSlug}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive map data including all features
   */
  async getComprehensiveMapData(mapSlug) {
    try {
      console.log(`🗺️ Fetching comprehensive data for map: ${mapSlug}`);
      
      const [mapDetails, creatures, resources, caves] = await Promise.all([
        this.fetchMapDetails(mapSlug),
        this.fetchMapCreatures(mapSlug),
        this.fetchMapResources(mapSlug),
        this.fetchMapCaves(mapSlug)
      ]);

      return {
        map: mapDetails,
        creatures: creatures,
        resources: resources,
        caves: caves,
        total_features: creatures.length + resources.length + caves.length
      };
    } catch (error) {
      console.error(`❌ Failed to get comprehensive map data for ${mapSlug}:`, error);
      return null;
    }
  }
}

module.exports = WikilyService;
