const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { geocode, getRoute } = require('../services/routing');
const { findSuperchargersAlongRoute } = require('../services/superchargers');

const router = express.Router();

router.use(authenticate);

router.get('/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const results = await geocode(q);
    res.json(results);
  } catch (err) {
    console.error('Geocode error:', err);
    res.status(500).json({ error: err.message || 'Geocoding failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const result = isAdmin
      ? await query(
          `SELECT t.*, u.username AS owner_username
           FROM trips t JOIN users u ON t.user_id = u.id
           ORDER BY t.updated_at DESC`
        )
      : await query(
          'SELECT * FROM trips WHERE user_id = $1 ORDER BY updated_at DESC',
          [req.user.id]
        );
    res.json(result.rows);
  } catch (err) {
    console.error('List trips error:', err);
    res.status(500).json({ error: 'Failed to list trips' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trip = await getTripWithDetails(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role !== 'admin' && trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(trip);
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, avoidHighways = false, notes = '', stops = [] } = req.body;
    if (!title || stops.length < 2) {
      return res.status(400).json({ error: 'Title and at least 2 stops are required' });
    }

    const tripResult = await query(
      `INSERT INTO trips (user_id, title, avoid_highways, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title, avoidHighways, notes]
    );
    const trip = tripResult.rows[0];

    const savedStops = await saveStops(trip.id, stops);
    const sections = await calculateSections(trip.id, savedStops, avoidHighways);

    res.status(201).json({ ...trip, stops: savedStops, sections });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: err.message || 'Failed to create trip' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = existing.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role !== 'admin' && trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, avoidHighways, notes, stops } = req.body;
    const updated = await query(
      `UPDATE trips SET
         title = COALESCE($1, title),
         avoid_highways = COALESCE($2, avoid_highways),
         notes = COALESCE($3, notes),
         updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [title, avoidHighways, notes, req.params.id]
    );

    if (stops) {
      await query('DELETE FROM trip_sections WHERE trip_id = $1', [req.params.id]);
      await query('DELETE FROM trip_stops WHERE trip_id = $1', [req.params.id]);
      const savedStops = await saveStops(req.params.id, stops);
      const sections = await calculateSections(
        req.params.id,
        savedStops,
        avoidHighways ?? trip.avoid_highways
      );
      return res.json({ ...updated.rows[0], stops: savedStops, sections });
    }

    const fullTrip = await getTripWithDetails(req.params.id);
    res.json(fullTrip);
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ error: err.message || 'Failed to update trip' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = existing.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role !== 'admin' && trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM trips WHERE id = $1', [req.params.id]);
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

router.post('/:id/recalculate', async (req, res) => {
  try {
    const trip = await getTripWithDetails(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role !== 'admin' && trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM trip_sections WHERE trip_id = $1', [req.params.id]);
    const sections = await calculateSections(trip.id, trip.stops, trip.avoid_highways);
    res.json({ ...trip, sections });
  } catch (err) {
    console.error('Recalculate error:', err);
    res.status(500).json({ error: err.message || 'Failed to recalculate route' });
  }
});

async function saveStops(tripId, stops) {
  const saved = [];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const result = await query(
      `INSERT INTO trip_stops (trip_id, stop_order, name, address, latitude, longitude, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        tripId,
        i,
        stop.name,
        stop.address || '',
        stop.latitude,
        stop.longitude,
        stop.notes || '',
      ]
    );
    saved.push(result.rows[0]);
  }
  return saved;
}

async function calculateSections(tripId, stops, avoidHighways) {
  const sections = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const route = await getRoute(
      { latitude: from.latitude, longitude: from.longitude },
      { latitude: to.latitude, longitude: to.longitude },
      avoidHighways
    );
    const superchargers = await findSuperchargersAlongRoute(route.geometry);

    const result = await query(
      `INSERT INTO trip_sections
         (trip_id, section_order, from_stop_id, to_stop_id, distance_miles,
          duration_minutes, route_geometry, directions_text, superchargers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        tripId,
        i,
        from.id,
        to.id,
        route.distanceMiles,
        route.durationMinutes,
        JSON.stringify(route.geometry),
        route.directionsText,
        JSON.stringify(superchargers),
      ]
    );
    sections.push(result.rows[0]);
  }
  return sections;
}

async function getTripWithDetails(tripId) {
  const tripResult = await query('SELECT * FROM trips WHERE id = $1', [tripId]);
  const trip = tripResult.rows[0];
  if (!trip) return null;

  const stopsResult = await query(
    'SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY stop_order',
    [tripId]
  );
  const sectionsResult = await query(
    'SELECT * FROM trip_sections WHERE trip_id = $1 ORDER BY section_order',
    [tripId]
  );

  return {
    ...trip,
    stops: stopsResult.rows,
    sections: sectionsResult.rows,
  };
}

module.exports = router;
