import React from 'react';
import { Issue } from '../ReviewCard';

interface PrintableReportProps {
  reviewData: {
    id?: string;
    code?: string;
    language?: string;
    overallScore: number;
    categoryScores: {
      readability: number;
      security: number;
      performance: number;
      maintainability: number;
      documentation: number;
      bestPractices?: number;
    };
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    summary?: string;
    issues: Issue[];
    files_count?: number;
    branch?: string;
    pr_number?: number;
    commit?: string;
    label?: string;
    problematic_files?: Array<{ file: string; score: number }>;
    common_issue_types?: Array<{ title: string; count: number }>;
    language_breakdown?: Record<string, number>;
    created_at?: string;
  };
  isRepository?: boolean;
}

export default function PrintableReport({ reviewData, isRepository = false }: PrintableReportProps) {
  const formattedDate = reviewData.created_at
    ? new Date(reviewData.created_at).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  const getScoreStatus = (val: number) => {
    if (val >= 85) return 'Healthy';
    if (val >= 70) return 'Warning';
    return 'Needs Focus';
  };

  const getScoreTextColor = (val: number) => {
    if (val >= 85) return 'text-[#5db872]'; // success
    if (val >= 70) return 'text-[#e8a55a]'; // accent-amber
    return 'text-[#c64545]'; // error
  };

  const getScoreBgColor = (val: number) => {
    if (val >= 85) return 'bg-[#5db872]/10 border-[#5db872]/20';
    if (val >= 70) return 'bg-[#e8a55a]/10 border-[#e8a55a]/20';
    return 'bg-[#c64545]/10 border-[#c64545]/20';
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-[#c64545]/10 text-[#c64545] border-[#c64545]/20';
      case 'high':
        return 'bg-[#e8a55a]/15 text-[#e8a55a] border-[#e8a55a]/25';
      case 'medium':
        return 'bg-[#d4a017]/10 text-[#d4a017] border-[#d4a017]/20';
      default:
        return 'bg-[#5db872]/10 text-[#5db872] border-[#5db872]/20';
    }
  };

  const totalIssues = reviewData.issues ? reviewData.issues.length : 0;
  const categoriesList = [
    { label: 'Readability', val: reviewData.categoryScores.readability },
    { label: 'Security', val: reviewData.categoryScores.security },
    { label: 'Performance', val: reviewData.categoryScores.performance },
    { label: 'Maintainability', val: reviewData.categoryScores.maintainability },
    { label: 'Documentation', val: reviewData.categoryScores.documentation },
    { label: 'Best Practices', val: reviewData.categoryScores.bestPractices !== undefined ? reviewData.categoryScores.bestPractices : reviewData.overallScore },
  ];

  // SVG Dial Math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (reviewData.overallScore / 100) * circumference;

  return (
    <div className="font-sans text-[#141413] bg-white p-12 max-w-4xl mx-auto print:p-0 print:max-w-full">
      {/* 1. Header Block */}
      <div className="border-b-2 border-[#141413] pb-6 mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl font-bold font-serif uppercase tracking-wider text-[#141413]">
              ReviveCode Audit Report
            </h1>
          </div>
          <p className="text-xs text-[#6c6a64] font-mono">
            Report ID: <span className="font-semibold text-[#141413]">{reviewData.id || 'Anonymous'}</span>
          </p>
          <p className="text-xs text-[#6c6a64]">
            Generated on: <span className="font-medium text-[#141413]">{formattedDate}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#cc785c]/10 text-[#cc785c] border border-[#cc785c]/20 px-2.5 py-1 rounded-sm">
            {isRepository ? 'Repository Scan' : `Language: ${reviewData.language || 'Unknown'}`}
          </span>
        </div>
      </div>

      {/* 2. Repository Metadata Block (if Repository) */}
      {isRepository && (
        <div className="bg-[#f5f0e8]/50 border border-[#e6dfd8] rounded-md p-4 mb-8 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {reviewData.label && (
            <div className="col-span-2 border-b border-[#e6dfd8] pb-1.5 mb-1.5">
              <span className="text-[#6c6a64] block font-semibold text-[10px] uppercase">Target URL/Repo</span>
              <span className="font-medium">{reviewData.label.replace('GitHub Repository: ', '')}</span>
            </div>
          )}
          {reviewData.branch && (
            <div>
              <span className="text-[#6c6a64] block font-semibold text-[10px] uppercase">Branch</span>
              <span className="font-mono">{reviewData.branch}</span>
            </div>
          )}
          {reviewData.pr_number && (
            <div>
              <span className="text-[#6c6a64] block font-semibold text-[10px] uppercase">Pull Request</span>
              <span className="font-semibold text-purple-700">PR #{reviewData.pr_number}</span>
            </div>
          )}
          {reviewData.commit && (
            <div className="col-span-2">
              <span className="text-[#6c6a64] block font-semibold text-[10px] uppercase">Commit Hash</span>
              <span className="font-mono text-[11px] truncate block">{reviewData.commit}</span>
            </div>
          )}
          <div>
            <span className="text-[#6c6a64] block font-semibold text-[10px] uppercase">Files Scanned</span>
            <span>{reviewData.files_count || 0} files</span>
          </div>
        </div>
      )}

      {/* 3. Executive Metrics Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8 items-stretch">
        {/* Overall Quality Dial */}
        <div className="border border-[#e6dfd8] rounded-lg p-6 flex flex-col items-center justify-center bg-[#faf9f5]">
          <h2 className="text-xs font-semibold text-[#6c6a64] uppercase tracking-wider mb-4 text-center">
            Overall Health
          </h2>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-[#ebe6df] fill-none"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className={`fill-none stroke-current ${getScoreTextColor(reviewData.overallScore)}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold font-serif ${getScoreTextColor(reviewData.overallScore)}`}>
                {reviewData.overallScore}
              </span>
              <span className="text-[9px] font-semibold text-[#6c6a64] uppercase tracking-widest mt-0.5">/ 100</span>
            </div>
          </div>
          <div className={`mt-4 px-3 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${getScoreBgColor(reviewData.overallScore)}`}>
            {getScoreStatus(reviewData.overallScore)}
          </div>
        </div>

        {/* Severity Breakdown Bar Chart */}
        <div className="border border-[#e6dfd8] rounded-lg p-6 flex flex-col justify-between col-span-2 bg-[#faf9f5]">
          <div>
            <h2 className="text-xs font-semibold text-[#6c6a64] uppercase tracking-wider mb-4">
              Severity Distribution
            </h2>
            {totalIssues === 0 ? (
              <div className="text-center py-6 text-xs text-[#6c6a64]">No issues found in workspace.</div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Critical', count: reviewData.severityCounts.critical, color: 'bg-[#c64545]' },
                  { label: 'High', count: reviewData.severityCounts.high, color: 'bg-[#e8a55a]' },
                  { label: 'Medium', count: reviewData.severityCounts.medium, color: 'bg-[#d4a017]' },
                  { label: 'Low', count: reviewData.severityCounts.low, color: 'bg-[#5db872]' },
                  { label: 'Info', count: reviewData.severityCounts.info, color: 'bg-[#8e8b82]' },
                ].map((item) => {
                  const percentage = totalIssues > 0 ? (item.count / totalIssues) * 100 : 0;
                  return (
                    <div key={item.label} className="flex items-center gap-3 text-xs">
                      <span className="w-14 font-semibold text-[#141413]">{item.label}</span>
                      <div className="flex-1 bg-[#ebe6df] h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-5 text-right font-mono font-bold text-[#141413]">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Category Score Breakdown */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[#6c6a64] uppercase tracking-wider mb-3">
          Category Analysis
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {categoriesList.map((item) => (
            <div key={item.label} className="border border-[#e6dfd8] rounded-md p-3.5 bg-[#faf9f5]/50 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-semibold text-[#3d3d3a]">{item.label}</span>
                <span className={`text-sm font-bold font-serif ${getScoreTextColor(item.val)}`}>
                  {item.val}<span className="text-[9px] text-[#6c6a64] font-normal">/100</span>
                </span>
              </div>
              <div className="w-full bg-[#ebe6df] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreTextColor(item.val).replace('text-', 'bg-')}`}
                  style={{ width: `${item.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Repository Statistics (if Repository) */}
      {isRepository && reviewData.language_breakdown && (
        <div className="border border-[#e6dfd8] rounded-lg p-5 mb-8 bg-[#faf9f5]/30">
          <h2 className="text-xs font-semibold text-[#6c6a64] uppercase tracking-wider mb-4">
            Repository Composition & Risk
          </h2>
          <div className="grid grid-cols-2 gap-8 text-xs">
            {/* Language breakdown list */}
            <div>
              <span className="font-semibold text-[#6c6a64] block mb-2 text-[10px] uppercase">Language Breakdown</span>
              <div className="space-y-1.5">
                {Object.entries(reviewData.language_breakdown).map(([lang, percentage]) => (
                  <div key={lang} className="flex justify-between items-center border-b border-[#e6dfd8]/60 pb-1">
                    <span className="font-mono font-medium">{lang}</span>
                    <span className="font-mono text-[#6c6a64]">{percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Problematic files */}
            <div>
              <span className="font-semibold text-[#6c6a64] block mb-2 text-[10px] uppercase">Top Alert Files</span>
              {reviewData.problematic_files && reviewData.problematic_files.length > 0 ? (
                <div className="space-y-1.5">
                  {reviewData.problematic_files.slice(0, 4).map((f) => (
                    <div key={f.file} className="flex justify-between items-center border-b border-[#e6dfd8]/60 pb-1">
                      <span className="truncate max-w-[200px] font-mono" title={f.file}>{f.file}</span>
                      <span className={`font-semibold font-serif ${getScoreTextColor(f.score)}`}>{f.score}/100</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[#6c6a64]">No files triggered warning scores.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. AI Summary Block */}
      {reviewData.summary && (
        <div className="border-l-4 border-[#cc785c] bg-[#faf9f5] rounded-r-md p-6 mb-8 font-serif leading-relaxed">
          <div className="flex items-center gap-2 border-b border-[#e6dfd8] pb-2 mb-3">
            <span className="text-sm">✨</span>
            <h3 className="text-sm font-semibold text-[#141413] uppercase tracking-wider font-sans">
              AI Synthesis Executive Summary
            </h3>
          </div>
          <p className="text-sm text-[#252523] leading-relaxed antialiased whitespace-pre-wrap">
            {reviewData.summary}
          </p>
        </div>
      )}

      {/* Page break before issues listing */}
      <div className="page-break-before print:mt-12" />

      {/* 7. Issues Catalog */}
      <div className="space-y-6">
        <div className="border-b border-[#141413] pb-2">
          <h2 className="text-lg font-bold font-serif text-[#141413] uppercase tracking-wide">
            Issues Catalog ({totalIssues} findings)
          </h2>
        </div>

        {totalIssues === 0 ? (
          <div className="border border-[#e6dfd8] rounded-md p-8 text-center text-xs text-[#6c6a64] bg-[#faf9f5]">
            🎉 No issues detected. Code complies fully with structural, quality, and security requirements.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary List Table */}
            <div className="overflow-hidden border border-[#e6dfd8] rounded-md mb-8">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f5f0e8] border-b border-[#e6dfd8]">
                    <th className="p-3 font-semibold w-10 text-center">#</th>
                    <th className="p-3 font-semibold w-24">Severity</th>
                    {isRepository && <th className="p-3 font-semibold">File</th>}
                    <th className="p-3 font-semibold w-16">Line</th>
                    <th className="p-3 font-semibold">Finding Title</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6dfd8]/60">
                  {reviewData.issues.map((issue, idx) => (
                    <tr key={idx} className="hover:bg-[#faf9f5]/50">
                      <td className="p-3 text-center font-mono text-[#6c6a64]">{idx + 1}</td>
                      <td className="p-3 font-medium">
                        <span className={`px-2 py-0.5 text-[9px] rounded-sm font-semibold uppercase tracking-wider border ${getSeverityBadgeClass(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </td>
                      {isRepository && (
                        <td className="p-3 font-mono text-[#3d3d3a] truncate max-w-[200px]" title={issue.file}>
                          {issue.file || 'Global'}
                        </td>
                      )}
                      <td className="p-3 font-mono text-[#6c6a64]">{issue.line !== undefined ? issue.line : 'N/A'}</td>
                      <td className="p-3 font-medium text-[#141413]">{issue.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Page break before detailed view */}
            <div className="page-break-before" />

            {/* Detailed Cards */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold font-serif text-[#6c6a64] uppercase tracking-widest border-b border-[#e6dfd8] pb-1">
                Detailed Analysis Logs
              </h3>
              
              {reviewData.issues.map((issue, idx) => {
                const badgeClass = getSeverityBadgeClass(issue.severity);
                return (
                  <div
                    key={idx}
                    className="border border-[#e6dfd8] rounded-lg p-6 bg-[#faf9f5]/30 break-inside-avoid print:bg-white"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#e6dfd8]/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#6c6a64]">Finding #{idx + 1}</span>
                        <h4 className="text-sm font-bold font-serif text-[#141413] flex items-center gap-2">
                          {issue.title}
                          {issue.is_ai && (
                            <span className="text-[8px] font-sans font-semibold tracking-wider uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                              AI CHECK
                            </span>
                          )}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#3d3d3a]">
                        {issue.file && (
                          <span className="px-2 py-0.5 bg-[#f5f0e8] border border-[#e6dfd8] rounded-sm max-w-[200px] truncate" title={issue.file}>
                            {issue.file}
                          </span>
                        )}
                        {issue.line !== undefined && (
                          <span className="px-2 py-0.5 bg-[#f5f0e8] border border-[#e6dfd8] rounded-sm">
                            Line {issue.line}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-sm border font-semibold uppercase tracking-wider ${badgeClass}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#252523] mt-3 leading-relaxed">
                      {issue.description}
                    </p>

                    {issue.suggestion && (
                      <div className="mt-4 p-4 rounded-md bg-[#faf9f5] border border-[#e6dfd8] flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-[#5db872] uppercase tracking-wider">
                          ✓ Recommended Fix Pattern
                        </span>
                        <pre className="text-[11px] font-mono text-[#141413] bg-white p-3 rounded border border-[#ebe6df] overflow-x-auto whitespace-pre-wrap leading-tight">
                          {issue.suggestion}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
