import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTrips()
      .then(setTrips)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete trip "${title}"?`)) return;
    try {
      await api.deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading trips...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2>My Road Trips</h2>
          <p className="page-subtitle">Plan scenic routes, find superchargers, and print your TripTik guides</p>
        </div>
        <Link to="/trip/new" className="btn btn-primary">
          + New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗺️</span>
          <h3>No trips yet</h3>
          <p>Create your first road trip and start exploring!</p>
          <Link to="/trip/new" className="btn btn-primary">
            Plan Your First Trip
          </Link>
        </div>
      ) : (
        <div className="trip-grid">
          {trips.map((trip) => (
            <div key={trip.id} className="trip-card">
              <div className="trip-card-header">
                <h3>{trip.title}</h3>
                {trip.avoid_highways && <span className="badge badge-scenic">Scenic Route</span>}
              </div>
              {trip.owner_username && (
                <p className="trip-owner">By {trip.owner_username}</p>
              )}
              {trip.notes && <p className="trip-notes">{trip.notes}</p>}
              <p className="trip-date">
                Updated {new Date(trip.updated_at).toLocaleDateString()}
              </p>
              <div className="trip-card-actions">
                <Link to={`/trip/${trip.id}`} className="btn btn-secondary btn-sm">
                  Edit
                </Link>
                <Link to={`/trip/${trip.id}/print`} className="btn btn-ghost btn-sm">
                  Print TripTik
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(trip.id, trip.title)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
