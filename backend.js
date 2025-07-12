const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const db = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'asa_maps'
});

const maps = [
  'Ragnarok','TheIsland','ScorchedEarth','Aberration','Extinction',
  'TheCenter','Valguero','Genesis1','Genesis2','CrystalIsles','Fjordur'
];

const categories = {
  resources: ['resource','listOfLatLong'],
  tames: ['tame','listOfLatLong_tame'],
  hidden_base: ['hiddenBaseLocation','listOfLatLong_base'],
  water_bases: ['waterBaseLocation','listOfLatLong_waterBase'],
  caves: ['caveLocation','listOfLatLong_cave'],
  drop: ['dropLocation','listOfLatLong_drop'],
  probable_enemy: ['probableEnemyLocation','listOfLatLong_enemy'],
  obelisk: ['obeliskLocation','listOfLatLong_obelisk']
};

async function initTameCalculator(){
  const dinos = ['Raptor','Rex','Trike','Spino'];
  await db.query('DROP TABLE IF EXISTS tame_calculator');
  await db.query('CREATE TABLE tame_calculator (dino TEXT, level INTEGER, arrows INTEGER)');
  for(const dino of dinos){
    for(let level=10; level<=150; level++){
      const arrows = Math.ceil(level * 1.1);
      await db.query('INSERT INTO tame_calculator(dino, level, arrows) VALUES ($1,$2,$3)', [dino, level, arrows]);
    }
  }
}

function tableName(map, type){
  return `${map.toLowerCase()}_${type}_lat_long`;
}

function parseLine(line){
  const fields = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes) {
      if (ch === '[') depth++;
      else if (ch === ']') depth--;

      if (ch === ',' && depth === 0) {
        fields.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
        continue;
      }
    }

    current += ch;
  }

  fields.push(current.trim().replace(/^"|"$/g, ''));
  return fields;
}

function parseCoords(str){
  str = str.trim();
  if (!str.startsWith('[')) return [];
  str = str.slice(1,-1);
  if(!str) return [];
  return str.split('),').map(p => {
    p = p.replace(/[()\[\]]/g,'').trim();
    const [a,b] = p.split(',').map(Number);
    return [a,b];
  });
}

async function loadMap(map){
  const file = path.join(__dirname,'data',`${map}.csv`);
  const lines = fs.readFileSync(file,'utf8').trim().split(/\r?\n/);
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  for(const type of Object.keys(categories)){
    const table = tableName(map, type);
    await db.query(`DROP TABLE IF EXISTS "${table}"`);
    await db.query(`CREATE TABLE "${table}" (name TEXT, lat DOUBLE PRECISION, lon DOUBLE PRECISION)`);
  }

  for(const row of rows){
    const obj = {};
    headers.forEach((h,i)=>{ obj[h]=row[i]; });
    for(const [type,[nameKey, coordKey]] of Object.entries(categories)){
      const table = tableName(map, type);
      const name = obj[nameKey];
      const coords = parseCoords(obj[coordKey]);
      for(const [lat,lon] of coords){
        await db.query(`INSERT INTO "${table}" (name, lat, lon) VALUES ($1,$2,$3)`,[name,lat,lon]);
      }
    }
  }
}

function haversine(lat1, lon1, lat2, lon2){
  const toRad = v => v * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function init(){
  await initTameCalculator();
  for(const m of maps){
    await loadMap(m);
  }
}

async function start(){
  await init();
  const app = express();
  app.use(express.json());
  const typeMap = {
    resource: 'resources',
    tame: 'tames',
    hidden: 'hidden_base',
    water: 'water_bases',
    cave: 'caves',
    drop: 'drop',
    enemy: 'probable_enemy',
    obelisk: 'obelisk'
  };

  app.post('/update_map', async (req, res) => {
    const { map } = req.body || {};
    if (!map) return res.status(400).json({ error: 'map required' });
    if (map === 'all') {
      for (const m of maps) {
        await loadMap(m);
      }
      return res.json({ status: 'ok' });
    }
    if (!maps.includes(map)) return res.status(400).json({ error: 'invalid map' });
    await loadMap(map);
    res.json({ status: 'ok' });
  });

  app.post('/types', async (req,res)=>{
    const { map, type } = req.body;
    if(!map || !type) return res.status(400).json({error:'map and type required'});
    if(!maps.includes(map)) return res.status(400).json({error:'invalid map'});
    const t = typeMap[type];
    if(!t) return res.status(400).json({error:'invalid type'});
    const table = tableName(map, t);
    const { rows } = await db.query(`SELECT DISTINCT name FROM "${table}"`);
    res.json(rows.map(r => r.name));

  });

  app.post('/nearest', async (req,res)=>{
    const { map, type, lat, lon } = req.body;
    if(!map || !type) return res.status(400).json({error:'map and type required'});
    if(!maps.includes(map)) return res.status(400).json({error:'invalid map'});
    const t = typeMap[type];
    if(!t) return res.status(400).json({error:'invalid type'});
    if(typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)){
      return res.status(400).json({error:'invalid coordinates'});
    }
    const table = tableName(map, t);
    const { rows } = await db.query(`SELECT name, lat, lon FROM "${table}"`);
    const results = rows.map(r => ({
      name: r.name,
      coords: [r.lat, r.lon],
      distance: haversine(lat, lon, r.lat, r.lon)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
    res.json(results);
  });

  app.get('/maps', (req, res) => {
    res.json(maps);
  });

  app.get('/types', (req, res) => {
    res.json(Object.keys(typeMap));
  });

  app.get('/names', async (req, res) => {
    const { map, type } = req.query;
    if(!map || !type) return res.status(400).json({error:'map and type required'});
    if(!maps.includes(map)) return res.status(400).json({error:'invalid map'});
    const t = typeMap[type];
    if(!t) return res.status(400).json({error:'invalid type'});
    const table = tableName(map, t);
    const { rows } = await db.query(`SELECT DISTINCT name FROM "${table}" ORDER BY name`);
    res.json(rows.map(r => r.name));
  });

  app.post('/tame_arrows', async (req,res)=>{
    const { dino, level } = req.body;
    if(!dino || typeof level !== 'number')
      return res.status(400).json({error:'dino and level required'});
    const { rows } = await db.query(
      'SELECT arrows FROM tame_calculator WHERE dino=$1 AND level=$2',[dino, level]
    );
    if(rows.length===0) return res.status(404).json({error:'not found'});
    res.json({ arrows: rows[0].arrows });
  });

  const port = process.env.PORT || 4000;
  app.use('/', express.static(path.join(__dirname,'frontend')));
  app.listen(port,()=>console.log(`Server running on ${port}`));
}

start().catch(err=>{console.error(err);process.exit(1);});
