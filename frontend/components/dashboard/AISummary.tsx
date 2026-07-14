import React from 'react';

interface AISummaryProps {
  summary: string;
}

export default function AISummary({ summary }: AISummaryProps) {
  if (!summary) return null;

  // Split summary to implement drop-cap style on the first letter
  const firstLetter = summary.charAt(0);
  const remainingText = summary.slice(1);

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-3 font-serif relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline pb-2.5 mb-3">
        <span className="text-base">✨</span>
        <h4 className="text-base font-medium text-ink">AI Synthesis</h4>
      </div>
      <p className="text-body text-sm leading-relaxed antialiased">
        <span className="float-left text-4xl font-semibold text-primary mr-2.5 mt-1 font-serif line-height-0">
          {firstLetter}
        </span>
        {remainingText}
      </p>
    </div>
  );
}
