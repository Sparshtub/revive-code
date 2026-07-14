'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/config';
import Editor from '@monaco-editor/react';
import ScoreCard from '@/components/ScoreCard';
import ReviewCard, { Issue } from '@/components/ReviewCard';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/components/AuthContext';
import ReviewDashboard from '@/components/dashboard/ReviewDashboard';
import GithubLoginButton from '@/components/dashboard/GithubLoginButton';
import RepositorySelector from '@/components/dashboard/RepositorySelector';
import PullRequestSelector from '@/components/dashboard/PullRequestSelector';
import RepositoryDashboard from '@/components/dashboard/RepositoryDashboard';
import RepositoryHistory from '@/components/dashboard/RepositoryHistory';

interface ReviewResponse {
  id?: string;
  status: string;
  message: string;
  score: number;
  overallScore?: number;
  categoryScores?: {
    readability: number;
    security: number;
    performance: number;
    maintainability: number;
    documentation: number;
    bestPractices: number;
  };
  severityCounts?: {
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
  code?: string;
  language?: string;
  created_at?: string;
}

// Severity Counts Breakdown Visualizer
const SeverityBreakdown = ({ counts }: { counts: { critical: number; high: number; medium: number; low: number; info: number } }) => {
  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <span className="text-lg">📊</span>
        <h4 className="text-lg font-serif font-medium text-ink">Issues by Severity</h4>
      </div>
      <div className="grid grid-cols-5 gap-2.5 text-center">
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
          <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-red-500 mb-1">Critical</span>
          <span className="text-xl font-semibold text-red-600">{counts.critical}</span>
        </div>
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-md">
          <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-orange-500 mb-1">High</span>
          <span className="text-xl font-semibold text-orange-600">{counts.high}</span>
        </div>
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-md">
          <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-amber-500 mb-1">Medium</span>
          <span className="text-xl font-semibold text-amber-600">{counts.medium}</span>
        </div>
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-md">
          <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-500 mb-1">Low</span>
          <span className="text-xl font-semibold text-emerald-600">{counts.low}</span>
        </div>
        <div className="p-3 bg-slate-500/5 border border-slate-500/20 rounded-md">
          <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 mb-1">Info</span>
          <span className="text-xl font-semibold text-slate-600">{counts.info}</span>
        </div>
      </div>
    </div>
  );
};

// AI Review Summary Editorial Callout
const AIReviewSummary = ({ summary }: { summary: string }) => {
  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-3">
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <span className="text-lg">✨</span>
        <h4 className="text-lg font-serif font-medium text-ink">AI Code Review Summary</h4>
      </div>
      <p className="text-sm text-body leading-relaxed font-sans first-letter:text-2xl first-letter:font-serif first-letter:font-semibold first-letter:text-primary">
        {summary}
      </p>
    </div>
  );
};

interface HistoryItem {
  id: string;
  language: string;
  score: number;
  created_at: string;
}

// CodeBERT Neural Fingerprint Visualizer Component
const NeuralFingerprint = ({ embedding }: { embedding: number[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !embedding || embedding.length < 768) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rows = 24;
    const cols = 32;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;
    
    let minVal = Math.min(...embedding);
    let maxVal = Math.max(...embedding);
    let range = maxVal - minVal || 1.0;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = embedding[r * cols + c];
        const norm = (val - minVal) / range;
        
        let color = '';
        if (norm < 0.5) {
          const t = norm * 2;
          const red = Math.round(24 + (204 - 24) * t);
          const green = Math.round(23 + (120 - 23) * t);
          const blue = Math.round(21 + (92 - 21) * t);
          color = `rgb(${red}, ${green}, ${blue})`;
        } else {
          const t = (norm - 0.5) * 2;
          const red = Math.round(204 + (250 - 204) * t);
          const green = Math.round(120 + (249 - 120) * t);
          const blue = Math.round(92 + (245 - 92) * t);
          color = `rgb(${red}, ${green}, ${blue})`;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
      }
    }
  }, [embedding]);
  
  return (
    <div className="bg-surface-dark border border-hairline/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">🧠</span>
          <h4 className="text-sm font-serif font-medium text-on-dark">CodeBERT Neural Fingerprint</h4>
        </div>
        <span className="text-[10px] font-mono text-on-dark-soft uppercase tracking-wider">
          768 Dimensions
        </span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={240} 
        className="w-full h-44 bg-surface-dark rounded-md overflow-hidden border border-hairline/5 shadow-inner"
      />
      <p className="text-[11px] text-on-dark-soft/70 mt-2.5 leading-relaxed font-sans">
        This matrix maps the 768-dimensional activation representation vectors learned by CodeBERT for your sequence. Brighter cells indicate higher logic coefficients.
      </p>
    </div>
  );
};

// CodeBERT Complexity Gutter Heatmap Component
const ComplexityProfiler = ({ surpriseScores, code }: { surpriseScores: number[], code: string }) => {
  const [showAll, setShowAll] = useState(false);
  const lines = code.split("\n");
  
  const scoredLines = lines.map((text, idx) => ({
    lineNum: idx + 1,
    text: text.trim(),
    score: surpriseScores[idx] || 0.0
  })).filter(line => line.text.length > 0);
  
  const sortedLines = [...scoredLines].sort((a, b) => b.score - a.score);
  const maxScoreLine = sortedLines[0];
  
  const getHeatBarColor = (score: number) => {
    if (score >= 75) return 'bg-error';
    if (score >= 50) return 'bg-accent-amber';
    if (score >= 25) return 'bg-warning';
    return 'bg-success';
  };

  const displayLines = showAll ? scoredLines : scoredLines.slice(0, 5);

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <h4 className="text-lg font-serif font-medium text-ink">Complexity Profiler</h4>
        </div>
        {maxScoreLine && maxScoreLine.score > 20 && (
          <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20 animate-pulse">
            Hottest: Line {maxScoreLine.lineNum}
          </span>
        )}
      </div>
      
      {maxScoreLine && (
        <div className="bg-surface-soft border border-hairline rounded-md p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">💡</span>
          <div>
            <span className="text-xs font-sans font-semibold text-muted uppercase tracking-wider block mb-1">AI Logic Insights</span>
            <p className="text-xs text-body leading-relaxed">
              Line <span className="font-semibold text-ink font-mono">{maxScoreLine.lineNum}</span> has the highest surprise coefficient ({maxScoreLine.score}% surprise score). CodeBERT flags this block as logically dense or non-standard.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <span className="text-[10px] font-sans font-semibold text-muted uppercase tracking-wider block">Line Complexity Profile</span>
        <div className="space-y-2">
          {displayLines.map((line) => (
            <div key={line.lineNum} className="flex items-center gap-4 text-xs">
              <span className="w-6 font-mono text-muted text-right">{line.lineNum}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="font-mono text-ink truncate max-w-[200px]" title={line.text}>
                    {line.text}
                  </span>
                  <span className="font-mono font-medium text-muted">{line.score}%</span>
                </div>
                <div className="w-full bg-surface-soft h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getHeatBarColor(line.score)}`} 
                    style={{ width: `${line.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {scoredLines.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary hover:text-primary-active font-medium mt-2 w-full text-center hover:underline focus:outline-none block"
          >
            {showAll ? 'Show top 5 lines' : `Show all ${scoredLines.length} lines`}
          </button>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const { user, token, isAuthenticated, logout } = useAuth();
  
  // Workspace States
  const [code, setCode] = useState<string>(`def calculate_average(numbers):
    # TODO: add implementation
    total = 0
    for n in numbers:
        total += n
    
    # Unused variable code smell example
    unused_val = 100
    
    return total / len(numbers)`);
  const [language, setLanguage] = useState<string>('python');
  const [workspaceTab, setWorkspaceTab] = useState<'paste' | 'upload' | 'github'>('paste');
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  
  // GitHub Integration States
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState<number>(0);
  
  // GitHub Integration States
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [githubMode, setGithubMode] = useState<'branch' | 'pr'>('branch');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubPr, setGithubPr] = useState<string>('');
  
  // API and Modal States
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  
  // History Drawer States
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check API health status on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => {
        if (res.ok) setApiHealth('connected');
        else setApiHealth('disconnected');
      })
      .catch(() => setApiHealth('disconnected'));
  }, []);

  // Fetch History whenever auth state changes or history drawer opens
  useEffect(() => {
    if (isAuthenticated && token && isHistoryOpen) {
      fetchHistory();
    }
  }, [isAuthenticated, token, isHistoryOpen]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Perform standard single-file code review
  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error('API Request failed. Make sure the backend service is running.');
      }

      const data = await response.json();
      setReviewResult(data);
      
      // Refresh history list if logged in
      if (isAuthenticated) {
        fetchHistory();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while reviewing the code.');
    } finally {
      setLoading(false);
    }
  };

  // Perform GitHub repository / PR review
  const handleGithubReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let endpoint = '/github/repository';
      let payload: Record<string, any> = { repository_url: githubUrl.trim() };

      if (githubMode === 'pr') {
        endpoint = '/github/pr';
        const prNum = parseInt(githubPr);
        if (isNaN(prNum)) {
          throw new Error("Please enter a valid PR number.");
        }
        payload.pr_number = prNum;
      } else {
        payload.branch = githubBranch.trim() || 'main';
      }

      const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'GitHub review execution failed.');
      }

      setReviewResult(data);

      if (isAuthenticated) {
        fetchHistory();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during GitHub repository analysis.');
    } finally {
      setLoading(false);
    }
  };

  // Load code and review details from a saved history item
  const handleLoadHistoryItem = async (historyId: string) => {
    setLoading(true);
    setError(null);
    setReviewResult(null);
    setIsHistoryOpen(false); // close drawer

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/review/${historyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load historical review report.");
      }

      const data = await response.json();
      
      // Restore workspace state
      if (data.language !== 'multiple') {
        setCode(data.code);
        setLanguage(data.language);
        setWorkspaceTab('paste');
      } else {
        // Multi-file repository overview
        setCode(`// Repository analysis: ${data.code}\n// Language: Multiple\n// Issues: ${data.issues.length}`);
        setLanguage('javascript');
        setWorkspaceTab('github');
      }
      
      setReviewResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred loading the review.');
    } finally {
      setLoading(false);
    }
  };

  // Delete history item
  const handleDeleteHistoryItem = async (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation(); // prevent loading item click
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/review/${historyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setHistoryList(prev => prev.filter(item => item.id !== historyId));
        // Reset review display if the deleted report was active
        if (reviewResult && reviewResult.id === historyId) {
          setReviewResult(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Process uploaded source file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFilename(file.name);
    
    // Auto-detect language
    const dotIdx = file.name.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = file.name.slice(dotIdx).toLowerCase();
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
        '.cxx': 'cpp',
        '.h': 'cpp',
        '.hpp': 'cpp'
      };
      if (extMap[ext]) {
        setLanguage(extMap[ext]);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCode(event.target.result as string);
        setWorkspaceTab('paste'); // redirect to editor to preview
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col min-h-screen bg-canvas font-sans text-body selection:bg-primary/20">
      
      {/* Top Navigation */}
      <header className="h-16 bg-canvas border-b border-hairline sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-primary flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-serif font-semibold tracking-tight text-ink">
              ReviveCode
            </h1>
            <span className="text-xs font-mono font-medium text-muted uppercase tracking-wider hidden sm:inline-block">
              / AI Code Reviewer
            </span>
          </div>
        </div>

        {/* User Session & Status */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-sans">
            <span className="font-semibold text-muted">API:</span>
            {apiHealth === 'checking' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-card text-muted border border-hairline animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" /> Checking
              </span>
            )}
            {apiHealth === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Online
              </span>
            )}
            {apiHealth === 'disconnected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
                <span className="w-1.5 h-1.5 rounded-full bg-error" /> Offline
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="text-xs font-medium text-ink hover:underline cursor-pointer py-1.5 px-3 rounded-md hover:bg-surface-card transition-colors"
                >
                  History
                </button>
                <div className="h-4 w-px bg-hairline hidden sm:block" />
                <span className="text-xs font-mono text-muted hidden sm:inline-block max-w-[150px] truncate" title={user?.email}>
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-primary hover:text-primary-active py-1.5 px-3 rounded-md hover:bg-surface-card transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs font-medium text-ink hover:underline py-1.5 px-3"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-md px-4 py-2 transition-colors uppercase tracking-wider"
                >
                  Get History
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-canvas border-b border-hairline py-12 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="max-w-3xl">
          <h2 className="text-4xl sm:text-5xl font-serif font-normal text-ink leading-tight mb-4 tracking-tight">
            Meet your code thinking partner.
          </h2>
          <p className="text-lg text-body-strong font-sans leading-relaxed max-w-2xl">
            Analyze codebases instantly for security vulnerabilities, cyclomatic complexity, and stylistic violations using modern static linters and deep AST verification.
          </p>
        </div>
      </section>

      <main className="flex-1 bg-surface-soft border-b border-hairline py-12 px-6 sm:px-12">
        {reviewResult ? (
          <div className="space-y-6">
            {reviewResult.language === 'multiple' ? (
              <RepositoryDashboard
                repoData={reviewResult as any}
                onNewScan={() => setReviewResult(null)}
              />
            ) : (
              <>
                <div className="max-w-6xl mx-auto flex justify-between items-center font-sans">
                  <span className="text-xs text-muted">
                    Inspect analysis results or start a new scan.
                  </span>
                  <button
                    onClick={() => setReviewResult(null)}
                    className="text-xs font-semibold px-4 py-2 bg-primary hover:bg-primary-active text-on-primary rounded-sm transition-colors uppercase tracking-wider focus:outline-none"
                  >
                    &larr; New Scan
                  </button>
                </div>
                <ReviewDashboard
                  reviewData={{
                    id: reviewResult.id,
                    code: reviewResult.code || code,
                    language: reviewResult.language || language,
                    overallScore: reviewResult.overallScore !== undefined ? reviewResult.overallScore : reviewResult.score,
                    categoryScores: reviewResult.categoryScores || {
                      readability: reviewResult.score,
                      security: Math.max(reviewResult.score - 10, 50),
                      performance: Math.min(reviewResult.score + 5, 100),
                      maintainability: reviewResult.score,
                      documentation: Math.max(reviewResult.score - 20, 40),
                      bestPractices: reviewResult.score,
                    },
                    severityCounts: reviewResult.severityCounts || {
                      critical: 0,
                      high: 0,
                      medium: 0,
                      low: 0,
                      info: 0,
                    },
                    summary: reviewResult.summary,
                    issues: reviewResult.issues,
                    embedding: reviewResult.embedding,
                    surprise_scores: reviewResult.surprise_scores,
                    created_at: reviewResult.created_at || new Date().toISOString(),
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Panel: Code Workspace / GitHub Controls */}
            <div className="lg:col-span-7 flex flex-col bg-surface-dark border border-hairline/10 rounded-lg overflow-hidden shadow-sm">
              
              {/* Workspace Controls Header */}
              <div className="bg-surface-dark-elevated border-b border-hairline/5 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Tab Selector */}
                <div className="flex bg-surface-dark p-1 rounded-md border border-hairline/5">
                  <button
                    onClick={() => setWorkspaceTab('paste')}
                    className={`text-xs font-sans px-3.5 py-1.5 rounded-sm transition-colors font-medium ${
                      workspaceTab === 'paste' 
                        ? 'bg-surface-dark-elevated text-on-dark font-semibold' 
                        : 'text-on-dark-soft hover:text-on-dark'
                    }`}
                  >
                    Paste Code
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('upload')}
                    className={`text-xs font-sans px-3.5 py-1.5 rounded-sm transition-colors font-medium ${
                      workspaceTab === 'upload' 
                        ? 'bg-surface-dark-elevated text-on-dark font-semibold' 
                        : 'text-on-dark-soft hover:text-on-dark'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('github')}
                    className={`text-xs font-sans px-3.5 py-1.5 rounded-sm transition-colors font-medium ${
                      workspaceTab === 'github' 
                        ? 'bg-surface-dark-elevated text-on-dark font-semibold' 
                        : 'text-on-dark-soft hover:text-on-dark'
                    }`}
                  >
                    GitHub Repository
                  </button>
                </div>

                {/* Language and Submit Group */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                  {workspaceTab !== 'github' && (
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-surface-dark border border-hairline/10 rounded-sm text-xs px-3 py-1.5 text-on-dark focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="go">Go</option>
                    </select>
                  )}

                  {workspaceTab !== 'github' && (
                    <button
                      onClick={handleReview}
                      disabled={loading}
                      className="bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm px-5 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      {loading ? 'Analyzing...' : 'Analyze Code'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Workspaces */}
              <div className="flex-1 min-h-[500px] bg-surface-dark flex flex-col">
                
                {/* Tab 1: Editor */}
                {workspaceTab === 'paste' && (
                  <div className="flex-1 h-full">
                    <Editor
                      height="100%"
                      language={language}
                      theme="vs-dark"
                      value={code}
                      onChange={(value) => setCode(value || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'var(--font-mono), monospace',
                        lineHeight: 22,
                        padding: { top: 16, bottom: 16 },
                        scrollbar: {
                          vertical: 'visible',
                          horizontal: 'visible',
                        },
                        roundedSelection: true,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                )}

                {/* Tab 2: File Upload Zone */}
                {workspaceTab === 'upload' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-on-dark-soft">
                    <div className="border-2 border-dashed border-hairline/20 hover:border-primary/50 transition-colors rounded-lg p-12 max-w-md w-full flex flex-col items-center justify-center bg-surface-dark-soft/50">
                      <span className="text-4xl mb-4 block">📁</span>
                      <h4 className="text-base font-serif text-on-dark font-medium mb-1">Drag and drop your file</h4>
                      <p className="text-xs text-on-dark-soft/80 mb-6 font-sans">
                        Only UTF-8 encoded text files are supported (.py, .js, .ts, .go, .java, .cpp)
                      </p>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".py,.js,.jsx,.ts,.tsx,.go,.java,.cpp,.cc,.h"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-surface-dark-elevated hover:bg-surface-dark text-on-dark border border-hairline/15 font-medium text-xs rounded-sm px-5 py-2.5 transition-colors uppercase tracking-wider"
                      >
                        Choose file
                      </button>
                      {uploadFilename && (
                        <span className="text-xs text-primary font-medium mt-4 block">
                          Loaded: {uploadFilename}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: GitHub Panel */}
                {workspaceTab === 'github' && (
                  <div className="flex-1 flex flex-col p-6 space-y-6">
                    <GithubLoginButton
                      token={token}
                      isAuthenticated={isAuthenticated}
                      githubUsername={githubUsername}
                      setGithubUsername={setGithubUsername}
                      onConnected={(username) => {
                        setGithubUsername(username);
                        setHistoryRefreshTrigger(prev => prev + 1);
                      }}
                      onDisconnected={() => {
                        setGithubUsername(null);
                        setSelectedRepoUrl(null);
                      }}
                    />
                    
                    {githubUsername ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                          <RepositorySelector
                            token={token}
                            prMode={githubMode}
                            onTogglePrMode={setGithubMode}
                            selectedRepoUrl={selectedRepoUrl}
                            setSelectedRepoUrl={setSelectedRepoUrl}
                            selectedBranch={githubBranch}
                            setSelectedBranch={setGithubBranch}
                            onSelectRepo={async (url, br) => {
                              setLoading(true);
                              setError(null);
                              try {
                                const headers: Record<string, string> = {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                };
                                const res = await fetch(`${API_BASE_URL}/api/v1/github/review`, {
                                  method: 'POST',
                                  headers,
                                  body: JSON.stringify({ repository_url: url, branch: br })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.detail || 'Scan failed');
                                setReviewResult(data);
                                setHistoryRefreshTrigger(prev => prev + 1);
                              } catch (err: any) {
                                setError(err.message || 'Failed to scan repository');
                              } finally {
                                setLoading(false);
                              }
                            }}
                          />
                          {githubMode === 'pr' && selectedRepoUrl && (
                            <PullRequestSelector
                              token={token}
                              selectedRepoUrl={selectedRepoUrl}
                              onSelectPr={async (prNum) => {
                                setLoading(true);
                                setError(null);
                                try {
                                  const headers: Record<string, string> = {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  };
                                  const res = await fetch(`${API_BASE_URL}/api/v1/github/pull-request/review`, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ repository_url: selectedRepoUrl, pr_number: prNum })
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.detail || 'Scan failed');
                                  setReviewResult(data);
                                  setHistoryRefreshTrigger(prev => prev + 1);
                                } catch (err: any) {
                                  setError(err.message || 'Failed to scan Pull Request');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <RepositoryHistory
                            token={token}
                            refreshTrigger={historyRefreshTrigger}
                            onLoadItem={handleLoadHistoryItem}
                            onDeleteItem={async (id) => {
                              if (confirm('Are you sure you want to delete this scan log?')) {
                                try {
                                  const res = await fetch(`${API_BASE_URL}/api/v1/review/${id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  if (res.ok) {
                                    setHistoryRefreshTrigger(prev => prev + 1);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-on-dark-soft border border-dashed border-hairline/20 rounded-lg">
                        <span className="text-4xl mb-4 block">🐱</span>
                        <h4 className="text-base font-serif text-on-dark font-medium mb-1">GitHub Account Required</h4>
                        <p className="text-xs text-on-dark-soft/80 font-sans max-w-sm">
                          Please connect your GitHub account using the panel above to scan repositories and review pull requests.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Showcase Results */}
            <div className="lg:col-span-5 flex flex-col space-y-6 justify-start">
              
              {/* Idle Welcome Screen */}
              {!loading && !reviewResult && !error && (
                <div className="flex flex-col items-center justify-center text-center p-10 bg-surface-card border border-hairline rounded-lg h-full min-h-[400px]">
                  <span className="text-5xl block mb-6">🔍</span>
                  <h3 className="text-xl font-serif font-medium text-ink">Ready for Review</h3>
                  <p className="text-sm text-body mt-2 max-w-xs leading-relaxed">
                    Input your code in the workspace editor, upload a file, or target a GitHub repository, then hit analyze to execute validation.
                  </p>
                </div>
              )}

              {/* Spinner Loading Screen */}
              {loading && (
                <div className="flex flex-col items-center justify-center p-10 bg-surface-card border border-hairline rounded-lg h-full min-h-[400px]">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full" />
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-lg font-serif font-medium text-ink">Analyzing Pipeline...</h3>
                  <p className="text-xs text-muted mt-2 text-center max-w-xs leading-relaxed font-sans">
                    Invoking AST parsers, executing structural syntax analysis, and computing security audit thresholds...
                  </p>
                </div>
              )}

              {/* Failure/Error Box */}
              {error && (
                <div className="p-6 bg-error/5 border border-error/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <h3 className="text-lg font-serif font-semibold text-error">Analysis Error</h3>
                  </div>
                  <p className="text-sm text-body-strong mt-3 leading-relaxed">
                    {error}
                  </p>
                  {workspaceTab !== 'github' && (
                    <button
                      onClick={handleReview}
                      className="mt-4 text-xs font-semibold px-4 py-2 rounded-sm bg-error/10 text-error border border-error/20 hover:bg-error/15 transition-all duration-200"
                    >
                      Retry Request
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Styled Brand Footer */}
      <footer className="bg-surface-dark border-t border-hairline/10 py-12 px-6 sm:px-12 text-on-dark-soft">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
            </svg>
            <span className="font-serif font-semibold text-on-dark">ReviveCode</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-sans">
            <a href="#" className="hover:text-on-dark transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-on-dark transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-on-dark transition-colors">Documentation</a>
          </div>
        </div>
      </footer>

      {/* Left History Slide-over Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div className="absolute inset-0 bg-surface-dark/40 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)} />
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-md bg-canvas border-r border-hairline shadow-2xl flex flex-col h-full transform transition-all duration-300">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-hairline flex items-center justify-between">
                <h3 className="text-xl font-serif text-ink font-normal tracking-tight">
                  Review History
                </h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-muted hover:text-ink w-8 h-8 rounded-full border border-hairline flex items-center justify-center text-lg bg-canvas hover:bg-surface-card transition-colors focus:outline-none"
                >
                  &times;
                </button>
              </div>

              {/* History list content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="text-xs">Loading history record...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-12 text-muted max-w-xs mx-auto">
                    <span className="text-3xl block mb-3">📁</span>
                    <p className="text-sm font-medium text-ink">No saved reports</p>
                    <p className="text-xs mt-1">
                      Review code blocks while signed in to automatically persist analysis history here.
                    </p>
                  </div>
                ) : (
                  historyList.map((item) => {
                    const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    
                    const scoreColor = item.score >= 85 
                      ? 'text-success bg-success/5 border-success/20' 
                      : item.score >= 70 
                        ? 'text-amber-500 bg-amber-500/5 border-amber-500/20' 
                        : 'text-error bg-error/5 border-error/20';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleLoadHistoryItem(item.id)}
                        className="p-4 bg-surface-card border border-hairline hover:border-primary/40 rounded-lg cursor-pointer transition-all hover:translate-x-0.5 flex items-center justify-between gap-4 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-medium text-muted uppercase bg-canvas border border-hairline px-2 py-0.5 rounded-sm">
                              {item.language}
                            </span>
                            <span className="text-xs text-muted-soft">
                              {dateStr}
                            </span>
                          </div>
                          <span className="text-xs text-body truncate block">
                            Report: {item.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold border px-2.5 py-1 rounded-sm ${scoreColor}`}>
                            {item.score}
                          </span>
                          <button
                            onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                            className="text-muted hover:text-error opacity-0 group-hover:opacity-100 p-1.5 rounded-sm border border-transparent hover:border-error/25 hover:bg-error/5 transition-all focus:outline-none"
                            title="Delete record"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Signin/Signup Dialog Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

    </div>
  );
}
