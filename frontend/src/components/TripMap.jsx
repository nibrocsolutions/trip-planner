import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const stopIcon = L.divIcon({
  className: 'custom-marker stop-marker',
  html: '<div class="marker-pin stop"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const startIcon = L.divIcon({
  className: 'custom-marker start-marker',
  html: '<div class="marker-pin start"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const endIcon = L.divIcon({
  className: 'custom-marker end-marker',
  html: '<div class="marker-pin end"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const chargerIcon = L.divIcon({
  className: 'custom-marker charger-marker',
  html: '<div class="marker-pin charger">⚡</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function FitBounds({ stops, sections }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    const points = [];
    stops.forEach((s) => points.push([s.latitude, s.longitude]));
    sections.forEach((sec) => {
      const geom = typeof sec.route_geometry === 'string'
        ? JSON.parse(sec.route_geometry)
        : sec.route_geometry;
      if (geom?.coordinates) {
        geom.coordinates.forEach(([lng, lat]) => points.push([lat, lng]));
      }
      const chargers = typeof sec.superchargers === 'string'
        ? JSON.parse(sec.superchargers)
        : sec.superchargers;
      (chargers || []).forEach((c) => points.push([c.latitude, c.longitude]));
    });

    const key = JSON.stringify(points.map((p) => p.map((n) => n.toFixed(3))));
    if (points.length > 0 && key !== prevKey.current) {
      prevKey.current = key;
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [stops, sections, map]);

  return null;
}

const ROUTE_COLORS = ['#e85d04', '#2a9d8f', '#457b9d', '#9b5de5', '#f15bb5'];

export default function TripMap({ stops = [], sections = [], highlightSection = null }) {
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  const getIcon = (index, total) => {
    if (index === 0) return startIcon;
    if (index === total - 1) return endIcon;
    return stopIcon;
  };

  const getLabel = (index, total) => {
    if (index === 0) return 'Start';
    if (index === total - 1) return 'Destination';
    return `Stop ${index}`;
  };

  return (
    <div className="trip-map-container">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="trip-map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds stops={stops} sections={sections} />

        {stops.map((stop, i) => (
          <Marker
            key={`stop-${i}`}
            position={[stop.latitude, stop.longitude]}
            icon={getIcon(i, stops.length)}
          >
            <Popup>
              <strong>{getLabel(i, stops.length)}</strong>
              <br />
              {stop.name}
            </Popup>
          </Marker>
        ))}

        {sections.map((section, i) => {
          const geom = typeof section.route_geometry === 'string'
            ? JSON.parse(section.route_geometry)
            : section.route_geometry;
          if (!geom?.coordinates) return null;

          const positions = geom.coordinates.map(([lng, lat]) => [lat, lng]);
          const isHighlighted = highlightSection === null || highlightSection === i;
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

          return (
            <Polyline
              key={`route-${i}`}
              positions={positions}
              pathOptions={{
                color,
                weight: isHighlighted ? 5 : 3,
                opacity: isHighlighted ? 0.9 : 0.4,
              }}
            />
          );
        })}

        {sections.map((section, i) => {
          const chargers = typeof section.superchargers === 'string'
            ? JSON.parse(section.superchargers)
            : section.superchargers;
          return (chargers || []).map((charger) => (
            <Marker
              key={`charger-${i}-${charger.id}`}
              position={[charger.latitude, charger.longitude]}
              icon={chargerIcon}
            >
              <Popup>
                <strong>⚡ {charger.name}</strong>
                <br />
                {charger.address}
                {charger.numStalls && <><br />{charger.numStalls} stalls</>}
                <br />
                <em>Section {i + 1}</em>
              </Popup>
            </Marker>
          ));
        })}
      </MapContainer>
    </div>
  );
}
