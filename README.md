# ASA Maps Full Package

This directory provides a sample service that loads ARK Survival Ascended map data from CSV files into PostgreSQL and exposes an API for finding the nearest locations. A minimal HTML UI is included for manual queries.

For an overview of our GitHub enterprise and services, see [docs/GITHUB_ENTERPRISE.md](docs/GITHUB_ENTERPRISE.md).

## Contents

 - `data/` – CSV files per map
   (coordinates sourced from the official ARK wiki using `fetch_wiki_coords.sh`)
- `backend.js` – Node server that imports the CSVs and exposes `/nearest`
- `frontend/` – Static HTML page and Dockerfile for an nginx container


## How to Run Backend and Frontend

### Windows

1. Install **Node.js 18+**, **PostgreSQL**, and **Nginx** (use Chocolatey or official installers).
2. Start PostgreSQL and create the database `asa_maps` with user `postgres`/`postgres`.
3. In VS Code terminal, install backend dependencies:
   ```powershell
   npm install express pg
   ```
4. Start the backend:
   ```powershell
   node backend.js
   ```
5. Copy `frontend\nginx.conf` to your Nginx config directory (e.g., `C:\nginx\conf\nginx.conf`).
   Copy `frontend\index.html` to your Nginx html directory (e.g., `C:\nginx\html\index.html`).
6. Start Nginx:
   ```powershell
   Start-Process "C:\nginx\nginx.exe"
   ```
7. Access the frontend at `http://localhost:8080` and backend API at `http://localhost:4000`.

### Linux/macOS

1. Install **Node.js 18+**, **PostgreSQL**, and **Nginx**.
2. Start PostgreSQL and create the database `asa_maps` with user `postgres`/`postgres`.
3. In terminal, install backend dependencies:
   ```bash
   npm install express pg
   ```
4. Start the backend:
   ```bash
   node backend.js
   ```
5. Copy `frontend/nginx.conf` to your Nginx config directory (e.g., `/etc/nginx/nginx.conf`).
   Copy `frontend/index.html` to your Nginx html directory (e.g., `/usr/share/nginx/html/index.html`).
6. Start Nginx:
   ```bash
   sudo systemctl start nginx
   # or
   sudo nginx
   ```
7. Access the frontend at `http://localhost:8080` and backend API at `http://localhost:4000`.

Alternatively, run the helper script for your platform:
```bash
./install_deps_linux.sh      # Linux
./install_deps_macos.sh      # macOS
```

---

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