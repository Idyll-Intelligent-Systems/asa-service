const axios = require('axios');
const cheerio = require('cheerio');

class DodoDexService {
  constructor() {
    this.baseUrl = 'https://www.dododex.com';
    this.cache = new Map();
    this.cacheExpiry = 12 * 60 * 60 * 1000; // 12 hours
  }

  /**
   * Fetch all taming data from Dododex
   */
  async fetchAllTamingData() {
    try {
      const creatures = await this.getAllCreatures();
      const tamingData = [];

      for (const creature of creatures) {
        try {
          const details = await this.getCreatureDetails(creature.slug);
          if (details && details.taming) {
            tamingData.push({
              name: creature.name,
              slug: creature.slug,
              dododexId: creature.slug,
              tamingMethod: details.taming.method || 'knockout',
              unconsciousTime: details.taming.unconsciousTime,
              tamingEffectiveness: details.taming.effectiveness || 100,
              preferredFoods: details.taming.foods || [],
              kibbleType: details.taming.kibble,
              torportDepletion: details.taming.torportDepletion,
              torportNeeded: details.taming.torportNeeded,
              feedingInterval: details.taming.feedingInterval,
              specialRequirements: details.taming.specialRequirements,
              notes: details.taming.notes
            });
          }
        } catch (error) {
          console.error(`Failed to fetch details for ${creature.name}:`, error.message);
        }
      }

      return tamingData;
    } catch (error) {
      console.error('Failed to fetch all taming data:', error.message);
      return [];
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

  async getAllCreatures() {
    const url = `${this.baseUrl}/dinosaurs`;
    const html = await this.fetchWithCache(url, 'all_creatures');
    const $ = cheerio.load(html);

    const creatures = [];

    // Parse creature cards from Dododex
    $('.dino-card, .creature-card, .tame-card').each((i, element) => {
      const $card = $(element);
      const $link = $card.find('a').first();
      const href = $link.attr('href');
      const name = $link.find('.name, .creature-name, h3, h4').text().trim() || $link.text().trim();
      const $img = $card.find('img').first();
      const image = $img.attr('src') || $img.attr('data-src');

      if (name && href) {
        creatures.push({
          name,
          slug: href.replace('/dinosaur/', '').replace('/', ''),
          image: image ? (image.startsWith('http') ? image : `${this.baseUrl}${image}`) : null,
          dododexUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`
        });
      }
    });

    // Alternative parsing method if the above doesn't work
    if (creatures.length === 0) {
      $('a[href*="/dinosaur/"]').each((i, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const name = $link.text().trim();

        if (name && name.length > 2 && name.length < 50) {
          const slug = href.replace('/dinosaur/', '').replace('/', '');
          creatures.push({
            name,
            slug,
            dododexUrl: `${this.baseUrl}${href}`
          });
        }
      });
    }

    // Remove duplicates
    const uniqueCreatures = creatures.filter((creature, index, self) =>
      index === self.findIndex(c => c.name === creature.name)
    );

    return uniqueCreatures;
  }

  async getCreatureDetails(creatureSlug) {
    const url = `${this.baseUrl}/dinosaur/${creatureSlug}`;
    const html = await this.fetchWithCache(url, `creature_${creatureSlug}`);
    const $ = cheerio.load(html);

    const details = {
      slug: creatureSlug,
      name: $('.creature-title, .dino-name, h1').first().text().trim(),
      image: null,
      stats: {},
      taming: {},
      spawns: [],
      kibble: null,
      description: $('.description, .creature-description').first().text().trim()
    };

    // Extract creature image
    const $mainImg = $('.creature-image img, .dino-image img, .main-image img').first();
    if ($mainImg.length) {
      details.image = $mainImg.attr('src') || $mainImg.attr('data-src');
      if (details.image && !details.image.startsWith('http')) {
        details.image = `${this.baseUrl}${details.image}`;
      }
    }

    // Extract base stats
    $('.stat-row, .stats-table tr').each((i, element) => {
      const $row = $(element);
      const statName = $row.find('.stat-name, td:first-child').text().trim().toLowerCase();
      const baseValue = $row.find('.base-value, .stat-base, td:nth-child(2)').text().trim();
      const wildValue = $row.find('.wild-value, .stat-wild, td:nth-child(3)').text().trim();

      if (statName && baseValue) {
        details.stats[statName.replace(/\s+/g, '_')] = {
          base: parseFloat(baseValue) || 0,
          wild: parseFloat(wildValue) || 0
        };
      }
    });

    // Extract taming information
    details.taming = await this.extractTamingData($, creatureSlug);

    // Extract spawn maps
    $('.spawn-map, .map-spawn').each((i, element) => {
      const $spawn = $(element);
      const mapName = $spawn.find('.map-name, .spawn-map-name').text().trim();
      const rarity = $spawn.find('.rarity, .spawn-rarity').text().trim();

      if (mapName) {
        details.spawns.push({
          map: mapName,
          rarity: rarity || 'unknown'
        });
      }
    });

    return details;
  }

  async extractTamingData($, _creatureSlug) {
    const taming = {
      tameable: true,
      method: 'knockout',
      foods: [],
      time: {},
      effectiveness: {},
      narcotic_requirements: {}
    };

    // Check if creature is tameable
    if ($('.not-tameable, .cannot-tame').length > 0) {
      taming.tameable = false;
      return taming;
    }

    // Determine taming method
    if ($('.passive-tame, .hand-feed').length > 0) {
      taming.method = 'passive';
    } else if ($('.special-tame').length > 0) {
      taming.method = 'special';
    }

    // Extract preferred foods
    $('.food-item, .taming-food').each((i, element) => {
      const $food = $(element);
      const foodName = $food.find('.food-name, .name').text().trim();
      const effectiveness = $food.find('.effectiveness, .eff').text().trim();
      const quantity = $food.find('.quantity, .qty').text().trim();
      const time = $food.find('.time, .taming-time').text().trim();

      if (foodName) {
        taming.foods.push({
          name: foodName,
          effectiveness: parseFloat(effectiveness) || 0,
          quantity: parseInt(quantity) || 0,
          time
        });
      }
    });

    // Extract taming times for different levels
    $('.level-time, .taming-calculator tr').each((i, element) => {
      const $row = $(element);
      const level = $row.find('.level').text().trim();
      const time = $row.find('.time').text().trim();
      const narcotics = $row.find('.narcotics, .narcotic').text().trim();

      if (level && time) {
        taming.time[level] = time;
        if (narcotics) {
          taming.narcotic_requirements[level] = parseInt(narcotics) || 0;
        }
      }
    });

    return taming;
  }

  async getTamingCalculator(creatureSlug, level, food) {
    const url = `${this.baseUrl}/taming/${creatureSlug}`;
    const html = await this.fetchWithCache(url, `taming_${creatureSlug}`);
    const $ = cheerio.load(html);

    const calculator = {
      creature: creatureSlug,
      level,
      food,
      results: {}
    };

    // This would typically involve API calls to Dododex's calculator
    // For now, we'll parse static data from the page
    $('.calculator-result, .taming-result').each((i, element) => {
      const $result = $(element);
      const foodType = $result.find('.food-type').text().trim();
      const quantity = $result.find('.quantity').text().trim();
      const time = $result.find('.time').text().trim();
      const effectiveness = $result.find('.effectiveness').text().trim();
      const narcotics = $result.find('.narcotics').text().trim();

      if (foodType) {
        calculator.results[foodType] = {
          quantity: parseInt(quantity) || 0,
          time,
          effectiveness: parseFloat(effectiveness) || 0,
          narcotics: parseInt(narcotics) || 0
        };
      }
    });

    return calculator;
  }

  async getKibbleRecipes() {
    const url = `${this.baseUrl}/kibble`;
    const html = await this.fetchWithCache(url, 'kibble_recipes');
    const $ = cheerio.load(html);

    const kibbles = [];

    $('.kibble-recipe, .recipe-card').each((i, element) => {
      const $recipe = $(element);
      const name = $recipe.find('.kibble-name, .recipe-name').text().trim();
      const egg = $recipe.find('.egg-type, .main-ingredient').text().trim();
      const ingredients = [];

      $recipe.find('.ingredient, .recipe-ingredient').each((j, ingElement) => {
        const $ing = $(ingElement);
        const ingName = $ing.find('.ingredient-name, .name').text().trim();
        const quantity = $ing.find('.quantity, .amount').text().trim();

        if (ingName) {
          ingredients.push({
            name: ingName,
            quantity: parseInt(quantity) || 1
          });
        }
      });

      if (name && egg) {
        kibbles.push({
          name,
          egg,
          ingredients,
          description: $recipe.find('.description').text().trim()
        });
      }
    });

    return kibbles;
  }

  async getBreedingInfo(creatureSlug) {
    const url = `${this.baseUrl}/breeding/${creatureSlug}`;
    const html = await this.fetchWithCache(url, `breeding_${creatureSlug}`);
    const $ = cheerio.load(html);

    const breeding = {
      creature: creatureSlug,
      mating_interval: null,
      gestation_time: null,
      egg_hatch_time: null,
      baby_time: null,
      juvenile_time: null,
      adolescent_time: null,
      food_consumption: {},
      temperature_requirements: {}
    };

    // Extract breeding times
    $('.breeding-time, .breed-info').each((i, element) => {
      const $info = $(element);
      const label = $info.find('.label, .time-label').text().trim().toLowerCase();
      const value = $info.find('.value, .time-value').text().trim();

      if (label.includes('mating')) {
        breeding.mating_interval = value;
      } else if (label.includes('gestation')) {
        breeding.gestation_time = value;
      } else if (label.includes('hatch')) {
        breeding.egg_hatch_time = value;
      } else if (label.includes('baby')) {
        breeding.baby_time = value;
      } else if (label.includes('juvenile')) {
        breeding.juvenile_time = value;
      } else if (label.includes('adolescent')) {
        breeding.adolescent_time = value;
      }
    });

    return breeding;
  }

  async searchCreatures(query) {
    const allCreatures = await this.getAllCreatures();
    const searchTerm = query.toLowerCase();

    return allCreatures.filter(creature =>
      creature.name.toLowerCase().includes(searchTerm) ||
      creature.slug.toLowerCase().includes(searchTerm)
    );
  }

  // Helper method to calculate optimal taming strategy
  calculateOptimalTaming(creatureData, targetLevel, availableFood) {
    const { foods } = creatureData.taming;

    // Filter available foods
    const viableOptions = foods.filter(food =>
      availableFood.includes(food.name.toLowerCase())
    );

    // Sort by effectiveness
    viableOptions.sort((a, b) => b.effectiveness - a.effectiveness);

    return {
      recommended: viableOptions[0] || null,
      alternatives: viableOptions.slice(1, 4),
      total_options: viableOptions.length
    };
  }
}

module.exports = DodoDexService;
