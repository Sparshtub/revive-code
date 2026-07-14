import React, { useState } from 'react';
import ReviewHeader from './ReviewHeader';
import OverallScoreCard from './OverallScoreCard';
import CategoryScoreCard from './CategoryScoreCard';
import AISummary from './AISummary';
import ScoreChart from './ScoreChart';
import IssueList from './IssueList';
import MonacoViewer from './MonacoViewer';
import { Issue } from '../ReviewCard';

interface ReviewDashboardProps {
  reviewData: {
    id?: string;
    code: string;
    language: string;
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
    embedding?: number[];
    surprise_scores?: number[];
    created_at?: string;
  };
}

export default function ReviewDashboard({ reviewData }: ReviewDashboardProps) {
  const [scrollToLine, setScrollToLine] = useState<{ line: number; timestamp: number } | null>(null);

  const handleSelectLine = (line: number) => {
    setScrollToLine({ line, timestamp: Date.now() });
  };

  const handleExportJSON = () => {
    const filename = `revivecode-report-${reviewData.id || 'export'}.json`;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reviewData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportPDF = () => {
    // Print window triggers standard PDF print dialog natively
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Review Header */}
      <ReviewHeader
        id={reviewData.id}
        language={reviewData.language}
        timestamp={reviewData.created_at}
        onExportJSON={handleExportJSON}
        onExportPDF={handleExportPDF}
      />

      {/* Main Grid: Overall dial, category bars, severity distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6 items-stretch">
        <div className="md:col-span-1 lg:col-span-3">
          <OverallScoreCard score={reviewData.overallScore} />
        </div>
        <div className="md:col-span-2 lg:col-span-6">
          <CategoryScoreCard categories={reviewData.categoryScores} />
        </div>
        <div className="md:col-span-3 lg:col-span-3">
          <ScoreChart severityCounts={reviewData.severityCounts} />
        </div>
      </div>

      {/* AI Narrative Section */}
      {reviewData.summary && <AISummary summary={reviewData.summary} />}

      {/* Dual Column Explorer: Code Viewer on Left, Issue Explorer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <MonacoViewer
            code={reviewData.code}
            language={reviewData.language}
            issues={reviewData.issues}
            scrollToLineTrigger={scrollToLine}
          />
        </div>
        <div className="lg:col-span-5 h-[495px] overflow-y-auto pr-1">
          <div className="sticky top-0 bg-canvas pb-2 z-10">
            <h3 className="text-sm font-sans font-semibold text-muted uppercase tracking-wider mb-3">
              Issue Explorer ({reviewData.issues.length})
            </h3>
          </div>
          <IssueList 
            issues={reviewData.issues} 
            onSelectLine={handleSelectLine} 
          />
        </div>
      </div>
    </div>
  );
}
