import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Activity, Users, Send, FileText, Package, CloudRain, Flame, Zap, Navigation, Siren, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRegionStore, useEventStore } from '../store';
import toast from 'react-hot-toast';
import { regions as regionsApi, events as eventsApi, sos as sosApi, broadcast as broadcastApi } from '../services/api';
import { DisasterMap } from '../components/Map';
import { RiskMeter, RiskBadge } from '../components/RiskMeter';
import { AIRecommendation } from '../components/AIRecommendation';

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
  const { user } = useAuth();
  const location = useLocation();
  const { regions, setRegions } = useRegionStore();
  const { events, setEvents } = useEventStore();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (location.pathname.includes('/map')) {
      setActiveTab('overview');
    } else if (location.pathname.includes('/reports')) {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const handleSimulateSOSCluster = async () => {
    if (!authorityRegions || authorityRegions.length === 0) {
      toast.error('No region context available.');
      return;
    }
    const targetRegion = authorityRegions[0];
    try {
      toast.loading('Simulating statewide alarm cluster...', { id: 'sim_sos_auth' });
      const res = await sosApi.simulateSOSCluster(targetRegion._id || targetRegion.id, 'flood');
      if (res.data?.success) {
        toast.success(`5 SOS alarms raised in ${targetRegion.name}!`, { id: 'sim_sos_auth' });
        const updatedRegions = await regionsApi.getRegions();
        if (updatedRegions.data?.success && updatedRegions.data?.data) {
          setRegions(updatedRegions.data.data);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to raise simulated alarms.', { id: 'sim_sos_auth' });
    }
  };

  const [expandedEvent, setExpandedEvent] = useState(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    district: 'All Districts',
    message: '',
    channels: ['sms', 'voice'],
    testPhone: ''
  });

  // Filter regions to only current authority's scope
  const authorityRegions = user?.role === 'district_authority' 
    ? regions.filter(r => r.district?.toLowerCase() === user.district?.toLowerCase() || r.name?.toLowerCase() === user.district?.toLowerCase()) 
    : (user?.role === 'state_authority' 
      ? regions.filter(r => r.state?.toLowerCase() === user.state?.toLowerCase()) 
      : regions);

  // Get distinct districts from relevant regions
  const uniqueDistricts = [...new Set(authorityRegions.map(r => r.district).filter(Boolean))];
  const displayDistricts = uniqueDistricts.length > 0 ? uniqueDistricts : ['Bhopal', 'Indore'];

  // Dynamic Map Centering and Zoom
  const getMapSettings = () => {
    if (!user) return { center: [20.5937, 78.9629], zoom: 5 };
    
    if (user.role === 'district_authority') {
      const match = authorityRegions[0];
      if (match?.centroid?.coordinates) {
        return { center: [match.centroid.coordinates[1], match.centroid.coordinates[0]], zoom: 11 };
      }
    }
    
    // State-level views
    const stateName = user.state || '';
    switch (stateName.toLowerCase()) {
      case 'madhya pradesh':
        return { center: [23.2599, 77.4126], zoom: 7 };
      case 'maharashtra':
        return { center: [19.0760, 72.8777], zoom: 7 };
      case 'tamil nadu':
        return { center: [10.7656, 79.8433], zoom: 7 };
      case 'uttarakhand':
        return { center: [30.2844, 78.9818], zoom: 7 };
      default:
        return { center: [20.5937, 78.9629], zoom: 5 }; // National (NDMA)
    }
  };

  const { center: mapCenter, zoom: mapZoom } = getMapSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, evRes] = await Promise.allSettled([
          regionsApi.getRegions(),
          eventsApi.getDisasterEvents()
        ]);
        
        if (regRes.status === 'fulfilled' && regRes.value?.data?.data) setRegions(regRes.value.data.data);
        if (evRes.status === 'fulfilled' && evRes.value?.data?.data) setEvents(evRes.value.data.data);

        // Dummy data fallback
        if (regRes.status === 'rejected' || !regRes.value?.data?.data?.length) {
          setRegions([
            { id: '1', name: 'Mumbai Coast', district: 'Mumbai', riskLevel: 'red', riskScore: 92, lastUpdated: new Date().toISOString(), geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.8, 19.0], [73.5, 19.0], [73.5, 18.5], [72.8, 18.5], [72.8, 19.0]]] }} },
            { id: '2', name: 'Pune Central', district: 'Pune', riskLevel: 'yellow', riskScore: 45, lastUpdated: new Date().toISOString(), geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[73.5, 19.0], [74.2, 19.0], [74.2, 18.5], [73.5, 18.5], [73.5, 19.0]]] }} },
            { id: '3', name: 'Nashik Valley', district: 'Nashik', riskLevel: 'orange', riskScore: 78, lastUpdated: new Date().toISOString() }
          ]);
        }
        if (evRes.status === 'rejected' || !evRes.value?.data?.data?.length) {
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

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Dispatching emergency alerts...', { id: 'broadcast_alert' });
      const res = await broadcastApi.send({
        district: broadcastData.district,
        message: broadcastData.message,
        channels: broadcastData.channels,
        testPhone: broadcastData.testPhone
      });
      if (res.data?.success) {
        let msg = `Broadcast sent to ${res.data.stats?.sms?.success || 0} numbers!`;
        if (res.data.isSimulated) msg += ' (Simulated)';
        if (res.data.translatedHindi) msg += `\nHindi: "${res.data.translatedHindi.slice(0, 55)}..."`;
        toast.success(msg, { id: 'broadcast_alert', duration: 8000 });
        setIsBroadcastModalOpen(false);
        setBroadcastData({ district: 'All Districts', message: '', channels: ['sms', 'voice'], testPhone: '' });
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.errors?.join(', ') || error.response?.data?.message || 'Failed to dispatch broadcast.';
      toast.error(errMsg, { id: 'broadcast_alert' });
    }
  };

  const handleTestCall = async () => {
    const message = broadcastData.message?.trim();
    if (!message) { toast.error('Enter a broadcast message to test.'); return; }
    try {
      toast.loading('Placing calls to all 4 numbers...', { id: 'test_call' });
      const res = await broadcastApi.testCall(message);
      if (res.data?.success) {
        const simLabel = res.data.isSimulated ? ' (Simulated)' : '';
        const count = res.data.voiceTargets?.length || 4;
        toast.success(`Test calls placed to ${count} numbers${simLabel}!`, { id: 'test_call', duration: 8000 });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Test call failed.', { id: 'test_call' });
    }
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
                {authorityRegions.map(region => (
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
            {displayDistricts.map(dist => (
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
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSimulateSOSCluster}
            className="flex items-center gap-2 px-6 py-3 border-2 border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white rounded-full font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(66,165,245,0.15)] active:scale-95 cursor-pointer"
            title="Raise 5 simulated SOS alarms in the first region of your authority's scope"
          >
            <Siren size={18} /> Simulate SOS Cluster
          </button>
          <button 
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 border-2 border-theme-danger text-theme-danger hover:bg-theme-danger hover:text-white rounded-full font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.15)] active:scale-95 cursor-pointer"
          >
            <Send size={18} /> Broadcast Alert
          </button>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="px-2">
        <AIRecommendation regionId={undefined} />
      </div>

      {/* Map Section (60vh) */}
      <div className="w-full h-[60vh] bg-theme-card rounded-3xl border border-theme-border shadow-2xl overflow-hidden relative">
         <DisasterMap regions={authorityRegions} sosAlerts={[]} zoom={mapZoom} center={mapCenter} />
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
                  <option value="All Districts">All Districts (Statewide)</option>
                  {displayDistricts.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
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

              <div className="flex gap-6 items-center bg-theme-bg/50 p-4 border border-theme-border rounded-xl">
                <label className="flex items-center gap-2 text-sm font-bold text-theme-text cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={broadcastData.channels.includes('sms')}
                    onChange={(e) => {
                      const newChannels = e.target.checked 
                        ? [...broadcastData.channels, 'sms']
                        : broadcastData.channels.filter(c => c !== 'sms');
                      setBroadcastData({...broadcastData, channels: newChannels});
                    }}
                    className="h-4 w-4 rounded border-theme-border bg-theme-bg text-theme-danger focus:ring-theme-danger"
                  />
                  SMS Alert
                </label>

                <label className="flex items-center gap-2 text-sm font-bold text-theme-text cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={broadcastData.channels.includes('voice')}
                    onChange={(e) => {
                      const newChannels = e.target.checked 
                        ? [...broadcastData.channels, 'voice']
                        : broadcastData.channels.filter(c => c !== 'voice');
                      setBroadcastData({...broadcastData, channels: newChannels});
                    }}
                    className="h-4 w-4 rounded border-theme-border bg-theme-bg text-theme-danger focus:ring-theme-danger"
                  />
                  AI Voice Call
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-theme-text mb-2">
                  Test Phone Number Override <span className="text-theme-muted font-normal">(Optional)</span>
                </label>
                <input 
                  type="text"
                  value={broadcastData.testPhone || ''}
                  onChange={(e) => setBroadcastData({...broadcastData, testPhone: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:border-theme-primary font-medium"
                  placeholder="e.g. +919999999999 (for quick testing)"
                />
                <p className="text-[10px] text-theme-muted mt-1 leading-relaxed">
                  If provided, the SMS and voice call will bypass all citizens and target only this number. Useful for demo testing.
                </p>
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
                  type="button"
                  onClick={handleTestCall}
                  disabled={!broadcastData.message?.trim()}
                  className="px-5 py-4 bg-theme-primary/20 hover:bg-theme-primary/40 text-theme-primary border border-theme-primary/40 rounded-xl font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Place a test voice call to +916268347442"
                >
                  <Phone size={16} /> Test Call
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
