import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Activity, Users, Send, FileText, Package, CloudRain, Flame, Zap, Navigation } from 'lucide-react';
import { useRegionStore, useEventStore } from '../store';
import { regions as regionsApi, events as eventsApi } from '../services/api';
import { DisasterMap } from '../components/Map';
import { RiskMeter, RiskBadge } from '../components/RiskMeter';

const getEventIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'flood': return <CloudRain className="text-theme-primary" />;
    case 'fire': return <Flame className="text-theme-warning" />;
    case 'earthquake': return <Activity className="text-theme-warning" />;
    case 'cyclone': return <Zap className="text-theme-primary" />;
    default: return <ShieldAlert className="text-theme-danger" />;
  }
};

const AuthorityPanel = () => {
  const { regions, setRegions } = useRegionStore();
  const { events, setEvents } = useEventStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ district: 'All Districts', message: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, evRes] = await Promise.allSettled([
          regionsApi.getRegions(),
          eventsApi.getDisasterEvents()
        ]);
        
        if (regRes.status === 'fulfilled' && regRes.value?.data) setRegions(regRes.value.data);
        if (evRes.status === 'fulfilled' && evRes.value?.data) setEvents(evRes.value.data);

        // Dummy data fallback
        if (regRes.status === 'rejected' || !regRes.value?.data?.length) {
          setRegions([
            { id: '1', name: 'Mumbai Coast', district: 'Mumbai', riskLevel: 'red', riskScore: 92, lastUpdated: new Date().toISOString(), geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.8, 19.0], [73.5, 19.0], [73.5, 18.5], [72.8, 18.5], [72.8, 19.0]]] }} },
            { id: '2', name: 'Pune Central', district: 'Pune', riskLevel: 'yellow', riskScore: 45, lastUpdated: new Date().toISOString(), geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[73.5, 19.0], [74.2, 19.0], [74.2, 18.5], [73.5, 18.5], [73.5, 19.0]]] }} },
            { id: '3', name: 'Nashik Valley', district: 'Nashik', riskLevel: 'orange', riskScore: 78, lastUpdated: new Date().toISOString() }
          ]);
        }
        if (evRes.status === 'rejected' || !evRes.value?.data?.length) {
          setEvents([
            { id: 'e1', name: 'Cyclone Nisarga', type: 'Cyclone', location: 'Coastal Belt', severity: 5, affectedPopulation: 1500000, description: "Category 4 cyclone approaching the western coast. Evacuation protocol initiated in vulnerable areas." },
            { id: 'e2', name: 'Mithi River Overflow', type: 'Flood', location: 'Mumbai Suburbs', severity: 3, affectedPopulation: 250000, description: "Continuous rainfall causing river to breach danger mark. Low-lying areas on standby." }
          ]);
        }
      } catch (error) {
        console.error("Authority fetch error:", error);
      }
    };
    fetchData();
  }, [setRegions, setEvents]);

  const handleBroadcast = (e) => {
    e.preventDefault();
    alert(`[STUB] Broadcasting to ${broadcastData.district}:\n"${broadcastData.message}"`);
    setIsBroadcastModalOpen(false);
    setBroadcastData({ district: 'All Districts', message: '' });
  };

  const tabs = [
    { id: 'overview', label: 'Risk Overview', icon: <Activity size={18} /> },
    { id: 'events', label: 'Active Events', icon: <ShieldAlert size={18} /> },
    { id: 'resources', label: 'Resource Map', icon: <Package size={18} /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="overflow-x-auto rounded-xl border border-theme-border">
            <table className="w-full text-left text-theme-text">
              <thead className="text-xs uppercase bg-theme-bg text-theme-muted border-b border-theme-border">
                <tr>
                  <th className="px-6 py-4">Region Name</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4 text-center">Risk Score</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50 bg-theme-card">
                {regions.map(region => (
                  <tr key={region.id} className="hover:bg-theme-bg/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-theme-text">{region.name}</td>
                    <td className="px-6 py-4 text-theme-muted">{region.district || 'Unassigned'}</td>
                    <td className="px-6 py-2 flex justify-center">
                      <div className="transform scale-75 origin-center">
                        <RiskMeter score={region.riskScore} level={region.riskLevel} label="" size={60} />
                      </div>
                    </td>
                    <td className="px-6 py-4"><RiskBadge level={region.riskLevel} /></td>
                    <td className="px-6 py-4 text-xs text-theme-muted/70">
                      {region.lastUpdated ? formatDistanceToNow(new Date(region.lastUpdated), { addSuffix: true }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-theme-primary hover:text-white hover:bg-theme-primary/50 text-sm font-medium border border-theme-primary/30 px-4 py-2 rounded-lg transition-colors cursor-pointer">
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'events':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-theme-card/30 border border-theme-border rounded-xl overflow-hidden transition-all shadow-md">
                <div className="p-5 flex justify-between items-start border-b border-theme-border/50">
                  <div className="flex gap-4">
                    <div className="mt-1 p-3 bg-theme-bg rounded-xl shadow-inner border border-theme-border">
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-theme-text">{event.name}</h3>
                      <p className="text-sm text-theme-muted flex items-center gap-1.5 mt-1">
                        <Navigation size={14} className="opacity-70" /> {event.location}
                      </p>
                      <p className="text-sm text-theme-muted flex items-center gap-1.5 mt-1">
                        <Users size={14} className="opacity-70" /> {event.affectedPopulation?.toLocaleString()} potentially affected
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(dot => (
                        <div key={dot} className={`w-2 h-2 rounded-full ${dot <= event.severity ? 'bg-theme-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-theme-border'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-theme-muted tracking-wider">Severity {event.severity}/5</span>
                  </div>
                </div>
                
                <div className="p-5">
                  <button 
                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    className="w-full py-2.5 bg-theme-card hover:bg-theme-bg text-theme-text text-sm font-bold uppercase tracking-wide rounded-lg border border-theme-border transition-colors shadow-sm cursor-pointer"
                  >
                    {expandedEvent === event.id ? 'Hide Details' : 'View Details & Actions'}
                  </button>
                  
                  {expandedEvent === event.id && (
                    <div className="mt-4 p-5 bg-theme-bg/80 rounded-xl border border-theme-border text-sm text-theme-text animate-in slide-in-from-top-2 fade-in duration-300">
                      <p className="font-bold text-theme-text mb-2 uppercase tracking-wider text-xs">Situation Report:</p>
                      <p className="leading-relaxed border-l-2 border-theme-border pl-3 italic text-theme-muted">{event.description || 'No detailed report available.'}</p>
                      <div className="mt-5 flex gap-3">
                         <button className="flex-1 py-2 bg-theme-danger/20 text-theme-danger border border-theme-danger/30 rounded-lg text-xs font-bold uppercase hover:bg-theme-danger/40 transition-colors cursor-pointer">Declare Emergency</button>
                         <button className="flex-1 py-2 bg-theme-primary/20 text-theme-primary border border-theme-primary/30 rounded-lg text-xs font-bold uppercase hover:bg-theme-primary/40 transition-colors cursor-pointer">Deploy NDRF</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      case 'resources':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Mumbai', 'Pune', 'Nashik'].map(dist => (
              <div key={dist} className="bg-theme-card/30 border border-theme-border rounded-xl p-6 shadow-md hover:bg-theme-card/45 transition-colors">
                <h3 className="text-xl font-bold text-theme-text mb-6 flex items-center gap-2 border-b border-theme-border pb-3">
                  <Navigation size={20} className="text-theme-success" /> {dist} HQ
                </h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-theme-muted font-medium">Medical Kits</span>
                    <span className="font-bold text-theme-text bg-theme-bg px-2 py-1 rounded">1,250</span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-theme-muted font-medium">Life Jackets</span>
                    <span className="font-bold text-theme-text bg-theme-bg px-2 py-1 rounded">430</span>
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-theme-muted font-medium">Ambulances</span>
                    <span className="font-bold text-theme-text bg-theme-bg px-2 py-1 rounded">45</span>
                  </li>
                </ul>
                <button 
                  onClick={() => alert(`[STUB] Dispatch resources to ${dist}`)}
                  className="w-full py-3 bg-theme-success/20 hover:bg-theme-success/30 text-theme-success border border-theme-success/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shadow-inner cursor-pointer"
                >
                  Dispatch Units
                </button>
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col space-y-8 font-sans w-full pb-12">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-bold text-theme-text tracking-tight">Authority Control Panel</h1>
          <p className="text-sm text-theme-muted mt-1">Statewide Operations & Executive Oversight</p>
        </div>
        <button 
          onClick={() => setIsBroadcastModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 border-2 border-theme-danger text-theme-danger hover:bg-theme-danger hover:text-white rounded-full font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.15)] active:scale-95 cursor-pointer"
        >
          <Send size={18} /> Broadcast Alert
        </button>
      </div>

      {/* Map Section (60vh) */}
      <div className="w-full h-[60vh] bg-theme-card rounded-3xl border border-theme-border shadow-2xl overflow-hidden relative">
         <DisasterMap regions={regions} sosAlerts={[]} zoom={6} center={[19.5, 75.0]} />
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-theme-bg/85 backdrop-blur-md px-6 py-2.5 rounded-full border border-theme-border shadow-lg pointer-events-none">
            <span className="text-sm font-bold text-theme-text tracking-widest uppercase flex items-center gap-3">
              <Activity size={18} className="text-theme-primary animate-pulse" /> Live Statewide Telemetry
            </span>
         </div>
      </div>

      {/* Tabbed Panel */}
      <div className="bg-theme-card rounded-3xl border border-theme-border shadow-xl overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-theme-border overflow-x-auto bg-theme-bg/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-10 py-5 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id 
                  ? 'text-theme-primary border-b-[3px] border-theme-primary bg-theme-card' 
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-card/50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {renderTabContent()}
        </div>
      </div>

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-theme-bg/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-theme-danger mb-2 flex items-center gap-3">
              <ShieldAlert size={28} /> Emergency Broadcast
            </h2>
            <p className="text-theme-muted text-sm mb-8 leading-relaxed">
              Instantly push an emergency SMS and Push Notification to all citizens in the selected area. This overrides Do Not Disturb settings.
            </p>
            
            <form onSubmit={handleBroadcast} className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-theme-text mb-2">Target Area</label>
                <select 
                  value={broadcastData.district}
                  onChange={(e) => setBroadcastData({...broadcastData, district: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:border-theme-primary font-medium cursor-pointer"
                >
                  <option>All Districts (Statewide)</option>
                  <option>Mumbai</option>
                  <option>Pune</option>
                  <option>Nashik</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-theme-text mb-2">Broadcast Message</label>
                <textarea 
                  required
                  rows="5"
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({...broadcastData, message: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:border-theme-primary resize-none font-medium placeholder-slate-600"
                  placeholder="Official warning message..."
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="flex-1 py-4 bg-theme-bg hover:bg-theme-card text-theme-text border border-theme-border rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-theme-danger hover:opacity-90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2 shadow-lg shadow-theme-danger/30 cursor-pointer"
                >
                  <Send size={18} /> Send Alert
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AuthorityPanel;
