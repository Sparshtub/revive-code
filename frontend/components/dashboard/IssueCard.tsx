import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge';
import { Issue } from '../ReviewCard';

interface IssueCardProps {
  issue: Issue;
  onSelectLine?: (line: number) => void;
}

export default function IssueCard({ issue, onSelectLine }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isAI = issue.is_ai;

  const getCardBorder = (sev: string) => {
    if (isAI) return 'border-purple-300/40 hover:border-purple-400 bg-purple-500/5';
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'border-error/20 hover:border-error/45 bg-error/[0.02]';
      case 'high':
        return 'border-accent-amber/20 hover:border-accent-amber/45 bg-accent-amber/[0.02]';
      case 'medium':
        return 'border-warning/15 hover:border-warning/45 bg-warning/[0.01]';
      default:
        return 'border-success/15 hover:border-success/45 bg-success/[0.01]';
    }
  };

  const handleCopySuggestion = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  return (
    <div 
      className={`border rounded-lg p-5 transition-all duration-300 cursor-pointer ${getCardBorder(issue.severity)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-base">{isAI ? '✨' : '📝'}</span>
          <h4 className="text-base font-serif font-semibold text-ink flex items-center gap-2">
            {issue.title}
            {isAI && (
              <span className="text-[10px] font-sans font-semibold tracking-wider uppercase bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded-full border border-purple-500/20">
                AI Logic Check
              </span>
            )}
          </h4>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
          {issue.file && (
            <span className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-cream-strong/50 border border-hairline text-muted font-mono max-w-[150px] truncate" title={issue.file}>
              {issue.file}
            </span>
          )}
          {issue.line !== undefined && (
            <button 
              onClick={() => onSelectLine?.(issue.line!)}
              className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-cream-strong border border-hairline text-ink hover:bg-primary hover:text-on-primary hover:border-primary font-mono transition-all"
            >
              Line {issue.line}
            </button>
          )}
          <SeverityBadge severity={issue.severity} />
        </div>
      </div>

      <p className="text-xs text-body mt-2.5 font-sans leading-relaxed">
        {issue.description}
      </p>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-hairline/10 space-y-4 font-sans text-xs">
          {/* AI Explanation / Details */}
          {isAI && (
            <div className="p-3 bg-purple-500/5 border border-purple-500/15 rounded-md">
              <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider block mb-1">
                Language Model Evaluation
              </span>
              <p className="text-body-strong leading-relaxed">
                CodeBERT MLM analysis identified a non-standard pattern. The model flagged this sequence because the token choice deviates significantly from typical training representations.
              </p>
            </div>
          )}

          {/* Suggestion Code Block */}
          {issue.suggestion && (
            <div className="p-4 rounded-lg bg-surface-dark border border-hairline/10 flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">✓</span>
              <div className="w-full">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-semibold text-success uppercase tracking-wider">
                    Recommended Correction
                  </span>
                  <button
                    onClick={(e) => handleCopySuggestion(e, issue.suggestion!)}
                    className="text-[10px] px-2 py-0.5 rounded-sm bg-surface-dark-elevated text-on-dark-soft hover:text-on-dark border border-hairline/10 transition-colors"
                  >
                    Copy code
                  </button>
                </div>
                <pre className="text-xs font-mono text-on-dark bg-surface-dark-soft p-3 rounded border border-hairline/5 overflow-x-auto whitespace-pre-wrap">
                  {issue.suggestion}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
