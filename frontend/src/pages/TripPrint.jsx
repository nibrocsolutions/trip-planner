import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import TripMap from '../components/TripMap';

export default function TripPrint() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    api.getTrip(id)
      .then(setTrip)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handlePrintSection = (sectionIndex) => {
    const allSections = document.querySelectorAll('.triptik-section');
    allSections.forEach((el, i) => {
      el.style.display = i === sectionIndex ? 'block' : 'none';
    });
    window.print();
    allSections.forEach((el) => {
      el.style.display = 'block';
    });
  };

  if (loading) return <div className="page-loading">Loading trip...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!trip) return null;

  const totalMiles = trip.sections.reduce((sum, s) => sum + (s.distance_miles || 0), 0);

  return (
    <div className="trip-print">
      <div className="print-toolbar no-print">
        <Link to={`/trip/${id}`} className="btn btn-ghost">← Back to Editor</Link>
        <button className="btn btn-primary" onClick={handlePrint}>Print All Sections</button>
      </div>

      <div ref={printRef} className="triptik-document">
        <div className="triptik-cover triptik-section">
          <div className="triptik-header">
            <div className="triptik-logo">
              <span>🛣️</span>
              <div>
                <h1>TripTik</h1>
                <p>Trip Planner Guide</p>
              </div>
            </div>
            <div className="triptik-meta">
              <p>Generated {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="triptik-cover-content">
            <h2>{trip.title}</h2>
            {trip.notes && <p className="cover-notes">{trip.notes}</p>}
            {trip.avoid_highways && <span className="badge badge-scenic">Scenic Route — Highways Avoided</span>}

            <div className="cover-stats">
              <div className="cover-stat">
                <span className="cover-stat-value">{totalMiles.toFixed(1)}</span>
                <span className="cover-stat-label">Total Miles</span>
              </div>
              <div className="cover-stat">
                <span className="cover-stat-value">{trip.stops.length}</span>
                <span className="cover-stat-label">Stops</span>
              </div>
              <div className="cover-stat">
                <span className="cover-stat-value">{trip.sections.length}</span>
                <span className="cover-stat-label">Sections</span>
              </div>
            </div>

            <div className="cover-itinerary">
              <h3>Itinerary</h3>
              <ol>
                {trip.stops.map((stop, i) => (
                  <li key={stop.id || i}>
                    <strong>{stop.name}</strong>
                    {stop.address && <span> — {stop.address}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {trip.sections.map((section, i) => {
          const fromStop = trip.stops.find((s) => s.id === section.from_stop_id) || trip.stops[i];
          const toStop = trip.stops.find((s) => s.id === section.to_stop_id) || trip.stops[i + 1];
          const chargers = typeof section.superchargers === 'string'
            ? JSON.parse(section.superchargers)
            : section.superchargers;
          const directions = section.directions_text?.split('\n') || [];

          return (
            <div key={section.id || i} className="triptik-section triptik-page">
              <div className="triptik-header">
                <div className="triptik-logo">
                  <span>🛣️</span>
                  <div>
                    <h1>TripTik</h1>
                    <p>Section {i + 1} of {trip.sections.length}</p>
                  </div>
                </div>
                <div className="triptik-meta">
                  <p>{trip.title}</p>
                  <p>{section.distance_miles} miles · ~{section.duration_minutes} min</p>
                </div>
              </div>

              <div className="triptik-route-banner">
                <div className="route-endpoint from">
                  <span className="endpoint-label">From</span>
                  <strong>{fromStop?.name}</strong>
                </div>
                <div className="route-arrow">→</div>
                <div className="route-endpoint to">
                  <span className="endpoint-label">To</span>
                  <strong>{toStop?.name}</strong>
                </div>
              </div>

              <div className="triptik-map">
                <TripMap
                  stops={[fromStop, toStop].filter(Boolean)}
                  sections={[section]}
                />
              </div>

              <div className="triptik-details">
                <div className="triptik-directions">
                  <h3>Turn-by-Turn Directions</h3>
                  <ol>
                    {directions.slice(0, 20).map((dir, j) => (
                      <li key={j}>{dir}</li>
                    ))}
                    {directions.length > 20 && (
                      <li className="more-directions">...and {directions.length - 20} more steps</li>
                    )}
                  </ol>
                </div>

                {chargers?.length > 0 && (
                  <div className="triptik-chargers">
                    <h3>⚡ Tesla Superchargers Along Route</h3>
                    <ul>
                      {chargers.map((c) => (
                        <li key={c.id}>
                          <strong>{c.name}</strong>
                          <span>{c.address}</span>
                          {c.numStalls && <span className="stalls">{c.numStalls} stalls</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="triptik-footer">
                <p>Trip Planner TripTik — Section {i + 1}</p>
                <button className="btn btn-ghost btn-sm no-print" onClick={() => handlePrintSection(i)}>
                  Print This Section
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
