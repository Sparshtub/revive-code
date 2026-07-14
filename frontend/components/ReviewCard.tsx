import React from 'react';

export interface Issue {
  line?: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  title: string;
  description: string;
  suggestion?: string;
  file?: string;
  is_ai?: boolean;
}

interface ReviewCardProps {
  issues: Issue[];
}

export default function ReviewCard({ issues }: ReviewCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          icon: '🔴',
          badge: 'bg-error/10 text-error border-error/20',
          card: 'border-error/20 bg-error/5'
        };
      case 'high':
        return {
          icon: '🟠',
          badge: 'bg-accent-amber/15 text-accent-amber border-accent-amber/25',
          card: 'border-accent-amber/20 bg-accent-amber/5'
        };
      case 'medium':
        return {
          icon: '🟡',
          badge: 'bg-warning/10 text-warning border-warning/20',
          card: 'border-warning/15 bg-warning/5'
        };
      default:
        return {
          icon: '🟢',
          badge: 'bg-success/10 text-success border-success/20',
          card: 'border-success/15 bg-success/5'
        };
    }
  };

  if (issues.length === 0) {
    return (
      <div className="w-full bg-surface-card border border-hairline rounded-lg p-10 text-center">
        <span className="text-4xl block mb-4">🎉</span>
        <h3 className="text-xl font-serif font-medium text-ink">No issues found!</h3>
        <p className="text-sm text-body mt-2 max-w-md mx-auto">Your code is clean, optimized, and secure. Excellent job!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <h3 className="text-2xl font-serif font-medium text-ink">Detected Issues ({issues.length})</h3>
      </div>
      
      <div className="space-y-4">
        {issues.map((issue, idx) => {
          const styles = getSeverityStyles(issue.severity);
          const isAI = issue.is_ai;
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-lg border transition-all duration-300 hover:translate-x-1 ${
                isAI 
                  ? 'border-purple-300/40 bg-purple-500/5 shadow-sm shadow-purple-500/5' 
                  : styles.card
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isAI ? '✨' : styles.icon}</span>
                  <h4 className="text-lg font-serif font-semibold text-ink flex items-center gap-2">
                    {issue.title}
                    {isAI && (
                      <span className="text-[10px] font-sans font-semibold tracking-wider uppercase bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded-full border border-purple-500/20">
                        AI Check
                      </span>
                    )}
                  </h4>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {issue.file && (
                    <span className="text-xs px-2.5 py-1 rounded-sm bg-surface-card border border-hairline text-body font-mono max-w-[180px] truncate" title={issue.file}>
                      {issue.file}
                    </span>
                  )}
                  {issue.line !== undefined && (
                    <span className="text-xs px-2.5 py-1 rounded-sm bg-surface-card border border-hairline text-body font-mono">
                      Line {issue.line}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-sm border font-semibold tracking-wide uppercase ${
                    isAI ? 'bg-purple-100 text-purple-700 border-purple-300/40' : styles.badge
                  }`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-body-strong mt-3 leading-relaxed font-sans">
                {issue.description}
              </p>
              
              {issue.suggestion && (
                <div className="mt-4 p-4 rounded-lg bg-surface-dark border border-hairline/10 flex items-start gap-3">
                  <span className="text-success mt-0.5 font-bold">✓</span>
                  <div className="w-full">
                    <span className="text-xs font-sans font-semibold text-success uppercase tracking-wider block mb-1">Recommended Fix</span>
                    <pre className="text-xs font-mono text-on-dark bg-surface-dark-soft p-3 rounded border border-hairline/5 overflow-x-auto whitespace-pre-wrap">
                      {issue.suggestion}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
