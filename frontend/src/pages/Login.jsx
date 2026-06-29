import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🛣️</span>
          <h1>Trip Planner</h1>
          <p>Sign in to plan your next road trip adventure</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Start Planning'}
          </button>
        </form>

        <div className="login-demo">
          <p className="demo-title">Demo Accounts</p>
          <div className="demo-accounts">
            <button
              type="button"
              className="demo-btn"
              onClick={() => { setUsername('admin'); setPassword('admin123'); }}
            >
              <strong>Admin</strong>
              <span>admin / admin123</span>
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => { setUsername('roadtripper'); setPassword('user123'); }}
            >
              <strong>User</strong>
              <span>roadtripper / user123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
