const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const ORS_API_KEY = process.env.ORS_API_KEY || '';

const FETCH_HEADERS = { 'User-Agent': 'TripPlanner/1.0 (trip-planner-app)' };

async function geocode(query) {
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), { headers: FETCH_HEADERS });

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
  if (avoidHighways && ORS_API_KEY) {
    try {
      return await getRouteFromOrs(from, to, true);
    } catch (err) {
      console.warn('OpenRouteService scenic routing failed, falling back to OSRM:', err.message);
    }
  }

  return getRouteFromOsrm(from, to, avoidHighways);
}

async function getRouteFromOsrm(from, to, avoidHighways) {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;

  async function requestRoute(useExclude) {
    const url = new URL(`${OSRM_URL}/route/v1/driving/${coords}`);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('steps', 'true');
    if (useExclude) {
      url.searchParams.set('exclude', 'motorway');
    }

    const response = await fetch(url.toString(), { headers: FETCH_HEADERS });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  let scenicFallback = false;
  let { response, data } = await requestRoute(avoidHighways);

  if (!response.ok && avoidHighways) {
    const excludeUnsupported =
      response.status === 400 &&
      (data.code === 'InvalidValue' || data.message?.toLowerCase().includes('exclude'));

    if (excludeUnsupported) {
      console.warn('OSRM server does not support highway avoidance; using standard route');
      ({ response, data } = await requestRoute(false));
      scenicFallback = true;
    }
  }

  if (!response.ok) {
    console.error('OSRM routing error:', response.status, data);
    throw new Error(data.message || `Routing service unavailable (${response.status})`);
  }

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || 'Could not calculate route between stops');
  }

  const route = data.routes[0];
  const result = formatOsrmRoute(route);
  if (scenicFallback) {
    result.directionsText =
      'Note: Scenic routing is not available on the public routing server. Showing the fastest route.\n' +
      'Set ORS_API_KEY in .env for avoid-highways support via OpenRouteService.\n\n' +
      result.directionsText;
  }
  return result;
}

function formatOsrmRoute(route) {
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

async function getRouteFromOrs(from, to, avoidHighways) {
  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      ...FETCH_HEADERS,
      Authorization: ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      instructions: true,
      ...(avoidHighways ? { options: { avoid_features: ['highways'] } } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || data.message || `OpenRouteService error (${response.status})`;
    throw new Error(message);
  }

  const feature = data.features?.[0];
  if (!feature) {
    throw new Error('Could not calculate route between stops');
  }

  const props = feature.properties || {};
  const summary = props.summary || {};
  const distanceMiles = (summary.distance || 0) * 0.000621371;
  const durationMinutes = (summary.duration || 0) / 60;

  const directions = [];
  for (const segment of props.segments || []) {
    for (const step of segment.steps || []) {
      const instruction = step.instruction || 'Continue';
      const stepMiles = ((step.distance || 0) * 0.000621371).toFixed(1);
      directions.push(`${instruction} — ${stepMiles} mi`);
    }
  }

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    geometry: feature.geometry,
    directionsText: directions.join('\n'),
  };
}

module.exports = { geocode, getRoute };
