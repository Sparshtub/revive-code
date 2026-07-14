import React from 'react';

interface ProblematicFile {
    file: string;
    score: number;
}

interface CommonIssueType {
    title: string;
    count: number;
}

interface RepositoryStatsProps {
    filesCount: number;
    severityCounts: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
    categoryScores: {
        readability: number;
        security: number;
        performance: number;
        maintainability: number;
        documentation: number;
        bestPractices: number;
    };
    languageBreakdown: Record<string, number>;
    problematicFiles: ProblematicFile[];
    commonIssueTypes: CommonIssueType[];
}

export default function RepositoryStats({
    filesCount,
    severityCounts,
    categoryScores,
    languageBreakdown,
    problematicFiles,
    commonIssueTypes
}: RepositoryStatsProps) {
    const totalIssues = Object.values(severityCounts).reduce((a, b) => a + b, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
            {/* Severity and General Metrics */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
                <h4 className="text-sm font-semibold text-ink border-b border-hairline pb-2 flex items-center gap-2">
                    <span>📈</span> Issues Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-canvas border border-hairline rounded">
                        <span className="block text-[10px] text-muted uppercase font-bold tracking-wide">Files Scanned</span>
                        <span className="text-2xl font-serif font-semibold text-ink">{filesCount}</span>
                    </div>
                    <div className="p-3 bg-canvas border border-hairline rounded">
                        <span className="block text-[10px] text-muted uppercase font-bold tracking-wide">Total Issues</span>
                        <span className="text-2xl font-serif font-semibold text-ink">{totalIssues}</span>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Severity Density</span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="py-2 px-1 bg-red-500/5 border border-red-500/20 text-red-600 rounded font-medium">
                            <span className="block text-[9px] uppercase text-red-500">Critical</span>
                            {severityCounts.critical}
                        </div>
                        <div className="py-2 px-1 bg-orange-500/5 border border-orange-500/20 text-orange-600 rounded font-medium">
                            <span className="block text-[9px] uppercase text-orange-500">High</span>
                            {severityCounts.high}
                        </div>
                        <div className="py-2 px-1 bg-amber-500/5 border border-amber-500/20 text-amber-600 rounded font-medium">
                            <span className="block text-[9px] uppercase text-amber-500">Med</span>
                            {severityCounts.medium}
                        </div>
                        <div className="py-2 px-1 bg-green-500/5 border border-green-500/20 text-green-600 rounded font-medium">
                            <span className="block text-[9px] uppercase text-green-500">Low</span>
                            {severityCounts.low}
                        </div>
                    </div>
                </div>
            </div>

            {/* Language Breakdown */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
                <h4 className="text-sm font-semibold text-ink border-b border-hairline pb-2 flex items-center gap-2">
                    <span>🔤</span> Language Composition
                </h4>
                {Object.keys(languageBreakdown).length === 0 ? (
                    <p className="text-xs text-muted py-6 text-center">No language data available</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(languageBreakdown).map(([lang, pct]) => (
                            <div key={lang} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="capitalize">{lang}</span>
                                    <span className="text-muted">{pct}%</span>
                                </div>
                                <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-primary h-full rounded-full" 
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Most Problematic Files */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-3.5">
                <h4 className="text-sm font-semibold text-ink border-b border-hairline pb-2 flex items-center gap-2">
                    <span>⚠️</span> Complexity Hotspots
                </h4>
                {problematicFiles.length === 0 ? (
                    <p className="text-xs text-muted py-6 text-center">No hotspot files identified</p>
                ) : (
                    <div className="divide-y divide-hairline">
                        {problematicFiles.map((pf, idx) => (
                            <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                                <span className="font-mono text-ink truncate flex-1" title={pf.file}>
                                    {pf.file}
                                </span>
                                <span className="px-2 py-0.5 rounded-sm bg-red-500/10 text-red-600 font-semibold border border-red-500/15">
                                    Weight: {pf.score}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Most Common Issue Types */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-3.5">
                <h4 className="text-sm font-semibold text-ink border-b border-hairline pb-2 flex items-center gap-2">
                    <span>💡</span> Frequent Violations
                </h4>
                {commonIssueTypes.length === 0 ? (
                    <p className="text-xs text-muted py-6 text-center">No recurring violations</p>
                ) : (
                    <div className="divide-y divide-hairline">
                        {commonIssueTypes.map((cit, idx) => (
                            <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                                <span className="font-medium text-ink truncate flex-1">
                                    {cit.title}
                                </span>
                                <span className="px-2 py-0.5 rounded-sm bg-surface-soft border border-hairline text-muted">
                                    Count: {cit.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
