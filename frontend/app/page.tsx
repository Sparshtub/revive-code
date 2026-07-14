'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ScoreCard from '@/components/ScoreCard';
import ReviewCard, { Issue } from '@/components/ReviewCard';

interface ReviewResponse {
  status: string;
  message: string;
  score: number;
  issues: Issue[];
}

export default function Home() {
  const [code, setCode] = useState<string>(`def calculate_average(numbers):
    # TODO: add implementation
    total = 0
    for n in numbers:
        total += n
    
    # Unused variable code smell example
    unused_val = 100
    
    return total / len(numbers)`);
  const [language, setLanguage] = useState<string>('python');
  const [apiHealth, setApiHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check API health status on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((res) => {
        if (res.ok) setApiHealth('connected');
        else setApiHealth('disconnected');
      })
      .catch(() => setApiHealth('disconnected'));
  }, []);

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error('API Request failed. Make sure the backend service is running.');
      }

      const data = await response.json();
      setReviewResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while reviewing the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-canvas font-sans text-body selection:bg-primary/20">
      {/* Top Nav Component */}
      <header className="h-16 bg-canvas border-b border-hairline sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Anthropic style radial-spike-mark prefix */}
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

        {/* Action Controls & Health Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="font-semibold text-muted">API Status:</span>
            {apiHealth === 'checking' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-medium bg-surface-card text-muted border border-hairline animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                Checking
              </span>
            )}
            {apiHealth === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-medium bg-success/10 text-success border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online
              </span>
            )}
            {apiHealth === 'disconnected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-medium bg-error/10 text-error border border-error/20">
                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-canvas border-b border-hairline py-12 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="max-w-3xl">
          <h2 className="text-4xl sm:text-5xl font-serif font-normal text-ink leading-tight mb-4 tracking-tight">
            Meet your code thinking partner.
          </h2>
          <p className="text-lg text-body-strong font-sans leading-relaxed mb-6 max-w-2xl">
            Analyze codebases instantly for security vulnerabilities, cyclomatic complexity, and stylistic violations using modern static linters and deep AST verification.
          </p>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 bg-surface-soft border-b border-hairline py-12 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Product Editor mockup card */}
          <div className="lg:col-span-7 flex flex-col bg-surface-dark border border-hairline/10 rounded-lg overflow-hidden shadow-sm">
            {/* Mockup Header control bar */}
            <div className="bg-surface-dark-elevated border-b border-hairline/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-sans font-semibold text-on-dark-soft uppercase tracking-wider">Editor Chrome</span>
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
              </div>
              <button
                onClick={handleReview}
                disabled={loading}
                className="bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm px-5 py-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {loading ? 'Analyzing...' : 'Analyze Code'}
              </button>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 min-h-[500px] bg-surface-dark">
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
          </div>

          {/* Right Side: Results Showcase */}
          <div className="lg:col-span-5 flex flex-col space-y-6 justify-start">
            {/* Empty welcome state */}
            {!loading && !reviewResult && !error && (
              <div className="flex flex-col items-center justify-center text-center p-10 bg-surface-card border border-hairline rounded-lg h-full min-h-[400px]">
                <span className="text-5xl block mb-6">🔍</span>
                <h3 className="text-xl font-serif font-medium text-ink">Ready for Review</h3>
                <p className="text-sm text-body mt-2 max-w-xs leading-relaxed">
                  Input your code in the workspace editor and select your language, then click <strong className="text-ink font-semibold">Analyze Code</strong> to trigger review analysis.
                </p>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-center justify-center p-10 bg-surface-card border border-hairline rounded-lg h-full min-h-[400px]">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full" />
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-lg font-serif font-medium text-ink">Analyzing Pipeline...</h3>
                <p className="text-xs text-muted mt-2 text-center max-w-xs leading-relaxed font-sans">
                  Invoking static analyzers, evaluating code complexity metrics, and validating structural patterns...
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
                <button
                  onClick={handleReview}
                  className="mt-4 text-xs font-semibold px-4 py-2 rounded-sm bg-error/10 text-error border border-error/20 hover:bg-error/15 transition-all duration-200"
                >
                  Retry Request
                </button>
              </div>
            )}

            {/* Finalized Review Reports */}
            {reviewResult && (
              <div className="space-y-6">
                <ScoreCard
                  overallScore={reviewResult.score}
                  categories={{
                    readability: reviewResult.score,
                    security: Math.max(reviewResult.score - 10, 50),
                    performance: Math.min(reviewResult.score + 5, 100),
                    maintainability: reviewResult.score,
                    documentation: Math.max(reviewResult.score - 20, 40),
                  }}
                />

                <ReviewCard issues={reviewResult.issues} />
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
