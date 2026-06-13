import React from 'react';

const RiskMeter = ({ score = 0, level = 'green', label = 'Risk Level', size = 120 }) => {
  const radius = 40;
  const circumference = Math.PI * radius;
  // Ensure score stays between 0 and 100
  const fillPercentage = Math.min(Math.max(score, 0), 100) / 100;
  const dashoffset = circumference - (fillPercentage * circumference);

  const colors = {
    green: 'var(--color-success)',
    yellow: 'var(--color-warning)',
    orange: 'var(--color-warning)',
    red: 'var(--color-danger)'
  };

  const color = colors[level] || colors.green;
  const isHighRisk = level === 'orange' || level === 'red';

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: size }}>
      {/* Semicircle SVG container: height is half the width */}
      <div className="relative w-full" style={{ height: size / 2 }}>
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
          {/* Glowing pulse effect for high risk behind the arc */}
          {isHighRisk && (
            <path 
              d="M 10 50 A 40 40 0 0 1 90 50" 
              fill="none" 
              stroke={color} 
              strokeWidth="10" 
              strokeLinecap="round"
              className="animate-pulse opacity-40 blur-sm"
            />
          )}
          {/* Background Track */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke="var(--color-border)" 
            strokeWidth="10" 
            strokeLinecap="round"
          />
          {/* Animated Foreground Arc */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={color} 
            strokeWidth="10" 
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Centered Score */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center translate-y-1/3">
          <span className="text-3xl font-bold text-theme-text leading-none">{score}</span>
        </div>
      </div>
      {/* Label section */}
      <div className="mt-5 flex flex-col items-center text-center">
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {level}
        </span>
        <span className="text-xs text-theme-muted mt-0.5">{label}</span>
      </div>
    </div>
  );
};

export default RiskMeter;
