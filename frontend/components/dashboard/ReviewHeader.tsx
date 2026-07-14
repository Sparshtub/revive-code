import React from 'react';

interface ReviewHeaderProps {
  id?: string;
  language: string;
  timestamp?: string;
  onExportJSON: () => void;
  onExportPDF: () => void;
  onExportMarkdown: () => void;
  onExportCSV: () => void;
}

export default function ReviewHeader({ 
  id, 
  language, 
  timestamp, 
  onExportJSON, 
  onExportPDF,
  onExportMarkdown,
  onExportCSV
}: ReviewHeaderProps) {
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
    <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
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

      <div className="flex flex-wrap items-center gap-2.5 font-sans w-full lg:w-auto">
        <button
          onClick={onExportPDF}
          className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
          title="Print or Save Report as PDF"
        >
          <span>📄</span> PDF Report
        </button>
        <button
          onClick={onExportMarkdown}
          className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
          title="Download Report as Markdown"
        >
          <span>📝</span> Markdown
        </button>
        <button
          onClick={onExportCSV}
          className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
          title="Download Issues as CSV"
        >
          <span>📊</span> CSV Spreadsheet
        </button>
        <button
          onClick={onExportJSON}
          className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2 border border-hairline hover:border-primary/30 text-ink bg-canvas hover:bg-surface-cream-strong transition-colors rounded-sm flex items-center justify-center gap-1.5 focus:outline-none"
          title="Download Report as JSON"
        >
          <span>📥</span> JSON Data
        </button>
      </div>
    </div>
  );
}

