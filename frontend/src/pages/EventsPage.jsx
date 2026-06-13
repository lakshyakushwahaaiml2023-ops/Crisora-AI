import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, ShieldAlert, CloudRain, Flame, Zap, ShieldCheck, 
  Clock, Plus, AlertTriangle, X, CheckCircle, HelpCircle, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRegionStore, useEventStore } from '../store';
import { events as eventsApi, regions as regionsApi } from '../services/api';

const getEventIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'flood': return <CloudRain className="text-theme-primary" size={20} />;
    case 'fire': return <Flame className="text-theme-warning" size={20} />;
    case 'earthquake': return <Activity className="text-theme-warning" size={20} />;
    case 'cyclone': return <Zap className="text-theme-primary" size={20} />;
    default: return <ShieldAlert className="text-theme-danger" size={20} />;
  }
};

const EventsPage = () => {
  const { user } = useAuth();
  const { events, setEvents, addEvent } = useEventStore();
  const { regions, setRegions } = useRegionStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Form States for Reporting
  const [name, setName] = useState('');
  const [type, setType] = useState('flood');
  const [regionId, setRegionId] = useState('');
  const [severity, setSeverity] = useState(3);
  const [status, setStatus] = useState('warning');
  const [description, setDescription] = useState('');

  // Form States for Resolving
  const [affectedPopulation, setAffectedPopulation] = useState(0);
  const [casualties, setCasualties] = useState(0);

  // Fetch Events and Regions on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [evRes, regRes] = await Promise.allSettled([
          eventsApi.getDisasterEvents(),
          regionsApi.getRegions()
        ]);

        if (evRes.status === 'fulfilled' && evRes.value?.data?.data) {
          setEvents(evRes.value.data.data);
        }
        if (regRes.status === 'fulfilled' && regRes.value?.data?.data) {
          setRegions(regRes.value.data.data);
        }
      } catch (error) {
        console.error('Failed to load events page data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [setEvents, setRegions]);

  // Scoped regions that this user is allowed to report disasters for
  const allowedRegions = regions.filter(r => {
    if (user?.role === 'district_authority') {
      return r.district?.toLowerCase() === user.district?.toLowerCase();
    } else if (user?.role === 'state_authority') {
      return r.state?.toLowerCase() === user.state?.toLowerCase();
    }
    return true; // NDMA can report for any region
  });

  // Default regionId to first allowed region when modal opens
  useEffect(() => {
    if (allowedRegions.length > 0 && !regionId) {
      setRegionId(allowedRegions[0]._id || allowedRegions[0].id);
    }
  }, [allowedRegions, regionId]);

  const handleReportDisaster = async (e) => {
    e.preventDefault();
    if (!name.trim() || !regionId) {
      toast.error('Event name and region are required');
      return;
    }

    try {
      const payload = {
        name,
        type,
        regionId,
        severity,
        status,
        description,
        startTime: new Date()
      };
      
      const res = await eventsApi.createDisasterEvent(payload);
      if (res.data?.success && res.data?.data) {
        addEvent(res.data.data);
        toast.success('Disaster event reported successfully.');
        setIsModalOpen(false);
        // Reset form
        setName('');
        setType('flood');
        setSeverity(3);
        setStatus('warning');
        setDescription('');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to report disaster event');
    }
  };

  const handleOpenResolveModal = (eventId) => {
    setSelectedEventId(eventId);
    setAffectedPopulation(0);
    setCasualties(0);
    setIsResolveModalOpen(true);
  };

  const handleResolveDisaster = async (e) => {
    e.preventDefault();
    try {
      const res = await eventsApi.resolveDisasterEvent(selectedEventId, {
        affectedPopulation,
        casualties
      });
      if (res.data?.success) {
        toast.success('Disaster event resolved.');
        // Filter out or update in local list
        setEvents(events.filter(ev => (ev._id || ev.id) !== selectedEventId));
        setIsResolveModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to resolve event.');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans w-full max-w-7xl mx-auto px-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-text tracking-tight">Active Disasters Registry</h1>
          <p className="text-sm text-theme-muted mt-1">
            Official logs of warnings, watches, and active natural emergency events
          </p>
        </div>
        
        {/* Only authorities can report events */}
        {user?.role !== 'collector' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white hover:bg-theme-primary/90 rounded-full font-bold uppercase tracking-wider text-xs transition-all shadow-lg cursor-pointer"
          >
            <Plus size={16} /> Report Disaster
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-theme-card border border-theme-border rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const evId = event._id || event.id;
            return (
              <div 
                key={evId} 
                className={`bg-theme-card border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                  event.status === 'active' 
                    ? 'border-theme-danger/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' 
                    : 'border-theme-border'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.type)}
                      <span className="font-bold text-theme-text text-base tracking-wide">{event.name}</span>
                    </div>
                    
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      event.status === 'active' 
                        ? 'bg-theme-danger/10 text-theme-danger border-theme-danger/30' 
                        : event.status === 'warning'
                          ? 'bg-theme-warning/15 text-theme-warning border-theme-warning/30'
                          : 'bg-theme-primary/10 text-theme-primary border-theme-primary/30'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  <p className="text-xs text-theme-muted mb-2 font-medium">
                    Region: {event.regionId?.name || 'Local'} • District: {event.regionId?.district || 'Unknown'} • State: {event.regionId?.state || 'Unknown'}
                  </p>

                  {/* Severity dots */}
                  <div className="flex gap-1.5 items-center mb-3">
                    <span className="text-[10px] text-theme-muted uppercase font-bold tracking-wide mr-1">Severity:</span>
                    {[1, 2, 3, 4, 5].map(dot => (
                      <div 
                        key={dot} 
                        className={`w-2.5 h-2.5 rounded-full ${
                          dot <= event.severity 
                            ? 'bg-theme-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]' 
                            : 'bg-theme-bg'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-theme-text bg-theme-bg/60 p-3 rounded-lg border border-theme-border/50 shadow-inner mb-4 min-h-[50px]">
                    {event.description || 'No detailed log coordinates or descriptions supplied.'}
                  </p>
                </div>

                <div className="flex justify-between items-center border-t border-theme-border/50 pt-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                    <Clock size={14} className="opacity-70" />
                    <span>Reported {event.startTime ? formatDistanceToNow(new Date(event.startTime), { addSuffix: true }) : 'just now'}</span>
                  </div>

                  <button
                    onClick={() => handleOpenResolveModal(evId)}
                    className="px-4 py-1.5 bg-theme-success/10 hover:bg-theme-success/20 text-theme-success border border-theme-success/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Resolve Event
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-theme-card border border-theme-border rounded-2xl max-w-xl mx-auto shadow-xl">
          <ShieldCheck size={56} className="text-theme-success mb-4 opacity-40 animate-pulse" />
          <h3 className="text-lg font-bold text-theme-text mb-1">District Registers Clear</h3>
          <p className="text-sm text-theme-muted text-center leading-relaxed">
            No active disaster warnings, watches, or emergency operations are currently recorded.
          </p>
        </div>
      )}

      {/* ── REPORT DISASTER MODAL ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-theme-card border border-theme-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-theme-border">
              <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
                <AlertTriangle className="text-theme-danger" size={20} /> Report Natural Disaster
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-theme-muted hover:text-theme-text cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReportDisaster} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Event Title</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 2026 Bhopal Flash Floods"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Disaster Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary cursor-pointer"
                  >
                    <option value="flood">Flood</option>
                    <option value="fire">Fire</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="cyclone">Cyclone</option>
                    <option value="landslide">Landslide</option>
                    <option value="drought">Drought</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Region Focus</label>
                  <select 
                    value={regionId} 
                    onChange={(e) => setRegionId(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary cursor-pointer"
                    required
                  >
                    {allowedRegions.map(r => (
                      <option key={r._id || r.id} value={r._id || r.id}>
                        {r.name} ({r.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Severity Level (1-5)</label>
                  <select 
                    value={severity} 
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary cursor-pointer"
                  >
                    <option value="1">1 - Minimal</option>
                    <option value="2">2 - Low</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - High</option>
                    <option value="5">5 - Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Alert Level Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary cursor-pointer"
                  >
                    <option value="watch">Watch (Monitoring)</option>
                    <option value="warning">Warning (Imminent)</option>
                    <option value="active">Active (Crisis Event)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Description / Log details</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of water levels, coordinate updates, wind vectors..."
                  className="w-full h-24 bg-theme-bg border border-theme-border rounded-lg px-4 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-theme-bg hover:bg-theme-border text-theme-text text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-theme-border cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-theme-danger text-white hover:bg-theme-danger/90 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg cursor-pointer"
                >
                  Trigger Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESOLVE DISASTER MODAL ───────────────────────────────────────────── */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-theme-card border border-theme-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-theme-border">
              <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
                <CheckCircle className="text-theme-success" size={20} /> Resolve Disaster Event
              </h2>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-theme-muted hover:text-theme-text cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveDisaster} className="p-5 space-y-4">
              <p className="text-xs text-theme-muted leading-relaxed">
                Provide the final summary counts of casualties and affected population to register this event as resolved in database records.
              </p>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-theme-primary" /> Affected Population
                </label>
                <input 
                  type="number"
                  value={affectedPopulation}
                  onChange={(e) => setAffectedPopulation(Number(e.target.value))}
                  min="0"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-theme-danger" /> Fatalities / Casualties
                </label>
                <input 
                  type="number"
                  value={casualties}
                  onChange={(e) => setCasualties(Number(e.target.value))}
                  min="0"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsResolveModalOpen(false)}
                  className="flex-1 py-2.5 bg-theme-bg hover:bg-theme-border text-theme-text text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-theme-border cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-theme-success text-white hover:bg-theme-success/90 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg cursor-pointer"
                >
                  Confirm Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
