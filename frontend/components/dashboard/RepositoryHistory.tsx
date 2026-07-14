import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface HistoryItem {
    id: string;
    code: string; // contains the repo label
    language: string;
    score: number;
    created_at: string;
}

interface RepositoryHistoryProps {
    token: string | null;
    onLoadItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    refreshTrigger: number;
}

export default function RepositoryHistory({
    token,
    onLoadItem,
    onDeleteItem,
    refreshTrigger
}: RepositoryHistoryProps) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/github/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to load GitHub scans history');
                const data = await res.json();
                setHistory(data.history || []);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message || 'Failed to fetch scan history');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchHistory();
        }
    }, [token, refreshTrigger]);

    const getCleanRepoLabel = (rawLabel: string) => {
        const lines = rawLabel.split('\n');
        // Extracts the clean name, like "GitHub Repository: owner/name"
        const titleLine = lines[0] || rawLabel;
        const branchLine = lines[1] || '';
        return {
            title: titleLine.replace('GitHub Repository: ', '').replace('GitHub Pull Request: ', ''),
            isPr: titleLine.includes('Pull Request'),
            sub: branchLine
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-muted font-sans text-xs">
                <div className="w-5 h-5 border border-primary border-t-transparent rounded-full animate-spin mb-3" />
                Loading scan logs...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-error/5 border border-error/20 rounded-md text-error text-xs font-sans">
                {error}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-surface-card border border-hairline rounded-lg p-6 text-center font-sans text-xs text-muted">
                <span className="text-3xl block mb-2">📂</span>
                <p className="font-semibold text-ink">No historical reports</p>
                <p className="mt-1">Completed scans will be logged here automatically.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface-card border border-hairline rounded-lg p-6 font-sans space-y-4">
            <h3 className="text-sm font-semibold text-ink border-b border-hairline pb-2.5 flex items-center gap-2">
                <span>🕒</span> Scan History ({history.length})
            </h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-hairline">
                {history.map(item => {
                    const labelInfo = getCleanRepoLabel(item.code);
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
                            onClick={() => onLoadItem(item.id)}
                            className="pt-3 first:pt-0 pb-1 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        labelInfo.isPr 
                                            ? 'bg-purple-500/10 text-purple-700 border border-purple-500/15' 
                                            : 'bg-primary/10 text-primary border border-primary/15'
                                    }`}>
                                        {labelInfo.isPr ? 'PR' : 'Repo'}
                                    </span>
                                    <span className="text-[10px] text-muted-soft">
                                        {dateStr}
                                    </span>
                                </div>
                                <h4 className="text-xs font-semibold text-ink truncate hover:text-primary transition-colors" title={labelInfo.title}>
                                    {labelInfo.title}
                                </h4>
                                <span className="text-[10px] text-muted-soft font-mono block mt-0.5">
                                    {labelInfo.sub}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold border px-2 py-1 rounded-sm ${scoreColor}`}>
                                    {item.score}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteItem(item.id);
                                    }}
                                    className="text-muted hover:text-error opacity-0 group-hover:opacity-100 p-1.5 rounded border border-transparent hover:border-error/25 hover:bg-error/5 transition-all focus:outline-none"
                                    title="Delete scan"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
