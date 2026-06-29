import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [resetPasswordId, setResetPasswordId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        api.getUsers(),
        api.getUserStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createUser(newUser);
      setUsers((prev) => [created, ...prev]);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      setShowCreateForm(false);
      const statsData = await api.getUserStats();
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (user) => {
    try {
      const updated = await api.updateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (user, role) => {
    try {
      const updated = await api.updateUser(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await api.resetUserPassword(userId, newPassword);
      setResetPasswordId(null);
      setNewPassword('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      const statsData = await api.getUserStats();
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading admin panel...</div>;

  return (
    <div className="admin-panel">
      <div className="page-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="page-subtitle">Manage users, access, and system overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-card-value">{stats.totalUsers}</span>
            <span className="stat-card-label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{stats.activeUsers}</span>
            <span className="stat-card-label">Active Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{stats.totalTrips}</span>
            <span className="stat-card-label">Total Trips</span>
          </div>
        </div>
      )}

      {showCreateForm && (
        <form className="admin-form card" onSubmit={handleCreateUser}>
          <h3>Create New User</h3>
          <div className="form-row">
            <label>
              Username
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Password
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
              />
            </label>
            <label>
              Role
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn btn-primary">Create User</button>
        </form>
      )}

      <div className="admin-table card">
        <h3>User Management</h3>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.active ? 'inactive-row' : ''}>
                <td><strong>{user.username}</strong></td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user, e.target.value)}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    className={`status-badge ${user.active ? 'active' : 'inactive'}`}
                    onClick={() => toggleActive(user)}
                  >
                    {user.active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="action-cell">
                  {resetPasswordId === user.id ? (
                    <div className="reset-form">
                      <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleResetPassword(user.id)}>
                        Save
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResetPasswordId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResetPasswordId(user.id)}>
                        Reset Password
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
