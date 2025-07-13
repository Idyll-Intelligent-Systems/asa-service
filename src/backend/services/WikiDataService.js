const axios = require('axios');
const cheerio = require('cheerio');

class WikiDataService {
  constructor() {
    this.baseUrl = 'https://ark.wiki.gg';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
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
}

module.exports = WikiDataService;
