# ASA Maps API curl examples

This document shows how to interact with the ASA Maps service using `curl`.
The backend starts on port `4000` when running `./ASA_Maps_FullTables/run.sh`
or the compose file. Replace `localhost` if your server uses a different host.

## List available maps

```bash
curl http://localhost:4000/maps
```

## List map categories

```bash
curl http://localhost:4000/types
```

## Get location names for a map and category

```bash
curl "http://localhost:4000/names?map=TheIsland&type=resource"
```

## Find the nearest point of interest

```bash
curl -X POST http://localhost:4000/nearest \
     -H 'Content-Type: application/json' \
     -d '{"map":"TheIsland","type":"resource","lat":50,"lon":50}'
```

## Update stored map data

```bash
# Refresh a single map
curl -X POST http://localhost:4000/update_map \
     -H 'Content-Type: application/json' \
     -d '{"map":"TheIsland"}'

# Reload data for all maps
curl -X POST http://localhost:4000/update_map \
     -H 'Content-Type: application/json' \
     -d '{"map":"all"}'
```

## Calculate tranq arrows required

```bash
curl -X POST http://localhost:4000/tame_arrows \
     -H 'Content-Type: application/json' \
     -d '{"dino":"Raptor","level":20}'
```
