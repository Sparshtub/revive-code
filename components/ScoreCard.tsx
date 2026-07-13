import React from 'react';

interface ScoreCategoryProps {
  label: string;
  score: number;
}

export function ScoreCategory({ label, score }: ScoreCategoryProps) {
  const getColorClass = (val: number) => {
    if (val >= 85) return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
    if (val >= 70) return 'text-amber-400 bg-amber-950/30 border-amber-900/50';
    return 'text-rose-400 bg-rose-950/30 border-rose-900/50';
  };

  return (
    <div className={`flex flex-col p-4 rounded-xl border ${getColorClass(score)} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">{label}</span>
      <span className="text-2xl font-bold">{score}</span>
    </div>
  );
}

interface ScoreCardProps {
  overallScore: number;
  categories: {
    readability: number;
    security: number;
    performance: number;
    maintainability: number;
    documentation: number;
  };
}

export default function ScoreCard({ overallScore, categories }: ScoreCardProps) {
  return (
    <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Review Score</h3>
          <p className="text-sm text-zinc-400">Aggregated results across all categories</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-4xl font-extrabold text-white bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{overallScore}/100</span>
          <div className="w-32 bg-zinc-800 h-2.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreCategory label="Readability" score={categories.readability} />
        <ScoreCategory label="Security" score={categories.security} />
        <ScoreCategory label="Performance" score={categories.performance} />
        <ScoreCategory label="Maintainability" score={categories.maintainability} />
        <ScoreCategory label="Documentation" score={categories.documentation} />
      </div>
    </div>
  );
}
