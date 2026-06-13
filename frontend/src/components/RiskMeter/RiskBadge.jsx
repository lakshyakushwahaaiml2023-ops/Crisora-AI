import React from 'react';

const RiskBadge = ({ level }) => {
  const badgeStyles = {
    green: 'bg-theme-success/15 text-theme-success border-theme-success/30',
    yellow: 'bg-theme-warning/15 text-theme-warning border-theme-warning/30',
    orange: 'bg-theme-warning/15 text-theme-warning border-theme-warning/30',
    red: 'bg-theme-danger/15 text-theme-danger border-theme-danger/30',
  };

  const style = badgeStyles[level] || badgeStyles.green;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} uppercase tracking-wider`}>
      {level}
    </span>
  );
};

export default RiskBadge;
