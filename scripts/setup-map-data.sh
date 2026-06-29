#!/usr/bin/env bash
# Downloads OpenStreetMap data and pre-processes it for the self-hosted OSRM container.
# Nominatim imports the same PBF file on its first startup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MAP_REGION_URL="${MAP_REGION_URL:-https://download.geofabrik.de/north-america/us/north-carolina-latest.osm.pbf}"
MAP_BASENAME="${MAP_BASENAME:-region}"
OSRM_IMAGE="${OSRM_IMAGE:-ghcr.io/project-osrm/osrm-backend:latest}"

PBF_FILE="${MAP_BASENAME}.osm.pbf"
OSRM_FILE="${MAP_BASENAME}.osrm"
DATA_DIR="data/map"

mkdir -p "$DATA_DIR"

if [ ! -f "${DATA_DIR}/${PBF_FILE}" ]; then
  echo "==> Downloading map data from ${MAP_REGION_URL}"
  echo "    (change MAP_REGION_URL in .env for a different region)"
  wget -O "${DATA_DIR}/${PBF_FILE}" "$MAP_REGION_URL"
else
  echo "==> Map data already exists at ${DATA_DIR}/${PBF_FILE}"
fi

if [ ! -f "${DATA_DIR}/${OSRM_FILE}" ]; then
  echo "==> Processing OSRM routing data (may take several minutes on a Raspberry Pi)..."
  docker run --rm -t \
    -v "${PROJECT_DIR}/${DATA_DIR}:/data" \
    "$OSRM_IMAGE" \
    osrm-extract -p /opt/car.lua "/data/${PBF_FILE}"

  docker run --rm -t \
    -v "${PROJECT_DIR}/${DATA_DIR}:/data" \
    "$OSRM_IMAGE" \
    osrm-partition "/data/${OSRM_FILE}"

  docker run --rm -t \
    -v "${PROJECT_DIR}/${DATA_DIR}:/data" \
    "$OSRM_IMAGE" \
    osrm-customize "/data/${OSRM_FILE}"

  echo "==> OSRM data ready at ${DATA_DIR}/${OSRM_FILE}"
else
  echo "==> OSRM data already exists at ${DATA_DIR}/${OSRM_FILE}"
fi

echo ""
echo "Setup complete. Start the stack with:"
echo "  docker compose up -d --build"
echo ""
echo "Note: Nominatim imports ${PBF_FILE} on first startup and may take 30+ minutes."
