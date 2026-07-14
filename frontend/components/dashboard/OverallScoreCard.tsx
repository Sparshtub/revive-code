import React from 'react';

interface OverallScoreCardProps {
  score: number;
}

export default function OverallScoreCard({ score }: OverallScoreCardProps) {
  // Calculate SVG circle properties
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 85) return 'stroke-success text-success';
    if (val >= 70) return 'stroke-accent-amber text-accent-amber';
    return 'stroke-error text-error';
  };

  const getScoreBg = (val: number) => {
    if (val >= 85) return 'bg-success/5 border-success/15';
    if (val >= 70) return 'bg-accent-amber/5 border-accent-amber/15';
    return 'bg-error/5 border-error/15';
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-lg border bg-surface-card border-hairline h-full`}>
      <h3 className="text-sm font-sans font-semibold text-muted uppercase tracking-wider mb-6 text-center">
        Overall Quality
      </h3>
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-hairline-soft"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={`transition-all duration-1000 ${getScoreColor(score).split(' ')[0]}`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-4xl font-serif font-bold ${getScoreColor(score).split(' ')[1]}`}>{score}</span>
          <span className="text-[10px] font-sans text-muted uppercase tracking-widest mt-0.5">Score</span>
        </div>
      </div>
      <div className={`mt-6 px-4 py-1.5 rounded-full border text-xs font-sans font-medium uppercase tracking-wider ${getScoreBg(score)}`}>
        {score >= 85 ? 'Healthy' : score >= 70 ? 'Warning' : 'Needs Focus'}
      </div>
    </div>
  );
}
