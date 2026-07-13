import React from 'react';

export interface Issue {
  line?: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  title: string;
  description: string;
  suggestion?: string;
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
          badge: 'bg-rose-950/40 text-rose-400 border-rose-800/60',
          card: 'border-rose-900/40 bg-rose-950/5'
        };
      case 'high':
        return {
          icon: 'orange',
          badge: 'bg-orange-950/40 text-orange-400 border-orange-800/60',
          card: 'border-orange-900/40 bg-orange-950/5'
        };
      case 'medium':
        return {
          icon: '🟡',
          badge: 'bg-amber-950/40 text-amber-400 border-amber-800/60',
          card: 'border-amber-900/30 bg-amber-950/5'
        };
      default:
        return {
          icon: '🟢',
          badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60',
          card: 'border-emerald-900/30 bg-emerald-950/5'
        };
    }
  };

  if (issues.length === 0) {
    return (
      <div className="w-full bg-zinc-900/20 border border-zinc-800 rounded-2xl p-8 text-center backdrop-blur-md">
        <span className="text-4xl">🎉</span>
        <h3 className="text-lg font-semibold text-zinc-100 mt-4">No issues found!</h3>
        <p className="text-sm text-zinc-400 mt-2">Your code looks clean, optimized, and secure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Detected Issues ({issues.length})</h3>
      </div>
      
      <div className="space-y-3">
        {issues.map((issue, idx) => {
          const styles = getSeverityStyles(issue.severity);
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border transition-all duration-300 hover:translate-x-1 ${styles.card}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{styles.icon === 'orange' ? '🟠' : styles.icon}</span>
                  <h4 className="font-bold text-zinc-100">{issue.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {issue.line !== undefined && (
                    <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                      Line {issue.line}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-md border font-semibold tracking-wide uppercase ${styles.badge}`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                {issue.description}
              </p>
              
              {issue.suggestion && (
                <div className="mt-4 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-start gap-2.5">
                  <span className="text-emerald-400 mt-0.5 font-bold">✓</span>
                  <div className="w-full">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Suggestion</span>
                    <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-2.5 rounded border border-zinc-800/60 overflow-x-auto whitespace-pre-wrap">
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
