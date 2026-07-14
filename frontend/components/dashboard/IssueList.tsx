import React, { useState, useMemo } from 'react';
import IssueCard from './IssueCard';
import { Issue } from '../ReviewCard';

interface IssueListProps {
  issues: Issue[];
  onSelectLine?: (line: number) => void;
}

type SortOption = 'line' | 'severity-desc' | 'severity-asc';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function IssueList({ issues, onSelectLine }: IssueListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('line');

  // Severity sorting priority
  const severityWeight = (sev: string): number => {
    switch (sev.toLowerCase()) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const processedIssues = useMemo(() => {
    let result = [...issues];

    // Filter by Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(issue => 
        issue.title.toLowerCase().includes(term) || 
        issue.description.toLowerCase().includes(term)
      );
    }

    // Filter by Severity
    if (severityFilter !== 'all') {
      result = result.filter(issue => issue.severity.toLowerCase() === severityFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'line') {
        const lineA = a.line !== undefined ? a.line : 99999;
        const lineB = b.line !== undefined ? b.line : 99999;
        return lineA - lineB;
      }
      if (sortBy === 'severity-desc') {
        return severityWeight(b.severity) - severityWeight(a.severity);
      }
      if (sortBy === 'severity-asc') {
        return severityWeight(a.severity) - severityWeight(b.severity);
      }
      return 0;
    });

    return result;
  }, [issues, searchTerm, severityFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col md:flex-row gap-4 justify-between items-center font-sans">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-canvas border border-hairline text-ink text-xs rounded-sm px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Filter:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="bg-canvas border border-hairline text-ink rounded-sm px-2.5 py-1.5 focus:outline-none text-[11px] font-medium"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-canvas border border-hairline text-ink rounded-sm px-2.5 py-1.5 focus:outline-none text-[11px] font-medium"
            >
              <option value="line">Line Number</option>
              <option value="severity-desc">Severity (High &rarr; Low)</option>
              <option value="severity-asc">Severity (Low &rarr; High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues list container */}
      <div className="space-y-4">
        {processedIssues.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-10 text-center text-muted text-xs">
            No matching issues found
          </div>
        ) : (
          processedIssues.map((issue, idx) => (
            <IssueCard 
              key={idx} 
              issue={issue} 
              onSelectLine={onSelectLine} 
            />
          ))
        )}
      </div>
    </div>
  );
}
