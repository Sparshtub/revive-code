import React from 'react';

interface CategoryScoreCardProps {
  categories: {
    readability: number;
    security: number;
    performance: number;
    maintainability: number;
    documentation: number;
    bestPractices?: number;
  };
}

export default function CategoryScoreCard({ categories }: CategoryScoreCardProps) {
  const getScoreColor = (val: number) => {
    if (val >= 85) return 'bg-success text-success';
    if (val >= 70) return 'bg-accent-amber text-accent-amber';
    return 'bg-error text-error';
  };

  const getCardStyle = (val: number) => {
    if (val >= 85) return 'border-success/15 bg-success/5';
    if (val >= 70) return 'border-accent-amber/15 bg-accent-amber/5';
    return 'border-error/15 bg-error/5';
  };

  const items = [
    { label: 'Readability', val: categories.readability },
    { label: 'Security', val: categories.security },
    { label: 'Performance', val: categories.performance },
    { label: 'Maintainability', val: categories.maintainability },
    { label: 'Documentation', val: categories.documentation },
    { label: 'Best Practices', val: categories.bestPractices !== undefined ? categories.bestPractices : 90 },
  ];

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-5 h-full">
      <h3 className="text-sm font-sans font-semibold text-muted uppercase tracking-wider">
        Category Analysis
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div 
            key={item.label} 
            className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${getCardStyle(item.val)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-sans font-medium text-body-strong tracking-wide">
                {item.label}
              </span>
              <span className={`text-base font-serif font-bold ${getScoreColor(item.val).split(' ')[1]}`}>
                {item.val}<span className="text-[10px] text-muted font-normal">/100</span>
              </span>
            </div>
            <div className="w-full bg-surface-cream-strong/50 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getScoreColor(item.val).split(' ')[0]}`}
                style={{ width: `${item.val}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
