# Trip Planner

A self-hosted road trip planning web application with interactive maps, scenic routing, Tesla supercharger discovery, and printable TripTik-style guides. Designed for easy deployment on a Raspberry Pi via Docker.

![Trip Planner](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

- **Interactive Map** — Plan routes with start, destination, and unlimited stops using OpenStreetMap
- **Avoid Highways** — Toggle scenic back-road routing (like Google/Apple Maps)
- **Tesla Superchargers** — Automatically finds supercharger locations along each route section
- **TripTik Printing** — Print each trip section with map, mileage, turn-by-turn directions, and charger info
- **User Authentication** — Separate admin and user accounts with role-based access
- **Admin Dashboard** — Create users, manage roles, reset passwords, enable/disable accounts
- **Fully Self-Hosted Routing** — OSRM and Nominatim run in their own Docker containers (no external API dependency for maps/routing)

## Quick Start (Raspberry Pi or Any Docker Host)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- On Raspberry Pi: Docker supports ARM64 natively — 4GB+ RAM recommended (Nominatim import is memory-intensive)
- ~500MB–2GB disk space for map data depending on region chosen

### Install

```bash
git clone https://github.com/nibrocsolutions/trip-planner.git
cd trip-planner
cp .env.example .env   # optional: customize region and settings
chmod +x scripts/setup-map-data.sh
./scripts/setup-map-data.sh
docker compose up -d --build
```

Open your browser to **http://localhost:8081** (or `http://<your-pi-ip>:8081`).

> **First startup note:** Nominatim imports the map data on its first run. This can take 30–90+ minutes depending on region size and hardware. Monitor progress with `docker compose logs -f nominatim`.

### Default Login Credentials

| Role  | Username     | Password   |
|-------|--------------|------------|
| Admin | `admin`      | `admin123` |
| User  | `roadtripper`| `user123`  |

> **Important:** Change these passwords after first login, especially if exposing the app on your network.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (nginx + React)          :8081        │
│  ├── Interactive map (Leaflet/OSM)              │
│  ├── Trip editor & TripTik print view           │
│  └── Admin panel                                │
├─────────────────────────────────────────────────┤
│  Backend (Node.js/Express)         :3001        │
│  ├── JWT authentication                         │
│  ├── Trip CRUD & route calculation              │
│  └── User management API                        │
├─────────────────────────────────────────────────┤
│  PostgreSQL 16                     :5432        │
│  └── Users, trips, stops, sections              │
├─────────────────────────────────────────────────┤
│  OSRM (routing)                    :5000        │
│  └── Driving directions & avoid-highways        │
├─────────────────────────────────────────────────┤
│  Nominatim (geocoding)             :8080        │
│  └── Address search & location lookup           │
└─────────────────────────────────────────────────┘
```

## Map Data & Self-Hosted Services

Trip Planner runs **OSRM** (routing) and **Nominatim** (geocoding) in separate containers. Both share the same OpenStreetMap extract stored in `data/map/`.

### Choosing a Map Region

Edit `MAP_REGION_URL` in `.env` to match where you plan trips. Smaller regions import faster on a Raspberry Pi.

| Region | URL | Approx. Size |
|--------|-----|--------------|
| Delaware (default) | `https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf` | ~25 MB |
| Tennessee | `https://download.geofabrik.de/north-america/us/tennessee-latest.osm.pbf` | ~250 MB |
| Full US | `https://download.geofabrik.de/north-america/us-latest.osm.pbf` | ~11 GB |

Browse more regions at [download.geofabrik.de](https://download.geofabrik.de/).

### Setup Script

`scripts/setup-map-data.sh` handles:

1. Downloading the OSM `.pbf` file for your chosen region
2. Pre-processing routing data for the OSRM container (`extract` → `partition` → `customize`)

Re-run the script after changing `MAP_REGION_URL` (delete `data/map/` first to force a fresh download).

```bash
# Change region, then re-setup
rm -rf data/map/*
./scripts/setup-map-data.sh
docker compose down
docker volume rm trip-planner_nominatim_data trip-planner_nominatim_flatnode 2>/dev/null || true
docker compose up -d --build
```

## Configuration

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `8081` | Web interface port |
| `POSTGRES_USER` | `tripplanner` | Database username |
| `POSTGRES_PASSWORD` | `tripplanner_secret` | Database password |
| `POSTGRES_DB` | `tripplanner` | Database name |
| `JWT_SECRET` | (change me) | Secret for auth tokens |
| `OSRM_URL` | `http://osrm:5000` | Self-hosted OSRM routing service |
| `NOMINATIM_URL` | `http://nominatim:8080` | Self-hosted Nominatim geocoding service |
| `MAP_REGION_URL` | Delaware extract | OSM data download URL |
| `MAP_BASENAME` | `region` | Base filename for map files |
| `NOMINATIM_PASSWORD` | `nominatim_secret` | Nominatim internal DB password |
| `NOMINATIM_SHM_SIZE` | `1g` | Shared memory for Nominatim import |
| `OCM_API_KEY` | (optional) | OpenChargeMap API key for superchargers |

### External Services

Only **OpenChargeMap** (Tesla supercharger lookup) and **OpenStreetMap map tiles** (displayed in the browser) use external services. Routing and address search are fully self-hosted.

## Usage Guide

### Planning a Trip

1. Sign in and click **New Trip**
2. Name your trip and add notes
3. Search and select your **Starting Location**
4. Click **+ Add Stop** for intermediate destinations
5. Search and select your **Final Destination**
6. Toggle **Avoid Highways** for scenic routes
7. Click **Save Trip** — routes and superchargers are calculated automatically

### Printing TripTik Guides

1. Open a saved trip and click **Print TripTik**
2. Each section prints with:
   - Route map
   - Distance and drive time
   - Turn-by-turn directions
   - Nearby Tesla superchargers
3. Print all sections or individual sections

### Admin Tasks

Admins can access the **Admin** panel to:

- View system statistics (users, trips)
- Create new users (admin or regular)
- Change user roles
- Enable/disable user accounts
- Reset passwords
- Delete users

## Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
cp ../.env.example .env
# Point OSRM_URL and NOMINATIM_URL to running containers or public fallbacks
npm run seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Map services only:**
```bash
./scripts/setup-map-data.sh
docker compose up -d db osrm nominatim
```

### Useful Commands

```bash
# View logs
docker compose logs -f

# Watch Nominatim import progress
docker compose logs -f nominatim

# Stop the application
docker compose down

# Stop and remove all data (including map imports)
docker compose down -v
rm -rf data/map/*

# Rebuild after code changes
docker compose up -d --build

# Re-seed users (if DB is empty)
docker compose exec backend node src/seed.js
```

## Raspberry Pi Tips

- Use a **small map region** (state or smaller) for reasonable import times
- Pi 4/5 with **4GB+ RAM** recommended for Nominatim
- First build may take 10–15 minutes on Pi — Nominatim import adds significant time
- Access from other devices: `http://<pi-ip-address>:8081`
- For HTTPS, place a reverse proxy (Caddy/nginx) in front of the app
- App data persists in Docker volumes; map files persist in `data/map/`

## Project Structure

```
trip-planner/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Routing & supercharger logic
│   │   └── seed.js    # Default user seeding
│   └── Dockerfile
├── frontend/          # React web application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   └── Dockerfile
├── scripts/
│   └── setup-map-data.sh  # Download & process OSM data
├── data/map/          # Shared OSM + OSRM files (gitignored)
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT License — see [LICENSE](LICENSE) for details.
