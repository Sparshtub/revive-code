import React from 'react';

interface ScoreChartProps {
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export default function ScoreChart({ severityCounts }: ScoreChartProps) {
  const severities = [
    { label: 'Critical', count: severityCounts.critical, color: 'bg-error', text: 'text-error' },
    { label: 'High', count: severityCounts.high, color: 'bg-accent-amber', text: 'text-accent-amber' },
    { label: 'Medium', count: severityCounts.medium, color: 'bg-warning', text: 'text-warning' },
    { label: 'Low', count: severityCounts.low, color: 'bg-success', text: 'text-success' },
    { label: 'Info', count: severityCounts.info, color: 'bg-muted-soft', text: 'text-muted' },
  ];

  const total = Object.values(severityCounts).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-sans font-semibold text-muted uppercase tracking-wider mb-4">
          Severity Breakdown
        </h3>
        
        {total === 0 ? (
          <div className="text-center py-6 text-xs text-muted">No issues found</div>
        ) : (
          <div className="space-y-4">
            {severities.map((item) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-body-strong">{item.label}</span>
                    <span className={`font-mono font-bold ${item.text}`}>{item.count}</span>
                  </div>
                  <div className="w-full bg-surface-cream-strong/50 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-hairline pt-4 mt-4">
        <h4 className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-2.5">
          Scan Trend
        </h4>
        <div className="flex items-end justify-between h-16 pt-2 font-mono text-[9px] text-muted">
          <div className="flex flex-col items-center gap-1 w-1/4">
            <div className="w-full bg-success/20 hover:bg-success/30 rounded-t-sm h-6 transition-all" title="Review #1: 95" />
            <span>Scan 1</span>
          </div>
          <div className="flex flex-col items-center gap-1 w-1/4">
            <div className="w-full bg-warning/20 hover:bg-warning/30 rounded-t-sm h-10 transition-all" title="Review #2: 78" />
            <span>Scan 2</span>
          </div>
          <div className="flex flex-col items-center gap-1 w-1/4">
            <div className="w-full bg-error/20 hover:bg-error/30 rounded-t-sm h-14 transition-all" title="Review #3: 56" />
            <span>Scan 3</span>
          </div>
          <div className="flex flex-col items-center gap-1 w-1/4">
            <div className="w-full bg-primary/20 hover:bg-primary/30 rounded-t-sm h-12 transition-all" title="Review #4: 87" />
            <span>Scan 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
