'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const severityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

function createIcon(color: string) {
  return L.divIcon({
    html: `<div style="
      width: 20px;
      height: 20px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ incidents }: { incidents: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (incidents.length === 0) return;
    const bounds = L.latLngBounds(incidents.map(i => [i.latitude, i.longitude]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [incidents]);
  return null;
}

export default function MapComponent({ incidents }: { incidents: any[] }) {
  const defaultCenter: [number, number] = incidents.length > 0
    ? [incidents[0].latitude, incidents[0].longitude]
    : [7.444565, 3.898470];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds incidents={incidents} />
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={createIcon(severityColors[incident.severity] || '#888')}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{incident.title}</p>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                {incident.description?.split('--- AI TRIAGE ---')[0].trim().slice(0, 100)}...
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span style={{
                  background: severityColors[incident.severity],
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {incident.severity}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>👷 {incident.worker_name}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}