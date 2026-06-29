import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import TripMap from '../components/TripMap';

const emptyStop = () => ({
  name: '',
  address: '',
  latitude: null,
  longitude: null,
  notes: '',
});

export default function TripEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [stops, setStops] = useState([emptyStop(), emptyStop()]);
  const [sections, setSections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStop, setSearchingStop] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [highlightSection, setHighlightSection] = useState(null);

  useEffect(() => {
    if (!isNew) {
      api.getTrip(id)
        .then((trip) => {
          setTitle(trip.title);
          setNotes(trip.notes || '');
          setAvoidHighways(trip.avoid_highways);
          setStops(trip.stops.length >= 2 ? trip.stops : [emptyStop(), emptyStop()]);
          setSections(trip.sections || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSearch = async (stopIndex) => {
    if (!searchQuery.trim()) return;
    setSearchingStop(stopIndex);
    try {
      const results = await api.geocode(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectLocation = (stopIndex, location) => {
    const updated = [...stops];
    updated[stopIndex] = {
      ...updated[stopIndex],
      name: location.name.split(',')[0],
      address: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setStops(updated);
    setSearchResults([]);
    setSearchQuery('');
    setSearchingStop(null);
  };

  const addStop = () => {
    const updated = [...stops];
    updated.splice(updated.length - 1, 0, emptyStop());
    setStops(updated);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) return;
    setStops(stops.filter((_, i) => i !== index));
  };

  const moveStop = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stops.length) return;
    const updated = [...stops];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setStops(updated);
  };

  const handleSave = async () => {
    setError('');
    if (!title.trim()) {
      setError('Please enter a trip title');
      return;
    }
    if (stops.some((s) => !s.latitude || !s.longitude)) {
      setError('All stops must have a location. Search and select each stop.');
      return;
    }

    setSaving(true);
    try {
      const payload = { title, notes, avoidHighways, stops };
      const result = isNew
        ? await api.createTrip(payload)
        : await api.updateTrip(id, payload);
      setSections(result.sections || []);
      if (isNew) navigate(`/trip/${result.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStopLabel = (index) => {
    if (index === 0) return 'Starting Location';
    if (index === stops.length - 1) return 'Final Destination';
    return `Stop ${index}`;
  };

  const totalMiles = sections.reduce((sum, s) => sum + (s.distance_miles || 0), 0);
  const totalMinutes = sections.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  if (loading) return <div className="page-loading">Loading trip...</div>;

  return (
    <div className="trip-editor">
      <div className="page-header">
        <div>
          <h2>{isNew ? 'Plan a New Trip' : 'Edit Trip'}</h2>
          <p className="page-subtitle">Add stops, toggle scenic routes, and find Tesla superchargers</p>
        </div>
        <div className="header-actions">
          {!isNew && (
            <Link to={`/trip/${id}/print`} className="btn btn-secondary">
              Print TripTik
            </Link>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Calculating Route...' : 'Save Trip'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="editor-layout">
        <div className="editor-sidebar">
          <div className="form-section">
            <label>
              Trip Name
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summer Road Trip 2026"
              />
            </label>

            <label>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trip highlights, packing list, etc."
                rows={3}
              />
            </label>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={avoidHighways}
                onChange={(e) => setAvoidHighways(e.target.checked)}
              />
              <span className="toggle-text">
                <strong>Avoid Highways</strong>
                <small>Take scenic back roads instead of interstates</small>
              </span>
            </label>
          </div>

          <div className="stops-section">
            <div className="section-header">
              <h3>Route Stops</h3>
              <button className="btn btn-ghost btn-sm" onClick={addStop}>
                + Add Stop
              </button>
            </div>

            {stops.map((stop, index) => (
              <div key={index} className="stop-card">
                <div className="stop-card-header">
                  <span className={`stop-label stop-label-${index === 0 ? 'start' : index === stops.length - 1 ? 'end' : 'mid'}`}>
                    {getStopLabel(index)}
                  </span>
                  <div className="stop-actions">
                    {index > 0 && (
                      <button className="icon-btn" onClick={() => moveStop(index, -1)} title="Move up">↑</button>
                    )}
                    {index < stops.length - 1 && (
                      <button className="icon-btn" onClick={() => moveStop(index, 1)} title="Move down">↓</button>
                    )}
                    {index > 0 && index < stops.length - 1 && (
                      <button className="icon-btn danger" onClick={() => removeStop(index)} title="Remove">×</button>
                    )}
                  </div>
                </div>

                {stop.address ? (
                  <div className="stop-selected">
                    <strong>{stop.name}</strong>
                    <p>{stop.address}</p>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const updated = [...stops];
                        updated[index] = emptyStop();
                        setStops(updated);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="stop-search">
                    <input
                      type="text"
                      placeholder="Search city, address, or landmark..."
                      value={searchingStop === index ? searchQuery : ''}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchingStop(index);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch(index))}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={() => handleSearch(index)}>
                      Search
                    </button>
                    {searchingStop === index && searchResults.length > 0 && (
                      <ul className="search-results">
                        {searchResults.map((r, i) => (
                          <li key={i} onClick={() => selectLocation(index, r)}>
                            {r.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {sections.length > 0 && (
            <div className="sections-summary">
              <h3>Trip Summary</h3>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-value">{totalMiles.toFixed(1)}</span>
                  <span className="stat-label">Total Miles</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                  <span className="stat-label">Drive Time</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{sections.length}</span>
                  <span className="stat-label">Sections</span>
                </div>
              </div>

              {sections.map((section, i) => {
                const fromStop = stops.find((s) => s.id === section.from_stop_id) || stops[i];
                const toStop = stops.find((s) => s.id === section.to_stop_id) || stops[i + 1];
                const chargers = typeof section.superchargers === 'string'
                  ? JSON.parse(section.superchargers)
                  : section.superchargers;

                return (
                  <div
                    key={section.id || i}
                    className={`section-card ${highlightSection === i ? 'highlighted' : ''}`}
                    onMouseEnter={() => setHighlightSection(i)}
                    onMouseLeave={() => setHighlightSection(null)}
                  >
                    <div className="section-header-row">
                      <span className="section-number">Section {i + 1}</span>
                      <span className="section-distance">{section.distance_miles} mi</span>
                    </div>
                    <p className="section-route">
                      {fromStop?.name} → {toStop?.name}
                    </p>
                    <p className="section-time">~{section.duration_minutes} min drive</p>
                    {chargers?.length > 0 && (
                      <p className="section-chargers">⚡ {chargers.length} Supercharger{chargers.length > 1 ? 's' : ''} nearby</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="editor-map">
          <TripMap
            stops={stops.filter((s) => s.latitude)}
            sections={sections}
            highlightSection={highlightSection}
          />
        </div>
      </div>
    </div>
  );
}
