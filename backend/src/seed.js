require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, initDb, pool } = require('./db');

const SEED_USERS = [
  {
    username: 'admin',
    email: 'admin@tripplanner.local',
    password: 'admin123',
    role: 'admin',
  },
  {
    username: 'roadtripper',
    email: 'user@tripplanner.local',
    password: 'user123',
    role: 'user',
  },
];

async function seed() {
  await initDb();

  for (const user of SEED_USERS) {
    const existing = await query('SELECT id FROM users WHERE username = $1', [user.username]);
    if (existing.rows.length > 0) {
      console.log(`User "${user.username}" already exists, skipping`);
      continue;
    }

    const hash = await bcrypt.hash(user.password, 10);
    await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [user.username, user.email, hash, user.role]
    );
    console.log(`Created ${user.role} user: ${user.username}`);
  }

  console.log('\nSeed complete!');
  console.log('Default credentials:');
  console.log('  Admin: admin / admin123');
  console.log('  User:  roadtripper / user123');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
