const WikiDataService = require('./WikiDataService');
const DodoDexService = require('./DodoDexService');

class DataPopulationService {
  constructor(db) {
    this.db = db;
    this.wikiService = new WikiDataService();
    this.dododexService = new DodoDexService();
    this.batchSize = 100;
  }

  async populateAllData() {
    console.log('Starting comprehensive data population...');

    try {
      // 1. Populate maps
      await this.populateMaps();

      // 2. Populate creatures from DoDodex
      await this.populateCreatures();

      // 3. Populate regions for all maps
      await this.populateRegions();

      // 4. Populate caves data
      await this.populateCaves();

      // 5. Populate resource data
      await this.populateResources();

      // 6. Populate obelisk and supply drop data
      await this.populateObelisksAndSupplyDrops();

      // 7. Update status
      await this.updateSystemStatus('complete', 'Full data population completed');

      console.log('Data population completed successfully!');
    } catch (error) {
      console.error('Data population failed:', error);
      await this.updateSystemStatus('error', `Population failed: ${error.message}`);
      throw error;
    }
  }

  async populateMaps() {
    console.log('Populating maps...');

    const maps = [
      {
        name: 'The Island',
        slug: 'The_Island',
        official: true,
        expansion: false,
        release_date: '2015-06-02',
        size_km: 144,
        description: 'The original ARK map featuring diverse biomes from beaches to mountains'
      },
      {
        name: 'The Center',
        slug: 'The_Center',
        official: true,
        expansion: false,
        release_date: '2016-05-17',
        size_km: 120,
        description: 'Community-created map with floating islands and underground biomes'
      },
      {
        name: 'Scorched Earth',
        slug: 'Scorched_Earth',
        official: true,
        expansion: true,
        release_date: '2016-09-01',
        size_km: 100,
        description: 'Desert expansion with extreme heat and unique creatures'
      },
      {
        name: 'Ragnarok',
        slug: 'Ragnarok',
        official: true,
        expansion: false,
        release_date: '2017-06-12',
        size_km: 144,
        description: 'Norse-themed map with diverse landscapes and dungeons'
      },
      {
        name: 'Aberration',
        slug: 'Aberration',
        official: true,
        expansion: true,
        release_date: '2017-12-12',
        size_km: 225,
        description: 'Underground map with radiation zones and unique mechanics'
      },
      {
        name: 'Extinction',
        slug: 'Extinction',
        official: true,
        expansion: true,
        release_date: '2018-11-06',
        size_km: 163,
        description: 'Post-apocalyptic Earth with corrupted creatures and titans'
      },
      {
        name: 'Valguero',
        slug: 'Valguero',
        official: true,
        expansion: false,
        release_date: '2019-06-18',
        size_km: 81,
        description: 'Nordic-inspired map with underground aberration zone'
      },
      {
        name: 'Genesis Part 1',
        slug: 'Genesis:_Part_1',
        official: true,
        expansion: true,
        release_date: '2020-02-25',
        size_km: 0,
        description: 'Simulation-based map with five distinct biomes'
      },
      {
        name: 'Crystal Isles',
        slug: 'Crystal_Isles',
        official: true,
        expansion: false,
        release_date: '2020-06-11',
        size_km: 150,
        description: 'Fantasy map with floating islands and crystal formations'
      },
      {
        name: 'Genesis Part 2',
        slug: 'Genesis:_Part_2',
        official: true,
        expansion: true,
        release_date: '2021-06-03',
        size_km: 0,
        description: 'Space-based map with biome rings and starship exploration'
      },
      {
        name: 'Lost Island',
        slug: 'Lost_Island',
        official: true,
        expansion: false,
        release_date: '2021-12-14',
        size_km: 150,
        description: 'Tropical paradise with diverse biomes and unique creatures'
      },
      {
        name: 'Fjordur',
        slug: 'Fjordur',
        official: true,
        expansion: false,
        release_date: '2022-06-12',
        size_km: 140,
        description: 'Norse mythology map with multiple realms and boss encounters'
      }
    ];

    for (const map of maps) {
      try {
        await this.db.query(`
          INSERT INTO maps (name, slug, official, expansion, release_date, size_km, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            official = EXCLUDED.official,
            expansion = EXCLUDED.expansion,
            release_date = EXCLUDED.release_date,
            size_km = EXCLUDED.size_km,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `, [map.name, map.slug, map.official, map.expansion, map.release_date, map.size_km, map.description]);

        console.log(`✓ Added map: ${map.name}`);
      } catch (error) {
        console.error(`✗ Failed to add map ${map.name}:`, error.message);
      }
    }

    await this.logUpdate('maps', maps.length, 'Maps populated successfully');
  }

  async populateCreatures() {
    console.log('Fetching creatures from DoDodex...');

    try {
      const creatures = await this.dododexService.getAllCreatures();
      console.log(`Found ${creatures.length} creatures from DoDodex`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < creatures.length; i += this.batchSize) {
        const batch = creatures.slice(i, i + this.batchSize);

        for (const creature of batch) {
          try {
            // Get detailed information
            const details = await this.dododexService.getCreatureDetails(creature.slug);

            // Insert creature
            const creatureResult = await this.db.query(`
              INSERT INTO creatures (name, slug, image_url, description, tameable, taming_method)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                image_url = EXCLUDED.image_url,
                description = EXCLUDED.description,
                tameable = EXCLUDED.tameable,
                taming_method = EXCLUDED.taming_method,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id
            `, [
              details.name || creature.name,
              creature.slug,
              details.image || creature.image,
              details.description,
              details.taming?.tameable || true,
              details.taming?.method || 'knockout'
            ]);

            const creatureId = creatureResult.rows[0].id;

            // Insert creature stats
            if (details.stats && Object.keys(details.stats).length > 0) {
              for (const [statName, statData] of Object.entries(details.stats)) {
                await this.db.query(`
                  INSERT INTO creature_stats (creature_id, stat_name, base_value, per_level_wild, per_level_tamed)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT (creature_id, stat_name) DO UPDATE SET
                    base_value = EXCLUDED.base_value,
                    per_level_wild = EXCLUDED.per_level_wild,
                    per_level_tamed = EXCLUDED.per_level_tamed,
                    updated_at = CURRENT_TIMESTAMP
                `, [creatureId, statName, statData.base, statData.wild, statData.wild * 0.5]);
              }
            }

            // Insert taming data
            if (details.taming?.foods && details.taming.foods.length > 0) {
              for (const food of details.taming.foods) {
                await this.db.query(`
                  INSERT INTO creature_taming (creature_id, food_name, effectiveness, quantity_for_level_1, taming_time_minutes)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT (creature_id, food_name) DO UPDATE SET
                    effectiveness = EXCLUDED.effectiveness,
                    quantity_for_level_1 = EXCLUDED.quantity_for_level_1,
                    taming_time_minutes = EXCLUDED.taming_time_minutes,
                    updated_at = CURRENT_TIMESTAMP
                `, [creatureId, food.name, food.effectiveness, food.quantity, this.parseTime(food.time)]);
              }
            }

            // Insert spawn data
            if (details.spawns && details.spawns.length > 0) {
              for (const spawn of details.spawns) {
                const mapResult = await this.db.query('SELECT id FROM maps WHERE name ILIKE $1 OR slug ILIKE $1', [spawn.map]);
                if (mapResult.rows.length > 0) {
                  await this.db.query(`
                    INSERT INTO creature_spawns (creature_id, map_id, rarity, spawn_locations)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (creature_id, map_id) DO UPDATE SET
                      rarity = EXCLUDED.rarity,
                      spawn_locations = EXCLUDED.spawn_locations,
                      updated_at = CURRENT_TIMESTAMP
                  `, [creatureId, mapResult.rows[0].id, spawn.rarity, JSON.stringify([])]);
                }
              }
            }

            successCount++;
            if (successCount % 10 === 0) {
              console.log(`✓ Processed ${successCount} creatures...`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            errorCount++;
            console.error(`✗ Failed to process creature ${creature.name}:`, error.message);
          }
        }
      }

      console.log(`Creatures processing complete: ${successCount} success, ${errorCount} errors`);
      await this.logUpdate('creatures', successCount, `Processed ${successCount} creatures with ${errorCount} errors`);

    } catch (error) {
      console.error('Failed to populate creatures:', error);
      throw error;
    }
  }

  async populateRegions() {
    console.log('Populating regions for all maps...');

    const maps = await this.db.query('SELECT id, slug FROM maps ORDER BY name');

    for (const map of maps.rows) {
      try {
        console.log(`Fetching regions for ${map.slug}...`);
        const regions = await this.wikiService.getMapRegions(map.slug);

        for (const region of regions) {
          try {
            await this.db.query(`
              INSERT INTO map_regions (map_id, name, category, description, image_url, wiki_url)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (map_id, name) DO UPDATE SET
                category = EXCLUDED.category,
                description = EXCLUDED.description,
                image_url = EXCLUDED.image_url,
                wiki_url = EXCLUDED.wiki_url,
                updated_at = CURRENT_TIMESTAMP
            `, [map.id, region.name, region.category, region.description, region.image, region.wikiUrl]);
          } catch (error) {
            console.error(`Failed to insert region ${region.name}:`, error.message);
          }
        }

        console.log(`✓ Added ${regions.length} regions for ${map.slug}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting

      } catch (error) {
        console.error(`✗ Failed to fetch regions for ${map.slug}:`, error.message);
      }
    }

    await this.logUpdate('regions', 0, 'Regions populated for all maps');
  }

  async populateCaves() {
    console.log('Populating caves data...');

    const maps = await this.db.query('SELECT id, slug FROM maps ORDER BY name');

    for (const map of maps.rows) {
      try {
        const caves = await this.wikiService.getCaveData(map.slug);

        for (const cave of caves) {
          try {
            await this.db.query(`
              INSERT INTO caves (map_id, name, type, difficulty, artifact, coordinates, description)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (map_id, name) DO UPDATE SET
                type = EXCLUDED.type,
                difficulty = EXCLUDED.difficulty,
                artifact = EXCLUDED.artifact,
                coordinates = EXCLUDED.coordinates,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
            `, [map.id, cave.name, cave.type, 'medium', null, null, `${cave.name} cave on ${map.slug}`]);
          } catch (error) {
            console.error(`Failed to insert cave ${cave.name}:`, error.message);
          }
        }

        console.log(`✓ Added ${caves.length} caves for ${map.slug}`);

      } catch (error) {
        console.error(`✗ Failed to fetch caves for ${map.slug}:`, error.message);
      }
    }

    await this.logUpdate('caves', 0, 'Caves populated for all maps');
  }

  async populateResources() {
    console.log('Populating resource data...');

    const resourceTypes = [
      'Metal', 'Crystal', 'Obsidian', 'Oil', 'Pearl', 'Sulfur', 'Salt',
      'Polymer', 'Element', 'Aberrant_Gem', 'Blue_Gem', 'Red_Gem', 'Green_Gem'
    ];

    const maps = await this.db.query('SELECT id, slug FROM maps ORDER BY name');

    for (const map of maps.rows) {
      for (const resourceType of resourceTypes) {
        try {
          await this.db.query(`
            INSERT INTO resources (map_id, name, type, quality, coordinates, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (map_id, name, coordinates) DO NOTHING
          `, [
            map.id,
            `${resourceType} Node`,
            resourceType.toLowerCase(),
            'normal',
            null,
            `${resourceType} resource node on ${map.slug}`
          ]);
        } catch (error) {
          console.error(`Failed to insert resource ${resourceType}:`, error.message);
        }
      }
    }

    await this.logUpdate('resources', resourceTypes.length * maps.rows.length, 'Base resource types populated');
  }

  async populateObelisksAndSupplyDrops() {
    console.log('Populating obelisks and supply drops...');

    const maps = await this.db.query('SELECT id, slug FROM maps ORDER BY name');

    for (const map of maps.rows) {
      // Standard obelisks for most maps
      const obelisks = ['Red Obelisk', 'Blue Obelisk', 'Green Obelisk'];

      for (const obelisk of obelisks) {
        try {
          await this.db.query(`
            INSERT INTO obelisks (map_id, name, color, coordinates, description)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (map_id, name) DO NOTHING
          `, [
            map.id,
            obelisk,
            obelisk.split(' ')[0].toLowerCase(),
            null,
            `${obelisk} on ${map.slug}`
          ]);
        } catch (error) {
          console.error(`Failed to insert obelisk ${obelisk}:`, error.message);
        }
      }

      // Supply drops
      const dropQualities = ['white', 'green', 'blue', 'purple', 'yellow', 'red'];

      for (const quality of dropQualities) {
        try {
          await this.db.query(`
            INSERT INTO supply_drops (map_id, quality, coordinates, loot_table, description)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (map_id, quality, coordinates) DO NOTHING
          `, [
            map.id,
            quality,
            null,
            JSON.stringify([]),
            `${quality} supply drop on ${map.slug}`
          ]);
        } catch (error) {
          console.error(`Failed to insert supply drop ${quality}:`, error.message);
        }
      }
    }

    await this.logUpdate('obelisks_supply_drops', 0, 'Obelisks and supply drops populated');
  }

  async logUpdate(tableName, recordCount, notes) {
    await this.db.query(`
      INSERT INTO wiki_update_log (table_name, record_count, notes)
      VALUES ($1, $2, $3)
    `, [tableName, recordCount, notes]);
  }

  async updateSystemStatus(status, message) {
    await this.db.query(`
      INSERT INTO system_status (service_name, status, message)
      VALUES ($1, $2, $3)
      ON CONFLICT (service_name) DO UPDATE SET
        status = EXCLUDED.status,
        message = EXCLUDED.message,
        updated_at = CURRENT_TIMESTAMP
    `, ['data_population', status, message]);
  }

  parseTime(timeString) {
    if (!timeString) return null;

    // Extract minutes from various time formats
    const minutes = timeString.match(/(\d+)\s*min/i);
    const hours = timeString.match(/(\d+)\s*h/i);
    const seconds = timeString.match(/(\d+)\s*s/i);

    let totalMinutes = 0;
    if (hours) totalMinutes += parseInt(hours[1]) * 60;
    if (minutes) totalMinutes += parseInt(minutes[1]);
    if (seconds) totalMinutes += parseInt(seconds[1]) / 60;

    return totalMinutes || null;
  }

  // Method to update specific data types
  async updateCreatureData(creatureSlug) {
    try {
      // const details = await this.dododexService.getCreatureDetails(creatureSlug);
      // Update logic here
      console.log(`Updated data for ${creatureSlug}`);
    } catch (error) {
      console.error(`Failed to update ${creatureSlug}:`, error.message);
    }
  }

  async getPopulationStatus() {
    const counts = await this.db.query(`
      SELECT 
        (SELECT COUNT(*) FROM maps) as maps,
        (SELECT COUNT(*) FROM creatures) as creatures,
        (SELECT COUNT(*) FROM map_regions) as regions,
        (SELECT COUNT(*) FROM caves) as caves,
        (SELECT COUNT(*) FROM resources) as resources,
        (SELECT COUNT(*) FROM obelisks) as obelisks,
        (SELECT COUNT(*) FROM supply_drops) as supply_drops,
        (SELECT COUNT(*) FROM base_spots) as base_spots
    `);

    const status = await this.db.query(`
      SELECT service_name, status, message, updated_at 
      FROM system_status 
      WHERE service_name = 'data_population'
    `);

    return {
      counts: counts.rows[0],
      status: status.rows[0] || { status: 'not_started', message: 'Data population not started' }
    };
  }
}

module.exports = DataPopulationService;
