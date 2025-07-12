# ASA Maps Full Package

This directory provides a sample service that loads ARK Survival Ascended map data from CSV files into PostgreSQL and exposes an API for finding the nearest locations. A minimal HTML UI is included for manual queries.

For an overview of our GitHub enterprise and services, see [docs/GITHUB_ENTERPRISE.md](docs/GITHUB_ENTERPRISE.md).

## Contents

 - `data/` – CSV files per map
   (coordinates sourced from the official ARK wiki using `fetch_wiki_coords.sh`)
- `backend.js` – Node server that imports the CSVs and exposes `/nearest`
- `frontend/` – Static HTML page and Dockerfile for an nginx container
- `run.sh` – helper to start the backend with the UI

## Quick Start

### Node & PostgreSQL


1. Install **Node.js 18 or newer**.
2. Start a PostgreSQL server listening on `localhost:5432`. The helper script `./run.sh` uses the default credentials `postgres` / `postgres` and the database `asa_maps`. If your setup differs, provide `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE` when running the script. A quick Docker example is:
   ```bash
   docker run --name asa-pg -p 5432:5432 \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=asa_maps \
     -d postgres:15
   ```
   (You can also skip manual setup and use `docker compose up --build`, which provisions the database automatically.)

3. Install the required packages:
   ```bash
   npm install express pg
   # or
   npm ci
   ```
4. Launch the service:
   ```bash
   ./run.sh
   ```
5. Open `http://localhost:4000` to access the web UI and query the nearest locations.

### Installing Dependencies

Run the helper script for your platform to install Node.js and other tools:

```bash
./install_deps_linux.sh      # Linux
./install_deps_macos.sh      # macOS
```

```powershell
./install_deps_windows.ps1   # Windows
```

These scripts install Node.js 18 (via your package manager), npm and `jq`, then run `npm install` to fetch the required packages.

### Docker Compose

1. Ensure Docker and Docker Compose are installed.
2. From this folder run:
   ```bash
   docker compose up --build
   ```
3. Navigate to `http://localhost:4000` once the containers are up. The compose file now starts a small nginx container that serves the static frontend and proxies requests to the backend service.

The database volume `db-data` keeps your data between runs.

To launch this service alongside the AI Assistant backend and UI, use
`scripts/run_all_e2e_linux.sh` (or the macOS/Windows variants) from the project
root.

### Compose with official data

The repository root also contains `asa-compose.yml`. This compose file
builds the image, runs `fetch_wiki_coords.sh` during the build and also launches an nginx container for the frontend so the
service starts with coordinates from the official ARK wiki. Run it from
the project root:

```bash
docker compose -f asa-compose.yml up --build
```

The application will be available on port `4000` when the containers are ready.

### Dockerfile.full

To run everything from a single image that also bundles PostgreSQL and nginx,
build the included `Dockerfile.full`:

```bash
docker build -f Dockerfile.full -t asa-maps-full .
```

Start the container and expose port `4000`:

```bash
docker run -p 4000:4000 asa-maps-full
```

The service will preload official coordinates during the build and the web UI
will be reachable at `http://localhost:4000` when the container starts.

### Push to Docker Hub

Set `DOCKER_USERNAME` and `DOCKER_PASSKEY` then run `./push_dockerhub.sh` to build
and push `idyll03/app:latest` to your Docker Hub account.

## CSV Schema

Each CSV contains columns for eight categories of points:
```
map,resource,listOfLatLong,tame,listOfLatLong_tame,hiddenBaseLocation,listOfLatLong_base,waterBaseLocation,listOfLatLong_waterBase,caveLocation,listOfLatLong_cave,dropLocation,listOfLatLong_drop,probableEnemyLocation,listOfLatLong_enemy,obeliskLocation,listOfLatLong_obelisk
```
Every `listOfLatLong*` entry holds ten coordinate pairs formatted as `[(lat,lon), ...]`.

When the service starts it creates eight tables per map:
```
<map>_resources_lat_long
<map>_tames_lat_long
<map>_hidden_base_lat_long
<map>_water_bases_lat_long
<map>_caves_lat_long
<map>_drop_lat_long
<map>_probable_enemy_lat_long
<map>_obelisk_lat_long
```
Each table stores a single location name together with latitude and longitude for each coordinate pair.

The included CSV files use randomly generated data and are meant as placeholders.
To populate the service with real locations, consult the official ASA documentation or ARK community wikis and fill each CSV with the accurate coordinates.


## Fetching wiki coordinates

The script `fetch_wiki_coords.sh` can pull real resource markers from the
official ARK wiki. It requires `curl` and `jq` to be installed:


```bash
sudo apt-get install jq
```


Run the script with a map name (for example `The_Island`) to print all groups and
their coordinates:

```bash
./fetch_wiki_coords.sh The_Island
```

Pass `--update` to overwrite the corresponding CSV file in `data/` with the
downloaded markers:


```bash
./fetch_wiki_coords.sh The_Island --update
```

Repeat for each map you wish to populate.
The updated CSVs will then contain the official wiki coordinates used by the service.