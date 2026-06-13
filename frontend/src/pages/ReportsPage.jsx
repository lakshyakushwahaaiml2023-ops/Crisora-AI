import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  FileText, AlertTriangle, ShieldCheck, Users, Activity,
  Download, RefreshCw, CheckCircle2, Clock, XCircle, Flame,
  CloudRain, Zap, Wind, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sos as sosApi, events as eventsApi } from '../services/api';
import toast from 'react-hot-toast';

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:       'bg-red-500/15 text-red-400 border-red-500/30',
  acknowledged: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  watch:        'bg-sky-500/15 text-sky-400 border-sky-500/30',
  warning:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const TYPE_ICON = {
  flood:     <CloudRain size={14} className="text-blue-400" />,
  fire:      <Flame size={14} className="text-orange-400" />,
  earthquake:<Activity size={14} className="text-yellow-400" />,
  cyclone:   <Zap size={14} className="text-purple-400" />,
  trapped:   <AlertTriangle size={14} className="text-red-400" />,
  medical:   <ShieldCheck size={14} className="text-green-400" />,
  other:     <Wind size={14} className="text-slate-400" />,
  landslide: <AlertTriangle size={14} className="text-amber-400" />,
  drought:   <Wind size={14} className="text-yellow-600" />,
};

const SeverityDots = ({ level }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(d => (
      <div key={d} className={`w-2 h-2 rounded-full ${d <= level ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-theme-border'}`} />
    ))}
  </div>
);

function KpiCard({ icon, label, value, sub, color = 'text-theme-primary' }) {
  return (
    <div className="bg-theme-card border border-theme-border rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl transition-shadow">
      <div className={`p-3 rounded-xl bg-theme-bg border border-theme-border ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-theme-text leading-none">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-theme-muted mt-1">{label}</p>
        {sub && <p className="text-[10px] text-theme-muted/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function downloadCSV(filename, rows) {
  if (!rows.length) { toast.error('No data to export.'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} rows to ${filename}`);
}

// ── Main Component ───────────────────────────────────────────────────────────
const ReportsPage = () => {
  const { user } = useAuth();

  const [sosAlerts, setSosAlerts] = useState([]);
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('sos'); // 'sos' | 'events'
  const [sosFilter, setSosFilter] = useState('all');    // all | active | acknowledged | resolved
  const [eventFilter, setEventFilter] = useState('all'); // all | active | resolved

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sosRes, evRes] = await Promise.allSettled([
        sosApi.getAllSOSAlerts(),
        eventsApi.getAllDisasterEvents(),
      ]);
      if (sosRes.status === 'fulfilled' && sosRes.value?.data?.data) {
        setSosAlerts(sosRes.value.data.data);
      }
      if (evRes.status === 'fulfilled' && evRes.value?.data?.data) {
        setDisasterEvents(evRes.value.data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // KPIs
  const totalSOS      = sosAlerts.length;
  const activeSOS     = sosAlerts.filter(a => a.status === 'active').length;
  const resolvedSOS   = sosAlerts.filter(a => a.status === 'resolved').length;
  const totalEvents   = disasterEvents.length;
  const activeEvents  = disasterEvents.filter(e => e.status !== 'resolved').length;
  const resolvedEvents= disasterEvents.filter(e => e.status === 'resolved').length;

  // Filtered lists
  const filteredSOS = sosFilter === 'all' ? sosAlerts : sosAlerts.filter(a => a.status === sosFilter);
  const filteredEvents = eventFilter === 'all' ? disasterEvents : disasterEvents.filter(e => e.status === eventFilter);

  // CSV helpers
  const exportSOS = () => downloadCSV(`sos_report_${Date.now()}.csv`, filteredSOS.map(a => ({
    ID: a._id,
    Type: a.type,
    Status: a.status,
    Message: a.message || '',
    Region: a.regionId?.name || '',
    District: a.regionId?.district || '',
    RaisedBy: a.userId?.name || '',
    CreatedAt: a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
  })));

  const exportEvents = () => downloadCSV(`events_report_${Date.now()}.csv`, filteredEvents.map(e => ({
    ID: e._id,
    Name: e.name,
    Type: e.type,
    Severity: e.severity,
    Status: e.status,
    Region: e.regionId?.name || '',
    District: e.regionId?.district || '',
    AffectedPopulation: e.affectedPopulation || 0,
    StartTime: e.startTime ? format(new Date(e.startTime), 'yyyy-MM-dd HH:mm:ss') : '',
    EndTime: e.endTime ? format(new Date(e.endTime), 'yyyy-MM-dd HH:mm:ss') : 'Ongoing',
  })));

  const FilterBtn = ({ value, current, set, label }) => (
    <button
      onClick={() => set(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer border ${
        current === value
          ? 'bg-theme-primary text-white border-theme-primary'
          : 'bg-theme-bg text-theme-muted border-theme-border hover:text-theme-text'
      }`}
    >{label}</button>
  );

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-extrabold text-theme-text tracking-tight flex items-center gap-3">
            <FileText className="text-theme-primary" size={30} /> Incident Reports
          </h1>
          <p className="text-sm text-theme-muted mt-1">
            Scoped to: <span className="font-semibold text-theme-text">
              {user?.role === 'ndma' ? 'National (All Districts)' : (user?.district || user?.state || 'Your Jurisdiction')}
            </span>
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-card border border-theme-border text-theme-text hover:bg-theme-bg rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<AlertTriangle size={22} />} label="Total SOS Raised" value={loading ? '…' : totalSOS} color="text-red-400" />
        <KpiCard icon={<Clock size={22} />} label="Active SOS" value={loading ? '…' : activeSOS} sub={`${resolvedSOS} resolved`} color="text-amber-400" />
        <KpiCard icon={<Activity size={22} />} label="Disaster Events" value={loading ? '…' : totalEvents} color="text-blue-400" />
        <KpiCard icon={<CheckCircle2 size={22} />} label="Events Resolved" value={loading ? '…' : resolvedEvents} sub={`${activeEvents} still active`} color="text-emerald-400" />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-theme-border">
        {[{ id: 'sos', label: 'SOS Alerts', count: totalSOS }, { id: 'events', label: 'Disaster Events', count: totalEvents }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-[3px] ${
              activeSection === t.id
                ? 'text-theme-primary border-theme-primary'
                : 'text-theme-muted border-transparent hover:text-theme-text'
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
              activeSection === t.id ? 'bg-theme-primary/20 text-theme-primary border-theme-primary/30' : 'bg-theme-bg text-theme-muted border-theme-border'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── SOS Alerts Table ─────────────────────────────────────────────────── */}
      {activeSection === 'sos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <FilterBtn value="all"          current={sosFilter} set={setSosFilter} label="All" />
              <FilterBtn value="active"       current={sosFilter} set={setSosFilter} label="Active" />
              <FilterBtn value="acknowledged" current={sosFilter} set={setSosFilter} label="Acknowledged" />
              <FilterBtn value="resolved"     current={sosFilter} set={setSosFilter} label="Resolved" />
            </div>
            <button
              onClick={exportSOS}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/30 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-theme-card rounded-xl animate-pulse border border-theme-border" />)}</div>
          ) : filteredSOS.length === 0 ? (
            <div className="text-center py-20 text-theme-muted bg-theme-card rounded-2xl border border-theme-border">
              <ShieldCheck size={40} className="mx-auto mb-3 text-theme-success/50" />
              <p className="font-medium">No SOS alerts found for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-theme-border">
              <table className="w-full text-left text-theme-text">
                <thead className="text-[11px] uppercase tracking-wider bg-theme-bg text-theme-muted border-b border-theme-border">
                  <tr>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Message</th>
                    <th className="px-5 py-4">Region</th>
                    <th className="px-5 py-4">Raised By</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/40 bg-theme-card">
                  {filteredSOS.map(a => (
                    <tr key={a._id} className="hover:bg-theme-bg/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold capitalize">
                          {TYPE_ICON[a.type] || TYPE_ICON.other} {a.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-theme-muted max-w-[200px] truncate">{a.message || '—'}</td>
                      <td className="px-5 py-3 text-sm">
                        <span className="font-medium">{a.regionId?.name || '—'}</span>
                        <span className="text-theme-muted text-xs block">{a.regionId?.district}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-theme-muted">{a.userId?.name || 'Unknown'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${STATUS_STYLES[a.status] || STATUS_STYLES.active}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted whitespace-nowrap">
                        {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Disaster Events Table ─────────────────────────────────────────────── */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <FilterBtn value="all"      current={eventFilter} set={setEventFilter} label="All" />
              <FilterBtn value="active"   current={eventFilter} set={setEventFilter} label="Active" />
              <FilterBtn value="watch"    current={eventFilter} set={setEventFilter} label="Watch" />
              <FilterBtn value="warning"  current={eventFilter} set={setEventFilter} label="Warning" />
              <FilterBtn value="resolved" current={eventFilter} set={setEventFilter} label="Resolved" />
            </div>
            <button
              onClick={exportEvents}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/30 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-theme-card rounded-xl animate-pulse border border-theme-border" />)}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-theme-muted bg-theme-card rounded-2xl border border-theme-border">
              <ShieldCheck size={40} className="mx-auto mb-3 text-theme-success/50" />
              <p className="font-medium">No disaster events found for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-theme-border">
              <table className="w-full text-left text-theme-text">
                <thead className="text-[11px] uppercase tracking-wider bg-theme-bg text-theme-muted border-b border-theme-border">
                  <tr>
                    <th className="px-5 py-4">Event Name</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4 text-center">Severity</th>
                    <th className="px-5 py-4">Region</th>
                    <th className="px-5 py-4 text-right">Affected</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Started</th>
                    <th className="px-5 py-4">Ended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/40 bg-theme-card">
                  {filteredEvents.map(ev => (
                    <tr key={ev._id} className="hover:bg-theme-bg/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-sm">{ev.name}</td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-sm capitalize">
                          {TYPE_ICON[ev.type] || TYPE_ICON.other} {ev.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          <SeverityDots level={ev.severity} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <span className="font-medium">{ev.regionId?.name || '—'}</span>
                        <span className="text-theme-muted text-xs block">{ev.regionId?.district}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-right font-mono">
                        {ev.affectedPopulation?.toLocaleString() || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${STATUS_STYLES[ev.status] || STATUS_STYLES.active}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted whitespace-nowrap">
                        {ev.startTime ? format(new Date(ev.startTime), 'dd MMM yy, HH:mm') : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap">
                        {ev.endTime
                          ? <span className="text-emerald-400">{format(new Date(ev.endTime), 'dd MMM yy, HH:mm')}</span>
                          : <span className="text-amber-400 font-semibold">Ongoing</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
