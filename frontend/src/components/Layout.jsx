import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🛣️</span>
          <div>
            <h1>Trip Planner</h1>
            <p className="brand-tagline">Plan. Drive. Explore.</p>
          </div>
        </div>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            My Trips
          </NavLink>
          <NavLink to="/trip/new" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            New Trip
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="header-user">
          <span className="user-badge">{user.role}</span>
          <span className="user-name">{user.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>Trip Planner &mdash; Your road trip companion</p>
      </footer>
    </div>
  );
}
