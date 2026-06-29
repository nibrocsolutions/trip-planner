require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'trip-planner-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);

async function start() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initDb();
      console.log('Database initialized');
      break;
    } catch (err) {
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, 2000));
      if (i === maxRetries - 1) throw err;
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trip Planner API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
