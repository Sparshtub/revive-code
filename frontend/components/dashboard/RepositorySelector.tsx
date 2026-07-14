import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface Repository {
    name: string;
    full_name: string;
    description: string;
    default_branch: string;
    html_url: string;
    language: string;
}

interface RepositorySelectorProps {
    token: string | null;
    onSelectRepo: (repoUrl: string, branch: string) => void;
    onTogglePrMode: (mode: 'branch' | 'pr') => void;
    prMode: 'branch' | 'pr';
    selectedRepoUrl: string | null;
    setSelectedRepoUrl: (url: string | null) => void;
    selectedBranch: string;
    setSelectedBranch: (branch: string) => void;
}

export default function RepositorySelector({
    token,
    onSelectRepo,
    onTogglePrMode,
    prMode,
    selectedRepoUrl,
    setSelectedRepoUrl,
    selectedBranch,
    setSelectedBranch
}: RepositorySelectorProps) {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [branches, setBranches] = useState<string[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchRepositories();
        }
    }, [token]);

    const fetchRepositories = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/github/repositories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch repositories list');
            const data = await res.ok ? await res.json() : { repositories: [] };
            setRepositories(data.repositories || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load repositories');
        } finally {
            setLoading(false);
        }
    };

    const handleRepoChange = async (repoFullName: string) => {
        if (!repoFullName) {
            setSelectedRepoUrl(null);
            setBranches([]);
            return;
        }
        
        const matched = repositories.find(r => r.full_name === repoFullName);
        if (!matched) return;
        
        setSelectedRepoUrl(matched.html_url);
        setSelectedBranch(matched.default_branch);
        
        // Fetch branches for selected repo
        setBranchesLoading(true);
        setBranches([]);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/github/repositories/${repoFullName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBranches(data.branches || [matched.default_branch]);
                setSelectedBranch(data.default_branch || matched.default_branch);
            } else {
                setBranches([matched.default_branch]);
            }
        } catch {
            setBranches([matched.default_branch]);
        } finally {
            setBranchesLoading(false);
        }
    };

    const filteredRepos = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getSelectedRepoFullName = () => {
        if (!selectedRepoUrl) return '';
        const match = repositories.find(r => r.html_url === selectedRepoUrl);
        return match ? match.full_name : '';
    };

    return (
        <div className="bg-surface-card border border-hairline rounded-lg p-6 font-sans space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-3.5">
                <h3 className="text-lg font-serif font-medium text-ink flex items-center gap-2">
                    <span>📦</span> Select Repository
                </h3>
                <div className="flex bg-canvas p-0.5 rounded border border-hairline/80">
                    <button
                        type="button"
                        onClick={() => onTogglePrMode('branch')}
                        className={`text-xs px-3 py-1 rounded-sm transition-colors font-medium ${
                            prMode === 'branch' ? 'bg-primary text-on-primary font-semibold' : 'text-muted hover:text-ink'
                        }`}
                    >
                        Branch review
                    </button>
                    <button
                        type="button"
                        onClick={() => onTogglePrMode('pr')}
                        className={`text-xs px-3 py-1 rounded-sm transition-colors font-medium ${
                            prMode === 'pr' ? 'bg-primary text-on-primary font-semibold' : 'text-muted hover:text-ink'
                        }`}
                    >
                        Pull request
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs">Loading connected repositories...</span>
                </div>
            ) : error ? (
                <div className="p-4 bg-error/5 border border-error/20 rounded-md text-error text-xs">
                    {error}
                </div>
            ) : repositories.length === 0 ? (
                <div className="text-center py-6 text-muted text-xs">
                    No repositories found. Ensure your GitHub account is properly connected.
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Repo Search and Select */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                            Choose codebase
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-canvas border border-hairline text-xs rounded-sm px-3.5 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <select
                                value={getSelectedRepoFullName()}
                                onChange={(e) => handleRepoChange(e.target.value)}
                                className="w-full bg-canvas border border-hairline text-xs rounded-sm px-3.5 py-2.5 text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">-- Choose Repository --</option>
                                {filteredRepos.map(repo => (
                                    <option key={repo.full_name} value={repo.full_name}>
                                        {repo.full_name} ({repo.language || 'Multiple'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Branch select in branch mode */}
                    {selectedRepoUrl && prMode === 'branch' && (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                                Branch Name
                            </label>
                            {branchesLoading ? (
                                <div className="text-xs text-muted py-2 flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                                    Loading branches...
                                </div>
                            ) : (
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="w-full bg-canvas border border-hairline text-xs rounded-sm px-3.5 py-2.5 text-ink focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                >
                                    {branches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {selectedRepoUrl && prMode === 'branch' && (
                        <button
                            onClick={() => onSelectRepo(selectedRepoUrl, selectedBranch)}
                            className="w-full bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm py-3 transition-colors uppercase tracking-wider"
                        >
                            Scan Repository
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
