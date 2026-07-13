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
  const [code, setCode] = useState<string>(`def calculate_average(numbers):\n    # TODO: add implementation\n    total = 0\n    for n in numbers:\n        total += n\n    \n    # Unused variable code smell example\n    unused_val = 100\n    \n    return total / len(numbers)`);
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
    <div className="flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              AI Code Reviewer
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Deep PyTorch & Static Code Analysis</p>
          </div>
        </div>

        {/* API Health Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">Backend Status:</span>
          {apiHealth === 'checking' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Checking
            </span>
          )}
          {apiHealth === 'connected' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
          {apiHealth === 'disconnected' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/50 text-rose-400 border border-rose-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Offline
            </span>
          )}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Side: Editor Section */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden backdrop-blur-md">
          {/* Editor Header controls */}
          <div className="bg-zinc-900/50 border-b border-zinc-900 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Source Code</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg text-xs px-3 py-1.5 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium"
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
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold px-4 py-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
            >
              {loading ? 'Analyzing...' : 'Analyze Code'}
            </button>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[500px] bg-zinc-950">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'var(--font-geist-mono), monospace',
                lineHeight: 22,
                padding: { top: 16 },
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

        {/* Right Side: Results Section */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Welcome/Empty State */}
          {!loading && !reviewResult && !error && (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-2xl h-full min-h-[400px]">
              <span className="text-5xl mb-4">🔍</span>
              <h2 className="text-lg font-bold text-zinc-200">Ready for Review</h2>
              <p className="text-sm text-zinc-400 mt-2 max-w-sm">
                Paste your code in the editor and click <strong className="text-zinc-300">Analyze Code</strong> to trigger the static & PyTorch analysis.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/20 border border-zinc-900 rounded-2xl h-full min-h-[400px]">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-violet-500/20 rounded-full" />
                <div className="absolute top-0 left-0 w-full h-full border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-base font-bold mt-6 text-zinc-200">Running Analysis Pipeline</h2>
              <p className="text-xs text-zinc-500 mt-2 text-center max-w-xs leading-5">
                Parsing AST, invoking Ruff/Bandit metrics, and processing neural CodeBERT embeddings...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 bg-rose-950/20 border border-rose-900/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-rose-400">Analysis Error</h3>
              </div>
              <p className="text-sm text-rose-300/80 mt-3 leading-relaxed">
                {error}
              </p>
              <button
                onClick={handleReview}
                className="mt-4 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-900/30 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 transition-all duration-300"
              >
                Retry Request
              </button>
            </div>
          )}

          {/* Report Display */}
          {reviewResult && (
            <div className="space-y-6">
              {/* Score Card */}
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

              {/* Issues Card */}
              <ReviewCard issues={reviewResult.issues} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
