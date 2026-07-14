import React from 'react';

interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const getStyles = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'bg-error/10 text-error border-error/20';
      case 'high':
        return 'bg-accent-amber/15 text-accent-amber border-accent-amber/25';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted-soft/10 text-muted border-hairline';
    }
  };

  return (
    <span className={`text-[10px] font-sans font-semibold tracking-wide uppercase px-2 py-0.5 rounded-sm border ${getStyles(severity)}`}>
      {severity}
    </span>
  );
}
