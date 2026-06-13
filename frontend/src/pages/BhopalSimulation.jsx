import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, Skull,
  Clock, Wind, Users, Siren, Radio, Zap, ChevronRight,
  TrendingUp, HeartPulse, Phone, MapPin, CheckCircle2, XCircle
} from 'lucide-react';

// ── Historical Timeline Data ───────────────────────────────────────────────────
// Based on documented accounts of the night of Dec 2–3, 1984
const TIMELINE = [
  {
    id: 1,
    time: '22:00',
    label: 'Shift Change at Plant',
    phase: 'pre',
    sosCount: 0,
    description: 'Night shift workers begin at Union Carbide pesticide plant, Bhopal. Tank 610 holding 42 tonnes of MIC shows slight pressure anomaly in gauge readings.',
    reality: {
      action: 'Supervisor dismisses gauge reading as faulty instrument. No escalation.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Sensor anomaly flagged. AI sends automated alert to District Authority and plant safety officer. Risk score rises from 12 → 28.',
      recommendation: 'Anomalous pressure detected in Tank 610 (MIC storage). Recommend immediate inspection. Risk: ELEVATED.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 0,
    riskReal: 12,
    riskCrisora: 28,
    gasRadius: 0,
  },
  {
    id: 2,
    time: '22:45',
    label: 'Workers Report Eye Irritation',
    phase: 'pre',
    sosCount: 0,
    description: 'Several workers near the MIC storage area report burning eyes and runny noses. A small leak is suspected in a pipe connecting Tank 610.',
    reality: {
      action: 'Tea break taken. Workers told to "check after tea." No safety shutdown initiated.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Worker symptom reports cross-correlated with pressure data. AI escalates to CRITICAL. Recommends immediate plant evacuation and notifies Bhopal Collector.',
      recommendation: 'CRITICAL: MIC exposure symptoms confirmed in 6 workers. Recommend plant shutdown and activate 3km evacuation zone. Contact NDRF.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 0,
    riskReal: 25,
    riskCrisora: 72,
    gasRadius: 0,
  },
  {
    id: 3,
    time: '23:30',
    label: 'Pipe Wash — Water Enters Tank 610',
    phase: 'critical',
    sosCount: 0,
    description: 'A worker begins washing pipes near Tank 610. Due to missing safety slip-blind, water flows directly into the tank triggering an exothermic reaction with 42 tonnes of MIC.',
    reality: {
      action: 'Safety systems non-functional. Refrigeration unit off since June. Vent scrubber shut down. Flare tower non-operational.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'AI detects temperature spike inside Tank 610 (+40°C in 8 min). Emergency siren protocol activated. Mass SMS to 500m radius. Evacuation buses dispatched.',
      recommendation: 'EMERGENCY: Tank 610 temperature rising rapidly. Runaway reaction imminent. EVACUATE 5km radius immediately. Deploy NDRF and medical teams to Hamidia Hospital.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 2100,
    riskReal: 60,
    riskCrisora: 95,
    gasRadius: 0,
  },
  {
    id: 4,
    time: '00:15',
    label: 'MIC Gas Leak Begins',
    phase: 'critical',
    sosCount: 12,
    description: 'Tank 610 ruptures. 40+ tonnes of methyl isocyanate gas begins venting into the air above Bhopal. A toxic white cloud drifts south-west toward densely populated slums.',
    reality: {
      action: 'Plant siren sounded for 1 minute then TURNED OFF to "avoid panic." No public warning. Police uninformed. Hospitals not alerted.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Leak confirmed. AI triggers citywide siren network and automated calls in Hindi to all registered citizens. Coordinates wind direction model — gas moving to J.P. Nagar.',
      recommendation: 'GAS CLOUD ACTIVE. Wind: SW at 8km/h. Danger zones: J.P. Nagar, Chola, Kazi Camp. Citizens instructed via voice call: wet cloth over face, move EAST immediately.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 8500,
    riskReal: 85,
    riskCrisora: 99,
    gasRadius: 1,
  },
  {
    id: 5,
    time: '00:45',
    label: 'Gas Cloud Reaches J.P. Nagar',
    phase: 'disaster',
    sosCount: 89,
    description: 'The toxic MIC cloud engulfs J.P. Nagar, Kazi Camp, and Chola Road — among the most densely populated areas of Bhopal with over 150,000 residents.',
    reality: {
      action: 'Residents wake choking with no warning. Mass panic. People flee randomly, some running INTO the gas cloud. Hamidia Hospital completely unprepared.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Evacuation corridors pre-established eastward. 200+ buses coordinated. Hamidia and Sultania hospitals pre-alerted with MIC antidote protocol. NDRF teams arrive at plant.',
      recommendation: 'Evacuation corridors EAST on Berasia Road are clear. 18,000 citizens successfully moving away from gas cloud. Medical teams deployed with sodium thiosulfate antidote.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 14200,
    riskReal: 95,
    riskCrisora: 99,
    gasRadius: 2,
  },
  {
    id: 6,
    time: '01:30',
    label: 'Hospitals Overwhelmed',
    phase: 'disaster',
    sosCount: 312,
    description: 'Hamidia Hospital receives thousands of victims. Doctors have no idea what chemical caused the poisoning. No treatment protocol exists. People are dying in corridors.',
    reality: {
      action: 'Union Carbide refuses to disclose chemical composition. Doctors treat symptoms blindly. Many victims die from lack of proper antidote (sodium thiosulfate).',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'AI had pre-shared MIC chemical data sheet with all hospitals at 23:30. Antidote protocol activated. State authority coordinates supply of sodium thiosulfate from Delhi.',
      recommendation: 'Medical response coordinated. 3,200 patients treated with correct protocol. State authority requests 50,000 doses sodium thiosulfate from AIIMS Delhi via priority air transport.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 18600,
    riskReal: 98,
    riskCrisora: 99,
    gasRadius: 3.5,
  },
  {
    id: 7,
    time: '02:30',
    label: 'Gas Cloud Reaches Railway Station',
    phase: 'disaster',
    sosCount: 580,
    description: 'The gas cloud reaches Bhopal Railway Station. Hundreds of passengers sleeping on platforms are exposed. The cloud has now spread over 40 sq km of the city.',
    reality: {
      action: 'Railway authorities receive no warning. Trains continue running into the station. Passengers walk directly into the gas cloud as they disembark.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Railway Ministry alerted at 00:20. All inbound trains halted 30km from Bhopal. Station evacuated by 01:00. Platform area cleared before gas cloud arrives.',
      recommendation: 'Railway Station successfully evacuated. All 14 inbound trains held at Vidisha and Obaidullahganj. Gas monitoring shows cloud thinning east of station.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 21000,
    riskReal: 100,
    riskCrisora: 99,
    gasRadius: 5,
  },
  {
    id: 8,
    time: '06:00',
    label: 'Dawn — Scale of Tragedy Revealed',
    phase: 'aftermath',
    sosCount: 847,
    description: 'As daylight arrives, the true scale of the disaster becomes clear. Streets are lined with bodies of humans and animals. Thousands are blind, choking, or dead.',
    reality: {
      action: 'Over 3,787 immediate deaths (official). 500,000 people exposed. No coordinated relief. Union Carbide CEO arrives days later. Relief operations chaotic for weeks.',
      icon: 'x',
      color: 'red',
    },
    crisora: {
      action: 'Coordinated relief underway since 01:00. 72,000 evacuated safely. 21,000+ lives saved through early warning, correct evacuation corridors, and pre-staged medical response.',
      recommendation: 'RECOVERY PHASE: 72,000 evacuated. 21,000 lives saved vs historical outcome. Medical teams operational at 8 centres. Air quality monitoring shows MIC levels dropping.',
      icon: 'check',
      color: 'green',
    },
    livesSaved: 21000,
    riskReal: 100,
    riskCrisora: 45,
    gasRadius: 6,
  },
];

const PHASE_COLORS = {
  pre:       'border-amber-500 bg-amber-500',
  critical:  'border-orange-500 bg-orange-500',
  disaster:  'border-red-600 bg-red-600',
  aftermath: 'border-purple-500 bg-purple-500',
};

const PHASE_LABELS = {
  pre:       'Pre-Incident',
  critical:  'Critical Phase',
  disaster:  'Disaster',
  aftermath: 'Aftermath',
};

// Animated counter
function useCounter(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + diff * ease));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// Gas cloud radius visualizer (SVG)
function GasCloud({ radius, phase }) {
  const opacity = phase === 'pre' ? 0 : Math.min(radius / 6, 0.85);
  const cx = 200, cy = 200;
  const rx = radius * 28, ry = radius * 18;
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {/* Bhopal city grid suggestion */}
      {[...Array(8)].map((_, i) => (
        <line key={`h${i}`} x1="0" y1={50 * i + 20} x2="400" y2={50 * i + 20} stroke="#ffffff08" strokeWidth="1" />
      ))}
      {[...Array(8)].map((_, i) => (
        <line key={`v${i}`} x1={50 * i + 20} y1="0" x2={50 * i + 20} y2="400" stroke="#ffffff08" strokeWidth="1" />
      ))}

      {/* Gas cloud */}
      {radius > 0 && (
        <>
          <defs>
            <radialGradient id="gasGrad" cx="40%" cy="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity={opacity} />
              <stop offset="60%" stopColor="#dc2626" stopOpacity={opacity * 0.6} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={cx + 20} cy={cy + 10} rx={rx} ry={ry} fill="url(#gasGrad)" className="animate-pulse" style={{ animationDuration: '3s' }} />
        </>
      )}

      {/* Factory location */}
      <circle cx="180" cy="190" r="8" fill="#ef4444" className="animate-ping" style={{ animationDuration: '1s' }} />
      <circle cx="180" cy="190" r="5" fill="#ef4444" />
      <text x="192" y="185" fill="#fca5a5" fontSize="9" fontWeight="bold">Union Carbide Plant</text>

      {/* Key locations */}
      {[
        { x: 210, y: 230, label: 'J.P. Nagar', r: radius >= 1 },
        { x: 250, y: 220, label: 'Chola Road', r: radius >= 2 },
        { x: 280, y: 200, label: 'Kazi Camp', r: radius >= 2 },
        { x: 310, y: 170, label: 'Railway Stn', r: radius >= 5 },
      ].map(loc => (
        <g key={loc.label}>
          <circle cx={loc.x} cy={loc.y} r="4"
            fill={loc.r ? '#fca5a5' : '#60a5fa'}
            stroke={loc.r ? '#ef4444' : '#3b82f6'} strokeWidth="1.5" />
          <text x={loc.x + 7} y={loc.y + 4} fill={loc.r ? '#fca5a5' : '#93c5fd'} fontSize="8">{loc.label}</text>
        </g>
      ))}

      {/* Wind direction arrow */}
      <g transform="translate(50, 50)">
        <text x="0" y="0" fill="#94a3b8" fontSize="8" fontWeight="bold">WIND →</text>
        <text x="0" y="12" fill="#64748b" fontSize="7">SW 8km/h</text>
      </g>

      {/* Scale */}
      <g transform="translate(300, 370)">
        <line x1="0" y1="0" x2="56" y2="0" stroke="#475569" strokeWidth="1.5" />
        <text x="14" y="-4" fill="#64748b" fontSize="7">2 km</text>
      </g>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const BhopalSimulation = () => {
  const [step, setStep] = useState(0);            // current timeline index
  const [isPlaying, setIsPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef(null);

  const event = TIMELINE[step];
  const livesSaved = useCounter(started ? event.livesSaved : 0);
  const sosCount   = useCounter(started ? event.sosCount : 0, 800);

  const next = useCallback(() => {
    setStep(s => {
      if (s >= TIMELINE.length - 1) { setIsPlaying(false); return s; }
      return s + 1;
    });
  }, []);

  const prev = () => setStep(s => Math.max(0, s - 1));

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
    setStarted(false);
  };

  const startSim = () => {
    setStarted(true);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(next, 4000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, next]);

  return (
    <div className="min-h-screen font-sans pb-16" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a00 50%, #0a0a0f 100%)' }}>

      {/* ── Cinematic Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-orange-900/40">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/60 via-orange-950/40 to-red-950/60" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(239,68,68,0.03) 40px, rgba(239,68,68,0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(239,68,68,0.03) 40px, rgba(239,68,68,0.03) 41px)'
        }} />
        <div className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40">
                  <Skull size={22} className="text-red-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-red-400/80 border border-red-500/30 px-3 py-1 rounded-full bg-red-500/10">
                  Historical Simulation — For Awareness
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Bhopal Gas Tragedy
                <span className="text-red-500 ml-3">1984</span>
              </h1>
              <p className="text-orange-200/70 mt-2 text-base max-w-2xl leading-relaxed">
                The world's worst industrial disaster. December 2–3, 1984 — Bhopal, Madhya Pradesh.
                See how <span className="text-orange-400 font-bold">Crisora AI</span> could have saved over
                <span className="text-emerald-400 font-bold"> 21,000 lives</span> through early warning and coordinated response.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center shrink-0">
              {[
                { label: 'Exposed', val: '5,00,000', color: 'text-red-400' },
                { label: 'Killed', val: '25,000+', color: 'text-red-500' },
                { label: 'Could Be Saved', val: '21,000+', color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                  <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!started ? (
        /* ── Start Screen ─────────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="max-w-lg">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center animate-pulse">
              <Wind size={40} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Begin Simulation</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              This simulation walks through 8 critical decision points across the night of December 2–3, 1984.
              Each point shows what <span className="text-red-400">actually happened</span> versus what
              <span className="text-emerald-400"> Crisora AI would have done</span>.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              {[
                { icon: <Clock size={16} />, label: '8 Critical Decision Points' },
                { icon: <Siren size={16} />, label: 'Real SOS Alarm Progression' },
                { icon: <Wind size={16} />, label: 'Gas Cloud Spread Visualization' },
                { icon: <HeartPulse size={16} />, label: 'Lives Saved Counter' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-orange-400">{f.icon}</span> {f.label}
                </div>
              ))}
            </div>
            <button
              onClick={startSim}
              className="px-10 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black uppercase tracking-widest rounded-2xl text-lg shadow-2xl shadow-red-900/50 transition-all active:scale-95 cursor-pointer flex items-center gap-3 mx-auto"
            >
              <Play size={22} /> Start Simulation
            </button>
          </div>
        </div>
      ) : (
        /* ── Active Simulation ────────────────────────────────────────────────── */
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

          {/* Controls bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(p => !p)}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors cursor-pointer">
                {isPlaying ? <><Pause size={16}/> Pause</> : <><Play size={16}/> Play</>}
              </button>
              <button onClick={prev} disabled={step === 0}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-30">
                ← Back
              </button>
              <button onClick={next} disabled={step >= TIMELINE.length - 1}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-30">
                Next →
              </button>
              <button onClick={reset}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer">
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {TIMELINE.map((t, i) => (
                <button key={t.id} onClick={() => { setStep(i); setIsPlaying(false); }}
                  className={`transition-all cursor-pointer rounded-full border ${
                    i === step
                      ? 'w-6 h-3 bg-orange-500 border-orange-400'
                      : i < step
                      ? 'w-3 h-3 bg-orange-800 border-orange-700'
                      : 'w-3 h-3 bg-white/10 border-white/20'
                  }`}
                  title={t.time + ' — ' + t.label}
                />
              ))}
            </div>
          </div>

          {/* Live KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Clock size={18} className="text-orange-400"/>, label: 'Timeline', val: event.time, sub: 'Dec 2–3, 1984' },
              { icon: <Siren size={18} className="text-red-400"/>, label: 'SOS Alarms', val: sosCount.toLocaleString(), sub: 'Active distress signals' },
              { icon: <TrendingUp size={18} className="text-yellow-400"/>, label: 'Risk (Reality)', val: `${event.riskReal}%`, sub: 'Without intervention' },
              { icon: <HeartPulse size={18} className="text-emerald-400"/>, label: 'Lives Saved', val: livesSaved.toLocaleString(), sub: 'With Crisora AI' },
            ].map(k => (
              <div key={k.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/40 border border-white/10">{k.icon}</div>
                <div>
                  <div className="text-xl font-black text-white">{k.val}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{k.label}</div>
                  <div className="text-[9px] text-slate-600">{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main content: event + map */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: Event detail panel */}
            <div className="lg:col-span-3 space-y-4">

              {/* Event header */}
              <div className={`rounded-2xl border p-5 bg-black/60 ${PHASE_COLORS[event.phase].replace('bg-', 'border-').replace('-500', '-500/40').replace('-600', '-600/40')}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        event.phase === 'pre' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                        event.phase === 'critical' ? 'text-orange-400 border-orange-500/40 bg-orange-500/10' :
                        event.phase === 'disaster' ? 'text-red-400 border-red-600/40 bg-red-600/10' :
                        'text-purple-400 border-purple-500/40 bg-purple-500/10'
                      }`}>{PHASE_LABELS[event.phase]}</span>
                      <span className="text-xs text-slate-500 font-mono">Step {step + 1} / {TIMELINE.length}</span>
                    </div>
                    <h2 className="text-xl font-black text-white">{event.time} — {event.label}</h2>
                  </div>
                  {event.sosCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-1.5 shrink-0 animate-pulse">
                      <Siren size={14} className="text-red-400" />
                      <span className="text-sm font-black text-red-300">{sosCount} SOS</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-white/10 pl-4">
                  {event.description}
                </p>
              </div>

              {/* Reality vs Crisora split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Reality */}
                <div className="bg-red-950/40 border border-red-700/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                      <XCircle size={16} className="text-red-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-red-400">Reality — 1984</span>
                  </div>
                  <p className="text-sm text-red-200/80 leading-relaxed">{event.reality.action}</p>

                  {/* Real risk bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Risk Level</span><span className="text-red-400 font-bold">{event.riskReal}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-600 to-red-600 rounded-full transition-all duration-1000"
                        style={{ width: `${event.riskReal}%` }} />
                    </div>
                  </div>
                </div>

                {/* Crisora */}
                <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Crisora AI Response</span>
                  </div>
                  <p className="text-sm text-emerald-200/80 leading-relaxed">{event.crisora.action}</p>

                  {/* Crisora risk bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Detection Level</span><span className="text-emerald-400 font-bold">{event.riskCrisora}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 rounded-full transition-all duration-1000"
                        style={{ width: `${event.riskCrisora}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation box */}
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <ShieldCheck size={16} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-400">Crisora AI — Live Recommendation</span>
                  <span className="ml-auto text-[10px] text-blue-500/60 animate-pulse font-mono">● LIVE</span>
                </div>
                <p className="text-sm text-blue-100/90 leading-relaxed font-mono border-l-2 border-blue-500/40 pl-3">
                  "{event.crisora.recommendation}"
                </p>
              </div>

              {/* Lives saved banner on final step */}
              {step === TIMELINE.length - 1 && (
                <div className="bg-gradient-to-r from-emerald-950 to-cyan-950 border border-emerald-500/40 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-500">
                  <div className="text-5xl font-black text-emerald-400 mb-2">21,000+</div>
                  <div className="text-white font-bold text-lg">Lives Crisora AI Could Have Saved</div>
                  <div className="text-slate-400 text-sm mt-2">Through early detection, coordinated evacuation, and pre-staged medical response</div>
                  <div className="grid grid-cols-3 gap-4 mt-5">
                    {[
                      { val: '2h 15min', label: 'Earlier Warning' },
                      { val: '72,000', label: 'Citizens Evacuated' },
                      { val: '8', label: 'Medical Centres Pre-Staged' },
                    ].map(s => (
                      <div key={s.label} className="bg-black/30 rounded-xl py-3 border border-emerald-500/20">
                        <div className="text-emerald-400 font-black text-lg">{s.val}</div>
                        <div className="text-slate-400 text-[10px] uppercase tracking-wider">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Map + Timeline sidebar */}
            <div className="lg:col-span-2 space-y-4">

              {/* Gas cloud map */}
              <div className="bg-slate-950 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <MapPin size={13} className="text-red-400" /> Gas Spread — Bhopal
                  </span>
                  {event.gasRadius > 0 && (
                    <span className="text-[10px] text-orange-400 font-bold animate-pulse border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      ~{event.gasRadius}km radius
                    </span>
                  )}
                </div>
                <div className="h-72">
                  <GasCloud radius={event.gasRadius} phase={event.phase} />
                </div>
              </div>

              {/* Timeline scroll */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Clock size={13} /> Event Timeline
                </h3>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {TIMELINE.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => { setStep(i); setIsPlaying(false); }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                        i === step
                          ? 'bg-orange-500/20 border border-orange-500/40'
                          : i < step
                          ? 'bg-white/5 border border-white/5 opacity-70'
                          : 'bg-transparent border border-transparent opacity-40'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${PHASE_COLORS[t.phase].split(' ')[1]}`} />
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 w-10">{t.time}</span>
                      <span className={`text-xs font-semibold truncate ${i === step ? 'text-orange-300' : 'text-slate-400'}`}>
                        {t.label}
                      </span>
                      {i < step && <CheckCircle2 size={12} className="text-emerald-500 shrink-0 ml-auto" />}
                      {i === step && <ChevronRight size={12} className="text-orange-400 shrink-0 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BhopalSimulation;
