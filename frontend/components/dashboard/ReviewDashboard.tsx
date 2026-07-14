import React, { useState } from 'react';
import ReviewHeader from './ReviewHeader';
import OverallScoreCard from './OverallScoreCard';
import CategoryScoreCard from './CategoryScoreCard';
import AISummary from './AISummary';
import ScoreChart from './ScoreChart';
import IssueList from './IssueList';
import MonacoViewer from './MonacoViewer';
import { Issue } from '../ReviewCard';
import PrintableReport from './PrintableReport';
import { exportToJSON, exportToCSV, exportToMarkdown } from '../../lib/exportUtils';

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
    exportToJSON(reviewData);
  };

  const handleExportCSV = () => {
    exportToCSV(reviewData);
  };

  const handleExportMarkdown = () => {
    exportToMarkdown(reviewData);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <>
      <div className="print:hidden space-y-6 max-w-6xl mx-auto pb-12">
        {/* Review Header */}
        <ReviewHeader
          id={reviewData.id}
          language={reviewData.language}
          timestamp={reviewData.created_at}
          onExportJSON={handleExportJSON}
          onExportPDF={handleExportPDF}
          onExportMarkdown={handleExportMarkdown}
          onExportCSV={handleExportCSV}
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

      <div className="hidden print:block bg-white text-black min-h-screen">
        <PrintableReport reviewData={reviewData} />
      </div>
    </>
  );
}

