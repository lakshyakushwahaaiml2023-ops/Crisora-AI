import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import { RiskBadge } from '../RiskMeter';
import MapControls from './MapControls';

// Fix for default icons if needed elsewhere in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map locate functionality
const LocateControl = () => {
  const map = useMap();
  
  useEffect(() => {
    map.on('locationfound', (e) => {
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map]);

  return (
    <button 
      onClick={() => map.locate()}
      className="absolute top-4 right-4 z-[1000] p-2 bg-theme-card text-theme-primary rounded-lg shadow-lg border border-theme-border hover:bg-theme-bg transition"
      title="Locate Me"
    >
      <Crosshair size={20} />
    </button>
  );
};

const getLevelColor = (level) => {
  switch (level) {
    case 'green': return '#2E7D32';
    case 'yellow': return '#F9A825';
    case 'orange': return '#F9A825';
    case 'red': return '#C62828';
    default: return '#2E7D32';
  }
};

const DisasterMap = ({ regions = [], sosAlerts = [], center = [20.5937, 78.9629], zoom = 5 }) => {
  const [showSOS, setShowSOS] = useState(true);
  const [showRegions, setShowRegions] = useState(true);

  // Custom pulsing icon for SOS alerts
  const createPulseIcon = () => L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex h-6 w-6 items-center justify-center">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-danger opacity-75"></span>
             <span class="relative inline-flex rounded-full h-3 w-3 bg-theme-danger"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-theme-border">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <LocateControl />
        
        {showRegions && regions.map((region, idx) => {
          if (!region.geojson) return null;
          return (
            <GeoJSON 
              key={region.id || idx}
              data={region.geojson}
              pathOptions={{ 
                color: getLevelColor(region.riskLevel), 
                fillColor: getLevelColor(region.riskLevel), 
                fillOpacity: 0.4,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h3 className="font-bold text-lg mb-2 text-theme-text">{region.name}</h3>
                  <div className="mb-2">
                    <RiskBadge level={region.riskLevel} />
                  </div>
                  <p className="text-sm text-theme-muted">
                    Population: {region.population ? region.population.toLocaleString() : 'N/A'}
                  </p>
                </div>
              </Popup>
            </GeoJSON>
          );
        })}

        {showSOS && sosAlerts.map((alert, idx) => (
          <Marker 
            key={alert.id || idx}
            position={[alert.lat, alert.lng]}
            icon={createPulseIcon()}
          >
             <Popup>
               <div className="p-1 min-w-[150px]">
                 <h4 className="font-bold text-theme-danger mb-1">SOS Alert</h4>
                 <p className="text-sm text-theme-text">{alert.message || 'Emergency assistance needed!'}</p>
                 {alert.phone && <p className="text-xs text-theme-muted mt-1">{alert.phone}</p>}
               </div>
             </Popup>
          </Marker>
        ))}
      </MapContainer>

      <MapControls 
        showSOS={showSOS} setShowSOS={setShowSOS} 
        showRegions={showRegions} setShowRegions={setShowRegions} 
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-theme-card/95 border border-theme-border p-3 rounded-lg shadow-lg backdrop-blur-sm pointer-events-none">
        <h4 className="text-xs font-semibold text-theme-muted uppercase mb-2">Risk Levels</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-theme-danger"></span><span className="text-xs text-theme-text">Red (Critical)</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-theme-warning"></span><span className="text-xs text-theme-text">Orange (High)</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-theme-warning"></span><span className="text-xs text-theme-text">Yellow (Moderate)</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-theme-success"></span><span className="text-xs text-theme-text">Green (Low)</span></div>
        </div>
      </div>
    </div>
  );
};

export default DisasterMap;
