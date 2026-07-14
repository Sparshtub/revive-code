import React from 'react';

interface ScoreCategoryProps {
  label: string;
  score: number;
}

export function ScoreCategory({ label, score }: ScoreCategoryProps) {
  const getScoreColor = (val: number) => {
    if (val >= 85) return 'text-success border-success/30 bg-success/5';
    if (val >= 70) return 'text-accent-amber border-accent-amber/30 bg-accent-amber/5';
    return 'text-error border-error/30 bg-error/5';
  };

  return (
    <div className={`flex flex-col p-4 rounded-lg border ${getScoreColor(score)} transition-all duration-300 hover:scale-[1.02]`}>
      <span className="text-xs font-sans font-medium uppercase tracking-wider text-on-dark-soft mb-1">{label}</span>
      <span className="text-2xl font-serif font-semibold">{score}</span>
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
    bestPractices?: number;
  };
}

export default function ScoreCard({ overallScore, categories }: ScoreCardProps) {
  return (
    <div className="w-full bg-surface-dark border border-hairline/10 rounded-lg p-8 text-on-dark shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 border-b border-hairline/10 pb-6">
        <div>
          <h3 className="text-2xl font-serif font-medium text-on-dark mb-1">Code Health Score</h3>
          <p className="text-sm text-on-dark-soft font-sans">Aggregated review results across critical categories</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-5xl font-serif font-bold text-primary">{overallScore}<span className="text-xl text-on-dark-soft font-normal">/100</span></span>
            <div className="w-32 bg-surface-dark-elevated h-2 rounded-full mt-2 overflow-hidden border border-hairline/5">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000"
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <ScoreCategory label="Readability" score={categories.readability} />
        <ScoreCategory label="Security" score={categories.security} />
        <ScoreCategory label="Performance" score={categories.performance} />
        <ScoreCategory label="Maintainability" score={categories.maintainability} />
        <ScoreCategory label="Documentation" score={categories.documentation} />
        <ScoreCategory label="Best Practices" score={categories.bestPractices !== undefined ? categories.bestPractices : overallScore} />
      </div>
    </div>
  );
}
