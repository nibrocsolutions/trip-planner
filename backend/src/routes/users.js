const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const users = await query('SELECT COUNT(*)::int AS count FROM users');
    const trips = await query('SELECT COUNT(*)::int AS count FROM trips');
    const activeUsers = await query('SELECT COUNT(*)::int AS count FROM users WHERE active = true');
    res.json({
      totalUsers: users.rows[0].count,
      activeUsers: activeUsers.rows[0].count,
      totalTrips: trips.rows[0].count,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, role, active, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be user or admin' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, active, created_at`,
      [username, email, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, active } = req.body;

    const result = await query(
      `UPDATE users SET
         email = COALESCE($1, email),
         role = COALESCE($2, role),
         active = COALESCE($3, active)
       WHERE id = $4
       RETURNING id, username, email, role, active, created_at`,
      [email, role, active, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, username',
      [hash, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: `Password reset for ${result.rows[0].username}` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
