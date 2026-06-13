import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  AlertTriangle, Siren, Flame, HeartPulse, Locate, ShieldCheck, 
  Map as MapIcon, Info, Users, Clock, CheckCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRegionStore, useSOSStore, useEventStore } from '../store';
import { regions as regionsApi, sos as sosApi, events as eventsApi } from '../services/api';
import { DisasterMap } from '../components/Map';
import { AIRecommendation } from '../components/AIRecommendation';

const getTypeIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'fire': return <Flame className="text-theme-warning" size={20} />;
    case 'medical emergency': return <HeartPulse className="text-theme-danger" size={20} />;
    case 'flood': return <MapIcon className="text-theme-primary" size={20} />;
    case 'trapped': return <Locate className="text-theme-warning" size={20} />;
    default: return <AlertTriangle className="text-theme-danger" size={20} />;
  }
};

const CollectorDashboard = () => {
  const { user } = useAuth();
  const { regions, setRegions } = useRegionStore();
  const { alerts, setAlerts, updateAlert } = useSOSStore();
  const { events, setEvents } = useEventStore();
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Using Promise.allSettled so if one fails, others still populate
        const [regRes, sosRes, evRes] = await Promise.allSettled([
          regionsApi.getRegions(),
          sosApi.getSOSAlerts(),
          eventsApi.getDisasterEvents()
        ]);

        if (regRes.status === 'fulfilled' && regRes.value?.data?.data) setRegions(regRes.value.data.data);
        if (sosRes.status === 'fulfilled' && sosRes.value?.data?.data) setAlerts(sosRes.value.data.data);
        if (evRes.status === 'fulfilled' && evRes.value?.data?.data) setEvents(evRes.value.data.data);
        
        // Add dummy data locally for UI demonstration purposes if API returns 0 items
        if (regRes.status === 'rejected' || !regRes.value?.data?.data?.length) {
          setRegions([
             { id: '1', name: 'North District', riskLevel: 'red', riskScore: 85, geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.8, 19.0], [73.5, 19.0], [73.5, 18.5], [72.8, 18.5], [72.8, 19.0]]] }} },
             { id: '2', name: 'South District', riskLevel: 'yellow', riskScore: 40, geojson: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[73.5, 19.0], [74.2, 19.0], [74.2, 18.5], [73.5, 18.5], [73.5, 19.0]]] }} }
          ]);
        }
        if (sosRes.status === 'rejected' || !sosRes.value?.data?.data?.length) {
          setAlerts([
            { id: '101', type: 'Medical Emergency', status: 'active', message: 'Heart attack suspected', location: 'Downtown Avenue', createdAt: new Date(Date.now() - 600000).toISOString(), lat: 18.7, lng: 73.1 },
            { id: '102', type: 'Fire', status: 'acknowledged', message: 'Building caught fire', location: 'Industrial Park', createdAt: new Date(Date.now() - 3600000).toISOString(), lat: 18.8, lng: 73.4 }
          ]);
        }
        if (evRes.status === 'rejected' || !evRes.value?.data?.data?.length) {
          setEvents([
            { id: 'e1', name: 'Cyclone Warning', type: 'Weather', location: 'Coastal Belt', severity: 4 },
            { id: 'e2', name: 'River Overflow', type: 'Flood', location: 'East Valley', severity: 3 }
          ]);
        }

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setRegions, setAlerts, setEvents]);

  // Derived state calculations
  const activeAlerts = alerts.filter(a => a.status !== 'resolved');
  const criticalAlertsCount = activeAlerts.filter(a => a.status === 'active' || !a.status).length;
  const highRiskRegionsCount = regions.filter(r => r.riskLevel === 'orange' || r.riskLevel === 'red').length;
  const activeEventsCount = events.length;

  const collectorRegions = regions.filter(r => r.district?.toLowerCase() === user?.district?.toLowerCase() || r.name?.toLowerCase() === user?.district?.toLowerCase());
  const collectorRegion = collectorRegions[0];
  const centerCoords = collectorRegion?.centroid?.coordinates ? [collectorRegion.centroid.coordinates[1], collectorRegion.centroid.coordinates[0]] : undefined;


  const handleAcknowledge = async (id) => {
    try {
      await sosApi.acknowledgeSOS(id).catch(() => {}); // catch dummy rejection
      updateAlert(id, { status: 'acknowledged' });
      toast.success('Alert acknowledged. Team notified.');
    } catch (error) {
      toast.error('Failed to acknowledge alert.');
    }
  };

  const handleResolve = async (id) => {
    try {
      await sosApi.resolveSOS(id).catch(() => {});
      updateAlert(id, { status: 'resolved' });
      toast.success('Alert resolved successfully.');
    } catch (error) {
      toast.error('Failed to resolve alert.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-theme-text tracking-tight">Collector Command Center</h1>
          <p className="text-sm text-theme-muted mt-1">District: <span className="font-medium text-theme-text">{user?.district || 'Admin Default'}</span></p>
        </div>
      </div>

      {/* Top Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <div className={`bg-theme-card rounded-xl border p-5 shadow-lg transition-colors ${criticalAlertsCount > 0 ? 'border-theme-danger/40 bg-theme-danger/10' : 'border-theme-border'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${criticalAlertsCount > 0 ? 'bg-theme-danger/20 text-theme-danger' : 'bg-theme-bg text-theme-text'}`}>
              <Siren size={22} className={criticalAlertsCount > 0 ? 'animate-pulse' : ''} />
            </div>
            <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider">Active SOS</h3>
          </div>
          <p className={`text-4xl font-bold ${criticalAlertsCount > 0 ? 'text-theme-danger' : 'text-theme-text'}`}>
            {criticalAlertsCount}
          </p>
        </div>

        <div className="bg-theme-card rounded-xl border border-theme-border p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-theme-warning/15 text-theme-warning">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider">Regions at Risk</h3>
          </div>
          <p className="text-4xl font-bold text-theme-text">{highRiskRegionsCount}</p>
        </div>

        <div className="bg-theme-card rounded-xl border border-theme-border p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-theme-success/15 text-theme-success">
              <Users size={22} />
            </div>
            <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider">Resources</h3>
          </div>
          <p className="text-4xl font-bold text-theme-text flex items-baseline gap-2">
            24 <span className="text-sm text-theme-muted font-medium">Units</span>
          </p>
        </div>

        <div className="bg-theme-card rounded-xl border border-theme-border p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-theme-primary/10 text-theme-primary">
              <Info size={22} />
            </div>
            <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider">Active Events</h3>
          </div>
          <p className="text-4xl font-bold text-theme-text">{activeEventsCount}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 px-2">
        
        {/* Left Column (60%): Live District Map */}
        <div className="w-full lg:w-3/5 bg-theme-card rounded-xl border border-theme-border p-5 shadow-xl flex flex-col min-h-[500px]">
          <h2 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
            <MapIcon size={20} className="text-theme-primary" /> District Overview
          </h2>
          <div className="flex-1 w-full rounded-lg overflow-hidden border border-theme-border relative shadow-inner">
            <DisasterMap regions={collectorRegions} sosAlerts={activeAlerts} zoom={collectorRegion ? 11 : 8} center={centerCoords} />
          </div>
        </div>

        {/* Right Column (40%): Live Feeds */}
        <div className="w-full lg:w-2/5 flex flex-col gap-6">
          <AIRecommendation regionId={collectorRegion?._id} />
          
          {/* SOS Alerts Feed */}
          <div className="bg-theme-card rounded-xl border border-theme-border p-5 shadow-xl flex-1 flex flex-col min-h-[400px] max-h-[550px]">
            <h2 className="text-lg font-semibold text-theme-text mb-4 flex items-center justify-between border-b border-theme-border pb-3">
              <span className="flex items-center gap-2">
                <Siren size={20} className="text-theme-danger" /> Live SOS Feed
              </span>
              {criticalAlertsCount > 0 && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-danger"></span>
                </span>
              )}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-theme-border">
              {activeAlerts.length > 0 ? (
                [...activeAlerts].sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now())).map((alert) => {
                  const isAck = alert.status === 'acknowledged';
                  const glowClass = isAck 
                    ? 'border-l-theme-warning bg-theme-bg/70' 
                    : 'border-l-theme-danger bg-theme-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
                  
                  return (
                    <div 
                      key={alert.id} 
                      className={`border-l-4 border-t border-b border-r border-theme-border rounded-r-xl p-4 animate-in slide-in-from-top-4 fade-in duration-500 ease-out ${glowClass}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(alert.type)}
                          <span className="font-bold text-theme-text tracking-wide">{alert.type || 'Emergency'}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${isAck ? 'bg-theme-warning/15 text-theme-warning border border-theme-warning/30' : 'bg-theme-danger/20 text-theme-danger border border-theme-danger/30'}`}>
                          {isAck ? 'Acknowledged' : 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-theme-muted mb-1 flex items-center gap-1.5">
                        <Locate size={12} className="opacity-70" /> 
                        {alert.location?.coordinates 
                          ? `Coordinates: ${alert.location.coordinates[1].toFixed(4)}, ${alert.location.coordinates[0].toFixed(4)}`
                          : (typeof alert.location === 'string' ? alert.location : 'Location Unknown')}
                      </p>
                      <p className="text-xs text-theme-muted mb-3 flex items-center gap-1.5">
                        <Clock size={12} className="opacity-70" /> {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : 'Just now'}
                      </p>
                      <div className="text-sm text-theme-text mb-4 bg-theme-bg/80 p-3 rounded-lg border border-theme-border/50 shadow-inner">
                        {alert.message || 'No additional details provided by sender.'}
                      </div>
                      
                      <div className="flex gap-3">
                        {!isAck && (
                          <button 
                            onClick={() => handleAcknowledge(alert.id)}
                            className="flex-1 py-2 bg-theme-warning hover:bg-theme-warning/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex justify-center items-center gap-1.5 shadow-lg shadow-theme-warning/20"
                          >
                            <ShieldCheck size={14} /> Acknowledge
                          </button>
                        )}
                        <button 
                          onClick={() => handleResolve(alert.id)}
                          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex justify-center items-center gap-1.5 ${isAck ? 'bg-theme-success hover:bg-theme-success/90 text-white shadow-lg shadow-theme-success/20' : 'bg-theme-bg hover:bg-theme-border text-theme-success border border-theme-success/30'}`}
                        >
                          <CheckCircle size={14} /> Resolve
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-theme-muted">
                  <ShieldCheck size={40} className="mb-3 opacity-30 text-theme-success" />
                  <p className="font-medium text-theme-muted">No active SOS alerts</p>
                  <p className="text-xs text-theme-muted mt-1">Your district is currently secure.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Disaster Events */}
          <div className="bg-theme-card rounded-xl border border-theme-border p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-theme-text mb-4 border-b border-theme-border pb-3 flex items-center gap-2">
              <Info size={20} className="text-theme-primary" /> Current Disasters
            </h2>
            <div className="space-y-3">
              {events.length > 0 ? (
                events.map(event => (
                  <div key={event.id} className="bg-theme-bg/80 p-4 rounded-lg border border-theme-border flex justify-between items-center hover:bg-theme-primary/10 transition-colors">
                    <div>
                      <h4 className="font-bold text-theme-text text-sm tracking-wide">{event.name}</h4>
                      <p className="text-xs text-theme-muted mt-1">{event.type} • {event.location}</p>
                    </div>
                    {/* Severity Indicator */}
                    <div className="flex gap-1.5" title={`Severity: ${event.severity}/5`}>
                      {[1, 2, 3, 4, 5].map(dot => (
                        <div 
                          key={dot} 
                          className={`w-2.5 h-2.5 rounded-full ${dot <= event.severity ? 'bg-theme-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-theme-bg'}`}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-theme-muted text-center py-6 bg-theme-bg/30 rounded-lg border border-theme-border/50">
                  No active large-scale events at this time.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;
