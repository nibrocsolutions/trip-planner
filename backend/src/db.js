const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      avoid_highways BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trip_stops (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      stop_order INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      notes TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trip_sections (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      section_order INTEGER NOT NULL,
      from_stop_id INTEGER NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
      to_stop_id INTEGER NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
      distance_miles DOUBLE PRECISION,
      duration_minutes DOUBLE PRECISION,
      route_geometry JSONB,
      directions_text TEXT,
      superchargers JSONB DEFAULT '[]'::jsonb
    )
  `);
}

module.exports = { query, initDb, pool };
