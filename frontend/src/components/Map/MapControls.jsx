import React from 'react';
import { Siren, Map as MapIcon } from 'lucide-react';

const MapControls = ({ showSOS, setShowSOS, showRegions, setShowRegions }) => {
  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
      <button 
        onClick={() => setShowRegions(!showRegions)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors border ${
          showRegions 
            ? 'bg-theme-primary text-white border-theme-primary' 
            : 'bg-theme-card/90 text-theme-muted border-theme-border'
        }`}
      >
        <MapIcon size={16} />
        <span className="text-sm font-medium">Risk Regions</span>
      </button>
      
      <button 
        onClick={() => setShowSOS(!showSOS)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors border ${
          showSOS 
            ? 'bg-theme-danger text-white border-theme-danger' 
            : 'bg-theme-card/90 text-theme-muted border-theme-border'
        }`}
      >
        <Siren size={16} />
        <span className="text-sm font-medium">SOS Alerts</span>
      </button>
    </div>
  );
};

export default MapControls;
