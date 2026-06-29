const OCM_API_KEY = process.env.OCM_API_KEY || '';

async function findSuperchargersAlongRoute(geometry, maxResults = 10) {
  if (!geometry?.coordinates?.length) return [];

  const coords = geometry.coordinates;
  const sampleCount = Math.min(8, coords.length);
  const step = Math.max(1, Math.floor(coords.length / sampleCount));
  const samples = [];

  for (let i = 0; i < coords.length; i += step) {
    samples.push(coords[i]);
  }
  if (coords.length > 0) {
    samples.push(coords[coords.length - 1]);
  }

  const seen = new Set();
  const chargers = [];

  for (const [lng, lat] of samples) {
    const url = new URL('https://api.openchargemap.io/v3/poi/');
    url.searchParams.set('output', 'json');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lng.toString());
    url.searchParams.set('distance', '25');
    url.searchParams.set('distanceunit', 'KM');
    url.searchParams.set('maxresults', '5');
    url.searchParams.set('connectiontypeid', '33');
    url.searchParams.set('operatorid', '3534');

    const headers = { Accept: 'application/json' };
    if (OCM_API_KEY) headers['X-API-Key'] = OCM_API_KEY;

    try {
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) continue;

      const pois = await response.json();
      for (const poi of pois) {
        const id = poi.ID;
        if (seen.has(id)) continue;
        seen.add(id);

        const addr = poi.AddressInfo || {};
        if (!addr.Latitude || !addr.Longitude) continue;

        const title = (addr.Title || '').toLowerCase();
        const operator = (poi.OperatorInfo?.Title || '').toLowerCase();
        if (!title.includes('tesla') && !operator.includes('tesla')) continue;

        chargers.push({
          id,
          name: addr.Title || 'Tesla Supercharger',
          address: [addr.AddressLine1, addr.Town, addr.StateOrProvince]
            .filter(Boolean)
            .join(', '),
          latitude: addr.Latitude,
          longitude: addr.Longitude,
          numStalls: poi.NumberOfPoints,
        });
      }
    } catch {
      // Continue with other sample points if one lookup fails
    }
  }

  return chargers.slice(0, maxResults);
}

module.exports = { findSuperchargersAlongRoute };
