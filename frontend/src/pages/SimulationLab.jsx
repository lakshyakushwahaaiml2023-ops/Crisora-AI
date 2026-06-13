import React, { useState, useEffect } from 'react';
import { Play, Pause, AlertTriangle, CloudRain, Zap, Activity, ShieldCheck, Skull, Navigation } from 'lucide-react';
import { DisasterMap } from '../components/Map';
import { RiskMeter } from '../components/RiskMeter';

const HISTORICAL_EVENTS = [
  {
    id: 'sim1',
    name: 'Kerala Floods',
    year: 2018,
    location: 'Kerala, India',
    type: 'Flood',
    severity: 5,
    maxRisk: 98,
    baseRisk: 30,
    center: [10.8505, 76.2711],
    geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[75.0, 8.0], [77.0, 8.0], [77.0, 12.0], [75.0, 12.0], [75.0, 8.0]]] } },
    outcome: { casualties: '483+', damage: '₹40,000 Crore' }
  },
  {
    id: 'sim2',
    name: 'Cyclone Fani',
    year: 2019,
    location: 'Odisha Coast',
    type: 'Cyclone',
    severity: 4,
    maxRisk: 92,
    baseRisk: 25,
    center: [19.8135, 85.8312],
    geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[84.0, 19.0], [87.0, 19.0], [87.0, 21.0], [84.0, 21.0], [84.0, 19.0]]] } },
    outcome: { casualties: '89', damage: '₹55,000 Crore' }
  },
  {
    id: 'sim3',
    name: 'Bhuj Earthquake',
    year: 2001,
    location: 'Gujarat',
    type: 'Earthquake',
    severity: 5,
    maxRisk: 100,
    baseRisk: 10,
    center: [23.2507, 69.8138],
    geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[68.0, 22.0], [71.0, 22.0], [71.0, 24.0], [68.0, 24.0], [68.0, 22.0]]] } },
    outcome: { casualties: '20,000+', damage: '₹21,000 Crore' }
  }
];

const getEventIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'flood': return <CloudRain className="text-theme-primary" />;
    case 'cyclone': return <Zap className="text-theme-primary" />;
    case 'earthquake': return <Activity className="text-theme-warning" />;
    default: return <AlertTriangle className="text-theme-danger" />;
  }
};

const getRiskLevel = (score) => {
  if (score >= 90) return 'red';
  if (score >= 70) return 'orange';
  if (score >= 40) return 'yellow';
  return 'green';
};

const getRecommendation = (level) => {
  switch (level) {
    case 'red': return `CRITICAL: Immediate mandatory evacuation of all low-lying areas. Deploy NDRF battalions. Activate all mass shelters.`;
    case 'orange': return `HIGH RISK: Prepare evacuation transport. Issue public warnings via SMS/Radio. Stockpile emergency medical kits.`;
    case 'yellow': return `MODERATE: Monitor telemetry continuously. Advise citizens to prepare emergency go-bags.`;
    default: return `NORMAL: Conduct routine drills and ensure sensor arrays are fully operational.`;
  }
};

const SimulationLab = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timeline, setTimeline] = useState(0); // 0 = T-72, 72 = T-0
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play logic
  useEffect(() => {
    let interval;
    if (isPlaying && timeline < 72) {
      interval = setInterval(() => {
        setTimeline(prev => {
          if (prev >= 71) {
            setIsPlaying(false);
            return 72;
          }
          return prev + 1;
        });
      }, 1000); // 1 second per simulated hour
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeline]);

  const handleSimulateClick = (event) => {
    setSelectedEvent(event);
    setTimeline(0);
    setIsPlaying(false);
    
    // Smooth scroll to simulation panel
    setTimeout(() => {
      document.getElementById('sim-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Derive calculated simulation state based on linear risk progression
  const hoursRemaining = 72 - timeline;
  const currentRiskScore = selectedEvent 
    ? Math.round(selectedEvent.baseRisk + ((selectedEvent.maxRisk - selectedEvent.baseRisk) * (timeline / 72))) 
    : 0;
  const currentRiskLevel = getRiskLevel(currentRiskScore);
  const currentRecommendation = getRecommendation(currentRiskLevel);

  return (
    <div className="space-y-8 font-sans pb-24 w-full max-w-7xl mx-auto px-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
          <FlaskIcon /> Historical Disaster Simulation Lab
        </h1>
        <p className="text-theme-muted mt-2 text-lg">
          Replay past Indian disasters and see how <span className="text-theme-primary font-semibold">Crisora AI</span> would have predicted and responded.
        </p>
      </div>

      {/* Grid of Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {HISTORICAL_EVENTS.map(ev => (
          <div 
            key={ev.id} 
            className={`bg-theme-card rounded-2xl border ${selectedEvent?.id === ev.id ? 'border-theme-warning shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-theme-border'} shadow-xl p-6 transition-all hover:-translate-y-1`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-theme-bg rounded-xl shadow-inner border border-theme-border">
                {getEventIcon(ev.type)}
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">{ev.year}</span>
                <div className="flex gap-1 mt-1 justify-end" title={`Severity: ${ev.severity}/5`}>
                  {[1, 2, 3, 4, 5].map(dot => (
                    <div key={dot} className={`w-2 h-2 rounded-full ${dot <= ev.severity ? 'bg-theme-danger' : 'bg-theme-border'}`} />
                  ))}
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-1">{ev.name}</h3>
            <p className="text-sm text-theme-muted flex items-center gap-1.5 mb-6">
              <Navigation size={14} className="opacity-70" /> {ev.location}
            </p>
            <button 
              onClick={() => handleSimulateClick(ev)}
              className="w-full py-3 bg-theme-warning hover:bg-theme-warning/90 text-white font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-theme-warning/20"
            >
              Simulate Scenario
            </button>
          </div>
        ))}
      </div>

      {/* Simulation Panel */}
      {selectedEvent && (
        <div id="sim-panel" className="bg-theme-card rounded-3xl border border-theme-border shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-8 fade-in duration-500 mt-12">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Controls & Insights */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-theme-text border-b border-theme-border pb-4">
                {selectedEvent.name} <span className="text-theme-muted text-lg">({selectedEvent.year})</span>
              </h2>

              {/* Scrubber Control */}
              <div className="bg-theme-bg/70 p-6 rounded-2xl border border-theme-border shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-theme-text uppercase tracking-widest">
                    T-Minus <span className="text-theme-warning text-lg mx-1">{hoursRemaining}</span> Hours
                  </span>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-3 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-full shadow-lg shadow-theme-primary/30 transition-colors"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="72" 
                  value={timeline} 
                  onChange={(e) => {
                    setTimeline(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-2 bg-theme-bg rounded-lg appearance-none cursor-pointer accent-theme-warning"
                />
                <div className="flex justify-between text-xs text-theme-muted font-bold mt-3">
                  <span>-72H</span>
                  <span>-36H</span>
                  <span className={timeline === 72 ? 'text-theme-danger animate-pulse' : ''}>0H (STRIKE)</span>
                </div>
              </div>

              {/* Risk Meter Result */}
              <div className="flex justify-center py-2">
                <RiskMeter score={currentRiskScore} level={currentRiskLevel} label="Calculated Risk" size={160} />
              </div>

              {/* Crisora AI Recommendation */}
              <div className="bg-theme-primary/10 border border-theme-primary/30 p-5 rounded-2xl transition-colors duration-500">
                <h3 className="text-sm font-bold text-theme-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldCheck size={18} /> Crisora AI Recommendation
                </h3>
                <p className="text-sm text-theme-text leading-relaxed italic">
                  "{currentRecommendation}"
                </p>
              </div>

              {/* Outcome Card at T-0 */}
              {timeline === 72 && (
                <div className="bg-theme-danger/10 border border-theme-danger/40 p-5 rounded-2xl animate-in zoom-in fade-in duration-500">
                  <h3 className="text-sm font-bold text-theme-danger uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Skull size={18} /> Actual Historical Outcome
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-theme-danger/20 pb-3">
                      <span className="text-theme-muted text-sm">Casualties</span>
                      <span className="font-bold text-theme-text text-lg">{selectedEvent.outcome.casualties}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-theme-muted text-sm">Est. Damage</span>
                      <span className="font-bold text-theme-text text-lg">{selectedEvent.outcome.damage}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Map */}
            <div className="w-full lg:w-2/3 h-[500px] lg:h-auto min-h-[500px] bg-theme-bg rounded-2xl overflow-hidden border border-theme-border relative shadow-inner">
               <DisasterMap 
                 regions={[{ 
                   ...selectedEvent, 
                   riskLevel: currentRiskLevel, 
                   riskScore: currentRiskScore 
                 }]} 
                 sosAlerts={[]} 
                 zoom={6} 
                 center={selectedEvent.center} 
               />
               
               {/* Map overlay telemetry */}
               <div className="absolute top-6 right-6 z-[1000] bg-theme-bg/80 backdrop-blur-sm p-4 rounded-xl border border-theme-border shadow-xl pointer-events-none text-right">
                 <div className="text-[10px] text-theme-muted uppercase font-bold tracking-widest mb-1">Simulated Radar</div>
                 <div className={`text-2xl font-black transition-colors duration-500 ${currentRiskLevel === 'red' ? 'text-theme-danger' : 'text-theme-text'}`}>
                   T - {hoursRemaining}H
                 </div>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// Extracted SVG so no extra icon imports
const FlaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-warning"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
);

export default SimulationLab;
