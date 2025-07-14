const axios = require('axios');
const cheerio = require('cheerio');

class WikiDataService {
  constructor() {
    this.baseUrl = 'https://ark.wiki.gg';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Fetch all creatures from ARK Wiki
   */
  async fetchAllCreatures() {
    try {
      const creatures = [];
      
      // Main creatures page
      const creaturesData = await this.fetchCreaturesList();
      creatures.push(...creaturesData);

      // Add creatures from specific categories
      const categoriesData = await this.fetchCreaturesByCategories();
      creatures.push(...categoriesData);

      // Remove duplicates by slug
      const uniqueCreatures = creatures.filter((creature, index, self) => 
        index === self.findIndex(c => c.slug === creature.slug)
      );

      return uniqueCreatures;
    } catch (error) {
      console.error('Failed to fetch creatures:', error.message);
      return [];
    }
  }

  /**
   * Fetch main creatures list
   */
  async fetchCreaturesList() {
    try {
      const url = `${this.baseUrl}/wiki/Creatures`;
      const html = await this.fetchWithCache(url, 'creatures_main');
      const $ = cheerio.load(html);
      
      const creatures = [];
      
      // Parse creature table
      $('table.wikitable tr').each((i, row) => {
        if (i === 0) return; // Skip header
        
        const $row = $(row);
        const $cells = $row.find('td');
        
        if ($cells.length >= 4) {
          const $nameCell = $cells.eq(0);
          const $imageCell = $cells.eq(1);
          const $tamingCell = $cells.eq(2);
          const $ridingCell = $cells.eq(3);
          
          const name = $nameCell.find('a').text().trim() || $nameCell.text().trim();
          const link = $nameCell.find('a').attr('href');
          const image = $imageCell.find('img').attr('src');
          const tamingText = $tamingCell.text().trim().toLowerCase();
          const ridingText = $ridingCell.text().trim().toLowerCase();
          
          if (name && name !== 'Name') {
            const creature = {
              name: name,
              slug: this.createSlug(name),
              displayName: name,
              wikiUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
              imageUrl: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
              isTameable: tamingText.includes('yes') || tamingText.includes('passive'),
              isRideable: ridingText.includes('yes'),
              tamingMethod: this.determineTamingMethod(tamingText),
              temperament: this.determineTemperament(name),
              searchTags: [name.toLowerCase()],
              biomes: []
            };
            
            creatures.push(creature);
          }
        }
      });
      
      return creatures;
    } catch (error) {
      console.error('Failed to fetch creatures list:', error.message);
      return [];
    }
  }

  /**
   * Fetch creatures by categories
   */
  async fetchCreaturesByCategories() {
    const categories = [
      'Land_Creatures',
      'Flying_Creatures', 
      'Aquatic_Creatures',
      'Boss_Creatures',
      'Event_Creatures'
    ];
    
    const creatures = [];
    
    for (const category of categories) {
      try {
        const categoryCreatures = await this.fetchCreatureCategory(category);
        creatures.push(...categoryCreatures);
      } catch (error) {
        console.error(`Failed to fetch category ${category}:`, error.message);
      }
    }
    
    return creatures;
  }

  /**
   * Fetch creatures from a specific category
   */
  async fetchCreatureCategory(category) {
    try {
      const url = `${this.baseUrl}/wiki/Category:${category}`;
      const html = await this.fetchWithCache(url, `category_${category}`);
      const $ = cheerio.load(html);
      
      const creatures = [];
      
      $('.mw-category-group ul li a').each((i, element) => {
        const $link = $(element);
        const name = $link.text().trim();
        const href = $link.attr('href');
        
        if (name && href && !name.includes('Category:')) {
          const creature = {
            name: name,
            slug: this.createSlug(name),
            displayName: name,
            wikiUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            temperament: this.determineTemperament(name),
            isTameable: !category.includes('Boss'),
            isRideable: false,
            isBreedable: !category.includes('Boss') && !category.includes('Event'),
            isBoss: category.includes('Boss'),
            searchTags: [name.toLowerCase(), category.toLowerCase()],
            biomes: this.determineBiomes(category)
          };
          
          creatures.push(creature);
        }
      });
      
      return creatures;
    } catch (error) {
      console.error(`Failed to fetch category ${category}:`, error.message);
      return [];
    }
  }

  /**
   * Create URL-friendly slug
   */
  createSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Determine taming method from text
   */
  determineTamingMethod(tamingText) {
    if (tamingText.includes('passive')) return 'passive';
    if (tamingText.includes('knockout') || tamingText.includes('yes')) return 'knockout';
    if (tamingText.includes('breeding')) return 'breeding';
    if (tamingText.includes('special')) return 'special';
    if (tamingText.includes('no') || tamingText.includes('untameable')) return 'untameable';
    return 'knockout'; // default
  }

  /**
   * Determine creature temperament
   */
  determineTemperament(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('alpha') || nameLower.includes('boss')) return 'aggressive';
    if (nameLower.includes('rex') || nameLower.includes('giga') || nameLower.includes('carno')) return 'aggressive';
    if (nameLower.includes('raptor') || nameLower.includes('spino')) return 'aggressive';
    if (nameLower.includes('dodo') || nameLower.includes('parasaur') || nameLower.includes('trike')) return 'passive';
    if (nameLower.includes('bronto') || nameLower.includes('diplo')) return 'passive';
    
    return 'neutral'; // default
  }

  /**
   * Determine biomes from category
   */
  determineBiomes(category) {
    switch (category) {
      case 'Flying_Creatures':
        return ['mountains', 'cliffs', 'sky'];
      case 'Aquatic_Creatures':
        return ['ocean', 'rivers', 'lakes'];
      case 'Land_Creatures':
        return ['forest', 'plains', 'jungle'];
      default:
        return ['various'];
    }
  }

  async fetchWithCache(url, key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      this.cache.set(key, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }

  async getMapRegions(mapName) {
    const url = `${this.baseUrl}/wiki/${mapName}#Regions`;
    const html = await this.fetchWithCache(url, `regions_${mapName}`);
    const $ = cheerio.load(html);

    // Parse region sections - each map has different structure
    if (mapName === 'Lost_Island') {
      return this.parseLostIslandRegions($);
    } else if (mapName === 'Crystal_Isles') {
      return this.parseCrystalIslesRegions($);
    } else if (mapName === 'Valguero') {
      return this.parseValgueroRegions($);
    } else if (mapName === 'Genesis:_Part_1') {
      return this.parseGenesis1Regions($);
    } else if (mapName === 'Genesis:_Part_2') {
      return this.parseGenesis2Regions($);
    } else if (mapName === 'The_Center') {
      return this.parseCenterRegions($);
    } else if (mapName === 'Extinction') {
      return this.parseExtinctionRegions($);
    } else if (mapName === 'Fjordur') {
      return this.parseFjordurRegions($);
    }

    return this.parseGenericRegions($, mapName);
  }

  parseLostIslandRegions($) {
    const regions = [];

    // Parse the regions table structure for Lost Island
    $('img[alt*="(Lost Island)"]').each((i, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      if (src && alt) {
        const regionName = alt.replace(' (Lost Island)', '').replace('.png', '').replace('.jpg', '');
        const $link = $img.closest('a');
        const href = $link.attr('href');

        if (regionName && href) {
          regions.push({
            name: regionName,
            image: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
            category: this.categorizeRegion(regionName),
            description: `${regionName} region on Lost Island`,
            wikiUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`
          });
        }
      }
    });

    return regions;
  }

  parseCrystalIslesRegions($) {
    const regions = [];

    // Parse Crystal Isles specific structure
    $('img[alt*="(Crystal Isles)"]').each((i, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      if (src && alt) {
        const regionName = alt.replace(' (Crystal Isles)', '').replace('.jpg', '').replace('.png', '');
        const $link = $img.closest('a');
        const href = $link.attr('href');

        regions.push({
          name: regionName,
          image: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
          category: this.categorizeRegion(regionName),
          description: `${regionName} region on Crystal Isles`,
          wikiUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}${href}`) : null
        });
      }
    });

    return regions;
  }

  parseValgueroRegions($) {
    const regions = [];

    // Parse Valguero regions
    $('.mw-content-text img[alt*="Valguero"]').each((i, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      if (src && alt && alt.includes('Valguero')) {
        const regionName = alt.replace(/\s*\(Valguero\)/g, '').replace('.jpg', '').replace('.png', '');

        regions.push({
          name: regionName,
          image: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
          category: this.categorizeRegion(regionName),
          description: `${regionName} region on Valguero`
        });
      }
    });

    return regions;
  }

  parseGenesis1Regions($) {
    const regions = [];
    const biomes = ['Arctic', 'Bog', 'Lunar', 'Ocean', 'Volcano'];

    // Genesis Part 1 has distinct biomes
    biomes.forEach(biome => {
      const biomeSection = $(`h3:contains("${biome}")`).next().find('li');
      biomeSection.each((i, element) => {
        const regionName = $(element).text().trim();
        if (regionName) {
          regions.push({
            name: regionName,
            category: biome.toLowerCase(),
            description: `${regionName} in the ${biome} biome`,
            biome
          });
        }
      });
    });

    return regions;
  }

  parseGenericRegions($, mapName) {
    const regions = [];

    // Generic parser for other maps
    $(`img[alt*="${mapName}"], img[src*="${mapName}"]`).each((i, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      if (src && alt) {
        const regionName = alt.replace(new RegExp(`\\s*\\(${mapName}\\)`, 'g'), '').replace(/\.(jpg|png)$/i, '');

        if (regionName.length > 2) {
          regions.push({
            name: regionName,
            image: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
            category: this.categorizeRegion(regionName),
            description: `${regionName} region on ${mapName}`
          });
        }
      }
    });

    return regions;
  }

  categorizeRegion(regionName) {
    const name = regionName.toLowerCase();

    if (name.includes('cave') || name.includes('grotto') || name.includes('cavern')) return 'caves';
    if (name.includes('ocean') || name.includes('sea') || name.includes('water') || name.includes('lake')) return 'ocean';
    if (name.includes('mountain') || name.includes('peak') || name.includes('ridge') || name.includes('cliff')) return 'mountains';
    if (name.includes('forest') || name.includes('jungle') || name.includes('woods') || name.includes('grove')) return 'forest';
    if (name.includes('desert') || name.includes('dune') || name.includes('oasis') || name.includes('badland')) return 'desert';
    if (name.includes('swamp') || name.includes('bog') || name.includes('marsh') || name.includes('wetland')) return 'swamp';
    if (name.includes('snow') || name.includes('ice') || name.includes('frozen') || name.includes('arctic') || name.includes('tundra')) return 'snow';
    if (name.includes('volcano') || name.includes('lava') || name.includes('magma')) return 'volcanic';
    if (name.includes('beach') || name.includes('shore') || name.includes('coast') || name.includes('bay')) return 'coastal';
    if (name.includes('island') || name.includes('isle')) return 'islands';
    if (name.includes('plain') || name.includes('field') || name.includes('meadow') || name.includes('grassland')) return 'plains';
    if (name.includes('canyon') || name.includes('gorge') || name.includes('valley')) return 'canyons';
    if (name.includes('ruin') || name.includes('temple') || name.includes('castle') || name.includes('structure')) return 'structures';

    return 'other';
  }

  async getCreatureList(mapName) {
    const url = `${this.baseUrl}/wiki/${mapName}#Creatures`;
    const html = await this.fetchWithCache(url, `creatures_${mapName}`);
    const $ = cheerio.load(html);

    const creatures = [];

    // Find creature links
    $('a[href*="/wiki/"]').each((i, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();

      if (href && text && !href.includes('#') && text.length > 2) {
        // Filter for actual creature pages
        if (this.isCreaturePage(text, href)) {
          creatures.push({
            name: text,
            wikiUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            map: mapName
          });
        }
      }
    });

    return [...new Set(creatures.map(c => c.name))].map(name =>
      creatures.find(c => c.name === name)
    );
  }

  isCreaturePage(name, href) {
    const excludeTerms = [
      'category', 'template', 'file:', 'special:', 'help:', 'user:',
      'talk:', 'mod:', 'expansion', 'dlc', 'map', 'region', 'cave',
      'artifact', 'item', 'structure', 'weapon', 'armor', 'saddle'
    ];

    const lowerName = name.toLowerCase();
    const lowerHref = href.toLowerCase();

    return !excludeTerms.some(term => lowerName.includes(term) || lowerHref.includes(term)) &&
           name.length > 2 && name.length < 50;
  }

  async getCaveData(mapName) {
    const url = `${this.baseUrl}/wiki/${mapName}#Caves`;
    const html = await this.fetchWithCache(url, `caves_${mapName}`);
    const $ = cheerio.load(html);

    const caves = [];

    // Look for cave tables or lists
    $('table tr, li').each((i, element) => {
      const $element = $(element);
      const text = $element.text().toLowerCase();

      if (text.includes('cave') || text.includes('cavern') || text.includes('grotto')) {
        const caveName = $element.find('a').first().text() || $element.text().trim();
        if (caveName && caveName.length > 3 && caveName.length < 100) {
          caves.push({
            name: caveName,
            map: mapName,
            type: this.determineCaveType(caveName)
          });
        }
      }
    });

    return caves;
  }

  determineCaveType(caveName) {
    const name = caveName.toLowerCase();
    if (name.includes('artifact')) return 'artifact';
    if (name.includes('supply')) return 'supply';
    if (name.includes('ice') || name.includes('snow')) return 'ice';
    if (name.includes('lava') || name.includes('magma')) return 'lava';
    if (name.includes('underwater') || name.includes('water')) return 'underwater';
    if (name.includes('tek')) return 'tek';
    return 'standard';
  }

  async getResourceNodes(mapName) {
    // const url = `${this.baseUrl}/wiki/Resource_Map_(${mapName})`;
    // const html = await this.fetchWithCache(url, `resources_${mapName}`);
    // const $ = cheerio.load(html);

    const resources = [];
    const resourceTypes = ['Metal', 'Crystal', 'Obsidian', 'Oil', 'Pearl', 'Sulfur', 'Salt'];

    resourceTypes.forEach(type => {
      // This would need more specific parsing based on wiki structure
      resources.push({
        type,
        map: mapName,
        nodes: [] // Would be populated with coordinate data
      });
    });

    return resources;
  }

  /**
   * Fetch comprehensive map data from ARK Wiki
   */
  async fetchAllMapsData() {
    try {
      const maps = [];
      
      // Get list of all maps from main maps page
      const mapsList = await this.fetchMapsList();
      
      for (const mapBasic of mapsList) {
        try {
          const mapDetails = await this.getMapDetails(mapBasic.slug);
          maps.push({
            ...mapBasic,
            ...mapDetails
          });
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Failed to fetch details for map ${mapBasic.name}:`, error.message);
          maps.push(mapBasic); // Add basic data even if details fail
        }
      }
      
      return maps;
    } catch (error) {
      console.error('Failed to fetch maps data:', error.message);
      return [];
    }
  }

  /**
   * Fetch list of all maps from ARK Wiki maps page
   */
  async fetchMapsList() {
    try {
      const url = `${this.baseUrl}/wiki/Maps`;
      const html = await this.fetchWithCache(url, 'maps_list');
      const $ = cheerio.load(html);
      
      const maps = [];
      
      // Parse official maps table
      $('table.wikitable').each((tableIndex, table) => {
        const $table = $(table);
        const tableHeaders = $table.find('th').map((i, th) => $(th).text().trim().toLowerCase()).get();
        
        // Check if this table contains map data
        if (tableHeaders.includes('name') || tableHeaders.includes('map') || tableHeaders.includes('dlc')) {
          $table.find('tr').each((rowIndex, row) => {
            if (rowIndex === 0) return; // Skip header
            
            const $row = $(row);
            const $cells = $row.find('td');
            
            if ($cells.length >= 3) {
              const $nameCell = $cells.eq(0);
              const nameLink = $nameCell.find('a').first();
              const name = nameLink.text().trim() || $nameCell.text().trim();
              const href = nameLink.attr('href');
              
              if (name && name.length > 2 && !name.toLowerCase().includes('released')) {
                const slug = this.createSlug(name);
                const imageCell = $cells.eq(1);
                const image = imageCell.find('img').attr('src');
                
                // Extract additional info from other cells
                const typeCell = $cells.eq(2);
                const sizeCell = $cells.eq(3);
                const releaseCell = $cells.eq(4);
                
                maps.push({
                  name: name,
                  slug: slug,
                  displayName: name,
                  wikiUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}${href}`) : null,
                  imageUrl: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
                  mapType: this.determineMapType(typeCell.text().trim()),
                  isOfficial: this.isOfficialMap(typeCell.text().trim()),
                  isFree: this.isFreeMap(typeCell.text().trim()),
                  sizeInfo: sizeCell.text().trim(),
                  releaseInfo: releaseCell.text().trim()
                });
              }
            }
          });
        }
      });
      
      // Also check for map links in other sections
      $('.mw-parser-output a[href*="/wiki/"]').each((i, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (this.isMapPage(text, href)) {
          const name = text;
          const slug = this.createSlug(name);
          
          // Avoid duplicates
          if (!maps.find(m => m.slug === slug)) {
            maps.push({
              name: name,
              slug: slug,
              displayName: name,
              wikiUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
              mapType: 'official',
              isOfficial: true,
              isFree: true
            });
          }
        }
      });
      
      return maps;
    } catch (error) {
      console.error('Failed to fetch maps list:', error.message);
      return [];
    }
  }

  /**
   * Get detailed information for a specific map
   */
  async getMapDetails(mapSlug) {
    try {
      const url = `${this.baseUrl}/wiki/${mapSlug}`;
      const html = await this.fetchWithCache(url, `map_${mapSlug}`);
      const $ = cheerio.load(html);
      
      const details = {
        description: '',
        coordinates: null,
        biomes: [],
        creatures: [],
        resources: [],
        caves: [],
        obelisks: [],
        artifacts: [],
        bosses: [],
        notes: []
      };
      
      // Extract description from first paragraph
      const firstParagraph = $('.mw-parser-output p').first().text().trim();
      if (firstParagraph && firstParagraph.length > 50) {
        details.description = firstParagraph.substring(0, 500) + (firstParagraph.length > 500 ? '...' : '');
      }
      
      // Extract size information
      const sizeInfo = this.extractMapSize($);
      if (sizeInfo) {
        details.sizeKm = sizeInfo.sizeKm;
        details.coordinates = sizeInfo.coordinates;
      }
      
      // Extract biomes/regions
      details.biomes = await this.getMapRegions(mapSlug);
      
      // Extract creatures list
      details.creatures = await this.getCreatureList(mapSlug);
      
      // Extract caves
      details.caves = await this.getCaveData(mapSlug);
      
      // Extract obelisks and artifacts
      details.obelisks = this.extractObelisks($);
      details.artifacts = this.extractArtifacts($);
      details.bosses = this.extractBosses($);
      
      // Extract resource nodes
      details.resources = await this.getResourceNodes(mapSlug);
      
      // Extract explorer notes
      details.notes = this.extractExplorerNotes($);
      
      return details;
    } catch (error) {
      console.error(`Failed to get map details for ${mapSlug}:`, error.message);
      return {};
    }
  }

  /**
   * Extract map size and coordinate system information
   */
  extractMapSize($) {
    const sizeInfo = {
      sizeKm: null,
      coordinates: null
    };
    
    // Look for size information in infobox or text
    $('.infobox tr, .wikitable tr').each((i, row) => {
      const $row = $(row);
      const label = $row.find('th, td').first().text().toLowerCase();
      const value = $row.find('td').last().text().trim();
      
      if (label.includes('size') || label.includes('area')) {
        const sizeMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:km|square|sq)/i);
        if (sizeMatch) {
          sizeInfo.sizeKm = parseFloat(sizeMatch[1]);
        }
      }
      
      if (label.includes('coordinates') || label.includes('coordinate system')) {
        sizeInfo.coordinates = {
          system: value,
          description: value
        };
      }
    });
    
    // Also check for coordinate info in text
    const coordText = $('.mw-parser-output p').text();
    const coordMatch = coordText.match(/coordinates?\s+(?:range|system|from)\s+([^.]+)/i);
    if (coordMatch && !sizeInfo.coordinates) {
      sizeInfo.coordinates = {
        system: 'standard',
        description: coordMatch[1].trim()
      };
    }
    
    return sizeInfo;
  }

  /**
   * Extract obelisk locations from map page
   */
  extractObelisks($) {
    const obelisks = [];
    
    // Look for obelisk information
    $('h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase();
      
      if (headingText.includes('obelisk') || headingText.includes('terminal')) {
        // Get content after this heading
        const $content = $heading.nextUntil('h1, h2, h3, h4');
        
        $content.find('li, tr').each((j, item) => {
          const $item = $(item);
          const text = $item.text();
          
          const colorMatch = text.match(/(red|blue|green|yellow|purple)\s*obelisk/i);
          if (colorMatch) {
            const color = colorMatch[1].toLowerCase();
            const coordMatch = text.match(/(\d+\.?\d*),?\s*(\d+\.?\d*)/);
            
            obelisks.push({
              name: `${color.charAt(0).toUpperCase() + color.slice(1)} Obelisk`,
              color: color,
              coordinates: coordMatch ? {
                lat: parseFloat(coordMatch[1]),
                lon: parseFloat(coordMatch[2])
              } : null,
              description: text.trim()
            });
          }
        });
      }
    });
    
    return obelisks;
  }

  /**
   * Extract artifact information
   */
  extractArtifacts($) {
    const artifacts = [];
    
    $('h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase();
      
      if (headingText.includes('artifact') || headingText.includes('cave') || headingText.includes('dungeon')) {
        const $content = $heading.nextUntil('h1, h2, h3, h4');
        
        $content.find('a[href*="Artifact"]').each((j, link) => {
          const $link = $(link);
          const name = $link.text().trim();
          const href = $link.attr('href');
          
          if (name && !artifacts.find(a => a.name === name)) {
            artifacts.push({
              name: name,
              wikiUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}${href}`) : null,
              location: $link.closest('li, tr, p').text().trim()
            });
          }
        });
      }
    });
    
    return artifacts;
  }

  /**
   * Extract boss information
   */
  extractBosses($) {
    const bosses = [];
    
    $('a[href*="Boss"], a[href*="boss"]').each((i, link) => {
      const $link = $(link);
      const name = $link.text().trim();
      const href = $link.attr('href');
      
      if (name && name.length > 3 && !bosses.find(b => b.name === name)) {
        bosses.push({
          name: name,
          wikiUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}${href}`) : null,
          context: $link.closest('li, tr, p').text().trim()
        });
      }
    });
    
    return bosses;
  }

  /**
   * Extract explorer notes
   */
  extractExplorerNotes($) {
    const notes = [];
    
    $('h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase();
      
      if (headingText.includes('explorer note') || headingText.includes('dossier')) {
        const $content = $heading.nextUntil('h1, h2, h3, h4');
        
        $content.find('li, tr').each((j, item) => {
          const $item = $(item);
          const text = $item.text().trim();
          
          if (text.length > 10 && text.length < 200) {
            notes.push({
              content: text,
              type: headingText.includes('dossier') ? 'dossier' : 'explorer_note'
            });
          }
        });
      }
    });
    
    return notes;
  }

  /**
   * Helper functions for map classification
   */
  determineMapType(typeText) {
    const text = typeText.toLowerCase();
    if (text.includes('dlc') || text.includes('expansion')) return 'expansion';
    if (text.includes('mod') || text.includes('community')) return 'mod';
    if (text.includes('free') || text.includes('official')) return 'official';
    return 'official';
  }

  isOfficialMap(typeText) {
    const text = typeText.toLowerCase();
    return !text.includes('mod') && !text.includes('community') && !text.includes('unofficial');
  }

  isFreeMap(typeText) {
    const text = typeText.toLowerCase();
    return !text.includes('dlc') && !text.includes('expansion') && !text.includes('paid');
  }

  isMapPage(name, href) {
    if (!name || !href) return false;
    
    const mapNames = [
      'the island', 'the center', 'scorched earth', 'ragnarok', 'aberration',
      'extinction', 'valguero', 'genesis', 'crystal isles', 'lost island',
      'fjordur', 'the center'
    ];
    
    const nameMatch = mapNames.some(mapName => 
      name.toLowerCase().includes(mapName) || 
      href.toLowerCase().includes(mapName.replace(/\s+/g, '_'))
    );
    
    return nameMatch && !href.includes('#') && !href.includes('Category:');
  }
}

module.exports = WikiDataService;
