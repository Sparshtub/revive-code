import React from 'react';

interface ReviewHeaderProps {
  id?: string;
  language: string;
  timestamp?: string;
  onExportJSON: () => void;
  onExportPDF: () => void;
}

export default function ReviewHeader({ id, language, timestamp, onExportJSON, onExportPDF }: ReviewHeaderProps) {
  const formattedDate = timestamp 
    ? new Date(timestamp).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown Date';

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-serif text-ink font-semibold">Code Review Report</h2>
          <span className="text-[10px] font-sans font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-sm">
            {language}
          </span>
        </div>
        <p className="text-[11px] font-sans text-muted">
          Report ID: <span className="font-mono text-ink font-semibold">{id || 'Anonymous'}</span>
        </p>
        <p className="text-[11px] font-sans text-muted">
          Analyzed on: <span className="text-body-strong font-medium">{formattedDate}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 font-sans w-full sm:w-auto">
        <button
          onClick={onExportJSON}
          className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
        >
          <span>📥</span> Export JSON
        </button>
        <button
          onClick={onExportPDF}
          className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
          title="Print to PDF"
        >
          <span>📄</span> Export PDF
        </button>
      </div>
    </div>
  );
}
