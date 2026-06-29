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
- **Docker Ready** — One-command deployment with PostgreSQL database container

## Quick Start (Raspberry Pi or Any Docker Host)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- On Raspberry Pi: Docker supports ARM64 natively — no extra configuration needed
- Internet access for routing and geocoding APIs (see External Services below)

### Install in Two Commands

```bash
git clone https://github.com/nibrocsolutions/trip-planner.git
cd trip-planner
cp .env.example .env   # optional: customize settings
docker compose up -d --build
```

Open your browser to **http://localhost:8081** (or `http://<your-pi-ip>:8081`).

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
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   OSRM (routing)      Nominatim (geocoding)
   project-osrm.org    openstreetmap.org
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
| `OSRM_URL` | `https://router.project-osrm.org` | OSRM routing API |
| `NOMINATIM_URL` | `https://nominatim.openstreetmap.org` | Nominatim geocoding API |
| `OCM_API_KEY` | (optional) | OpenChargeMap API key for superchargers |

### External Services

The app uses these free public APIs (no API keys required for basic use):

| Service | Provider | Purpose |
|---------|----------|---------|
| **OSRM** | [router.project-osrm.org](https://router.project-osrm.org) | Route calculation with highway avoidance |
| **Nominatim** | [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org) | Address search and geocoding |
| **OpenStreetMap** | [openstreetmap.org](https://www.openstreetmap.org) | Map tiles displayed in the browser |
| **OpenChargeMap** | [openchargemap.io](https://openchargemap.io) | Tesla supercharger locations (optional API key) |

> **Usage note:** The public Nominatim and OSRM servers are shared community resources. Please avoid heavy automated use. For production or high-traffic deployments, consider running your own instances or using a paid geocoding/routing provider.

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
npm run seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database:** Start PostgreSQL locally or run just the DB container:
```bash
docker compose up -d db
```

### Useful Commands

```bash
# View logs
docker compose logs -f

# Stop the application
docker compose down

# Stop and remove all data
docker compose down -v

# Rebuild after code changes
docker compose up -d --build

# Re-seed users (if DB is empty)
docker compose exec backend node src/seed.js
```

## Raspberry Pi Tips

- The app runs well on Pi 4/5 with 2GB+ RAM
- First build may take 10–15 minutes on Pi — subsequent starts are fast
- Access from other devices: `http://<pi-ip-address>:8081`
- For HTTPS, place a reverse proxy (Caddy/nginx) in front of the app
- Data persists in the `trip_planner_data` Docker volume

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
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT License — see [LICENSE](LICENSE) for details.
