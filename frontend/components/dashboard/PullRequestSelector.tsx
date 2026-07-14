import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface PR {
    number: number;
    title: string;
    user: {
        login: string;
        avatar_url: string;
    };
    state: string;
    created_at: string;
    base: { ref: string };
    head: { ref: string };
}

interface PullRequestSelectorProps {
    token: string | null;
    selectedRepoUrl: string;
    onSelectPr: (prNumber: number) => void;
}

export default function PullRequestSelector({
    token,
    selectedRepoUrl,
    onSelectPr
}: PullRequestSelectorProps) {
    const [pullRequests, setPullRequests] = useState<PR[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPrNumber, setSelectedPrNumber] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extract owner/repo name from URL
    const getRepoFullName = () => {
        try {
            const url = new URL(selectedRepoUrl);
            const path = url.pathname.replace(/^\/|\/$/g, '');
            const parts = path.split('/');
            if (parts.length >= 2) {
                return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
            }
            return '';
        } catch {
            return '';
        }
    };

    useEffect(() => {
        const repoFullName = getRepoFullName();
        if (token && repoFullName) {
            fetchPullRequests(repoFullName);
        }
    }, [token, selectedRepoUrl]);

    const fetchPullRequests = async (repoFullName: string) => {
        setLoading(true);
        setError(null);
        setSelectedPrNumber(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/github/repositories/${repoFullName}/pulls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load pull requests');
            const data = await res.json();
            setPullRequests(data.pulls || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch PRs');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface-card border border-hairline rounded-lg p-6 font-sans space-y-4">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider border-b border-hairline pb-2">
                Select Active Pull Request
            </label>
            
            {loading ? (
                <div className="flex items-center justify-center py-6 text-muted text-xs gap-2">
                    <div className="w-4.5 h-4.5 border border-primary border-t-transparent rounded-full animate-spin" />
                    Loading open pull requests...
                </div>
            ) : error ? (
                <div className="p-3.5 bg-error/5 border border-error/20 rounded-md text-error text-xs">
                    {error}
                </div>
            ) : pullRequests.length === 0 ? (
                <div className="text-center py-6 text-muted text-xs">
                    No active pull requests found for this repository.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto border border-hairline rounded-sm bg-canvas divide-y divide-hairline">
                        {pullRequests.map(pr => (
                            <div
                                key={pr.number}
                                onClick={() => setSelectedPrNumber(pr.number)}
                                className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                                    selectedPrNumber === pr.number 
                                        ? 'bg-primary/5 border-l-2 border-primary' 
                                        : 'hover:bg-surface-soft'
                                }`}
                            >
                                <div className="min-w-0">
                                    <div className="font-semibold text-ink truncate">
                                        #{pr.number}: {pr.title}
                                    </div>
                                    <div className="text-muted-soft mt-1 flex items-center gap-1.5">
                                        <span>by @{pr.user.login}</span>
                                        <span>&bull;</span>
                                        <span>{pr.head.ref} &rarr; {pr.base.ref}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-semibold text-success bg-success/5 border border-success/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Open
                                </span>
                            </div>
                        ))}
                    </div>

                    {selectedPrNumber !== null && (
                        <button
                            onClick={() => onSelectPr(selectedPrNumber)}
                            className="w-full bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm py-3 transition-colors uppercase tracking-wider"
                        >
                            Scan Pull Request #{selectedPrNumber}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
