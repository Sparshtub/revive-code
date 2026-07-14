import React, { useState, useEffect } from 'react';
import OverallScoreCard from './OverallScoreCard';
import CategoryScoreCard from './CategoryScoreCard';
import ScoreChart from './ScoreChart';
import FileExplorer from './FileExplorer';
import MonacoViewer from './MonacoViewer';
import IssueList from './IssueList';
import RepositoryStats from './RepositoryStats';
import RepositorySummary from './RepositorySummary';
import { Issue } from '../ReviewCard';

interface RepositoryDashboardProps {
    repoData: {
        id?: string;
        label: string; // e.g. "GitHub Repository: https://..." or "GitHub Pull Request: ..."
        branch?: string;
        pr_number?: number;
        commit?: string;
        files_count: number;
        overallScore: number;
        categoryScores: {
            readability: number;
            security: number;
            performance: number;
            maintainability: number;
            documentation: number;
            bestPractices: number;
        };
        severityCounts: {
            critical: number;
            high: number;
            medium: number;
            low: number;
            info: number;
        };
        summary: string;
        issues: Issue[];
        files_content: Record<string, string>; // mapping path -> file content
        problematic_files: Array<{ file: string; score: number }>;
        common_issue_types: Array<{ title: string; count: number }>;
        language_breakdown: Record<string, number>;
    };
    onNewScan: () => void;
}

export default function RepositoryDashboard({ repoData, onNewScan }: RepositoryDashboardProps) {
    const fileList = Object.keys(repoData.files_content || {});
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [scrollToLine, setScrollToLine] = useState<{ line: number; timestamp: number } | null>(null);

    // Set first file as active on mount or load
    useEffect(() => {
        if (fileList.length > 0) {
            setActiveFilePath(fileList[0]);
        } else {
            setActiveFilePath(null);
        }
    }, [repoData]);

    const handleSelectLine = (line: number) => {
        setScrollToLine({ line, timestamp: Date.now() });
    };

    // Auto-detect Monaco editor language based on file extension
    const getEditorLanguage = (filePath: string): string => {
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        const extMap: Record<string, string> = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.java': 'java',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.h': 'cpp',
            '.hpp': 'cpp'
        };
        return extMap[ext] || 'javascript';
    };

    // Filter issues for the currently active file
    const activeFileIssues = repoData.issues.filter(
        issue => issue.file === activeFilePath
    );

    const getShortLabel = () => {
        const parts = repoData.label.split('\n');
        return parts[0] || repoData.label;
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12 font-sans text-ink">
            {/* Repo Header Meta Block */}
            <div className="bg-canvas border border-hairline rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <h2 className="text-xl font-serif font-semibold truncate max-w-lg" title={repoData.label}>
                            {getShortLabel()}
                        </h2>
                    </div>
                    <div className="text-xs text-muted flex flex-wrap items-center gap-4 font-mono">
                        {repoData.branch && (
                            <span className="px-2 py-0.5 bg-surface-card border border-hairline rounded-sm">
                                Branch: {repoData.branch}
                            </span>
                        )}
                        {repoData.pr_number && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-700 border border-purple-500/20 rounded-sm font-semibold">
                                Pull Request #{repoData.pr_number}
                            </span>
                        )}
                        {repoData.commit && (
                            <span className="truncate max-w-[200px]" title={repoData.commit}>
                                Commit: {repoData.commit.slice(0, 8)}
                            </span>
                        )}
                        <span>Files: {repoData.files_count}</span>
                    </div>
                </div>

                <button
                    onClick={onNewScan}
                    className="self-stretch md:self-auto bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm px-5 py-2.5 transition-colors uppercase tracking-wider text-center"
                >
                    &larr; New scan
                </button>
            </div>

            {/* Health Score Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6 items-stretch">
                <div className="md:col-span-1 lg:col-span-3">
                    <OverallScoreCard score={repoData.overallScore} />
                </div>
                <div className="md:col-span-2 lg:col-span-6">
                    <CategoryScoreCard categories={repoData.categoryScores} />
                </div>
                <div className="md:col-span-3 lg:col-span-3">
                    <ScoreChart severityCounts={repoData.severityCounts} />
                </div>
            </div>

            {/* LLM Repository Narrative */}
            <RepositorySummary summary={repoData.summary} />

            {/* Repository Visual Analytics Charts & Stats */}
            <RepositoryStats
                filesCount={repoData.files_count}
                severityCounts={repoData.severityCounts}
                categoryScores={repoData.categoryScores}
                languageBreakdown={repoData.language_breakdown}
                problematicFiles={repoData.problematic_files}
                commonIssueTypes={repoData.common_issue_types}
            />

            {/* Interactive Folder Explorer and Workspace Viewer */}
            <div className="space-y-3">
                <div className="border-b border-hairline pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                        Interactive Code Workspace
                    </h3>
                    {activeFilePath && (
                        <span className="text-xs font-mono text-muted bg-surface-card border border-hairline px-2.5 py-0.5 rounded-sm">
                            Viewing: {activeFilePath}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Sidebar Folder Directory */}
                    <div className="lg:col-span-3 h-[495px]">
                        <FileExplorer
                            files={fileList}
                            activeFile={activeFilePath}
                            onSelectFile={(f) => {
                                setActiveFilePath(f);
                                setScrollToLine(null); // clear search line
                            }}
                        />
                    </div>

                    {/* Monaco Editor Code Display */}
                    <div className="lg:col-span-5 h-[495px] overflow-hidden rounded-lg border border-hairline/10">
                        {activeFilePath ? (
                            <MonacoViewer
                                code={repoData.files_content[activeFilePath] || ''}
                                language={getEditorLanguage(activeFilePath)}
                                issues={activeFileIssues}
                                scrollToLineTrigger={scrollToLine}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center bg-surface-dark text-on-dark-soft p-10 text-center text-xs">
                                Select a file in the directory explorer to display code.
                            </div>
                        )}
                    </div>

                    {/* File Specific Issues Column */}
                    <div className="lg:col-span-4 h-[495px] overflow-y-auto bg-surface-card border border-hairline rounded-lg p-5">
                        <div className="sticky top-0 bg-surface-card pb-3.5 border-b border-hairline mb-4 z-10">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                File Issues ({activeFileIssues.length})
                            </h4>
                        </div>
                        {activeFilePath ? (
                            activeFileIssues.length === 0 ? (
                                <div className="text-center py-12 text-muted text-xs">
                                    <span className="text-2xl mb-2.5 block">🎉</span>
                                    This file is clean. No code smells detected.
                                </div>
                            ) : (
                                <IssueList
                                    issues={activeFileIssues}
                                    onSelectLine={handleSelectLine}
                                />
                            )
                        ) : (
                            <div className="text-center py-12 text-muted text-xs">
                                Select a file to inspect detected errors.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
