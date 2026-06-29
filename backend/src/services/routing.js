const OSRM_URL = process.env.OSRM_URL || 'http://osrm:5000';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'http://nominatim:8082';

async function geocode(query) {
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'TripPlanner/1.0 (trip-planner-app)' },
  });

  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }

  const results = await response.json();
  return results.map((r) => ({
    name: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  }));
}

async function getRoute(from, to, avoidHighways = false) {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = new URL(`${OSRM_URL}/route/v1/driving/${coords}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'true');

  if (avoidHighways) {
    url.searchParams.set('exclude', 'motorway');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Routing service unavailable');
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Could not calculate route between stops');
  }

  const route = data.routes[0];
  const distanceMiles = route.distance * 0.000621371;
  const durationMinutes = route.duration / 60;

  const directions = [];
  for (const leg of route.legs || []) {
    for (const step of leg.steps || []) {
      const instruction = step.maneuver?.instruction || step.name || 'Continue';
      const stepMiles = (step.distance * 0.000621371).toFixed(1);
      directions.push(`${instruction} — ${stepMiles} mi`);
    }
  }

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    geometry: route.geometry,
    directionsText: directions.join('\n'),
  };
}

module.exports = { geocode, getRoute };
