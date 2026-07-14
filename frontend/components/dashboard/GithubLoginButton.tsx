import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface GithubLoginButtonProps {
    token: string | null;
    isAuthenticated: boolean;
    onConnected: (username: string) => void;
    onDisconnected: () => void;
    githubUsername: string | null;
    setGithubUsername: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function GithubLoginButton({
    token,
    isAuthenticated,
    onConnected,
    onDisconnected,
    githubUsername,
    setGithubUsername
}: GithubLoginButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch current connected status when authenticated
        if (isAuthenticated && token) {
            checkConnection();
        } else {
            setGithubUsername(null);
        }
    }, [isAuthenticated, token]);

    const checkConnection = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/github/repositories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // If this succeeds, it means user is connected.
                // Let's get user profile info or default
                const profileRes = await fetch(`${API_BASE_URL}/api/v1/github/connect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code: 'mock_ping' })
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setGithubUsername(profileData.github_username);
                    onConnected(profileData.github_username);
                }
            } else {
                setGithubUsername(null);
            }
        } catch (err) {
            setGithubUsername(null);
        }
    };

    const handleConnect = async (mode: 'real' | 'mock') => {
        setLoading(true);
        setError(null);
        try {
            if (mode === 'mock') {
                const res = await fetch(`${API_BASE_URL}/api/v1/github/connect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ code: 'mock_code_developer' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Mock connection failed');
                
                setGithubUsername(data.github_username);
                onConnected(data.github_username);
            } else {
                // Real OAuth Flow redirect
                // Usually client-id would be retrieved from config or hardcoded
                // Redirecting to GitHub OAuth Authorize url
                const clientId = 'YOUR_GITHUB_CLIENT_ID'; // Placeholder or env
                const redirectUri = window.location.origin + '/github/callback';
                const scope = 'repo,read:user';
                window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect to GitHub');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/github/disconnect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setGithubUsername(null);
                onDisconnected();
            }
        } catch (err) {
            setError('Failed to disconnect GitHub account');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 bg-surface-card border border-hairline rounded-lg text-center font-sans">
                <p className="text-xs text-muted">Please sign in to your ReviveCode account to connect GitHub.</p>
            </div>
        );
    }

    return (
        <div className="p-5 bg-surface-dark border border-hairline/10 rounded-lg font-sans text-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <span className="text-3xl">🐱</span>
                <div>
                    <h4 className="text-sm font-semibold">GitHub Integration</h4>
                    <p className="text-xs text-on-dark-soft mt-0.5">
                        {githubUsername 
                            ? `Connected as @${githubUsername}` 
                            : 'Connect your GitHub account to perform repository-wide code reviews.'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {githubUsername ? (
                    <button
                        onClick={handleDisconnect}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-sm px-4 py-2 transition-colors uppercase tracking-wider disabled:opacity-50"
                    >
                        Disconnect Account
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleConnect('mock')}
                            disabled={loading}
                            className="bg-primary hover:bg-primary-active text-on-primary font-medium text-xs rounded-sm px-4 py-2 transition-colors uppercase tracking-wider disabled:opacity-50"
                        >
                            Connect (Mock Mode)
                        </button>
                        <button
                            onClick={() => handleConnect('real')}
                            disabled={loading}
                            className="bg-surface-dark-elevated hover:bg-surface-dark text-on-dark border border-hairline/15 font-medium text-xs rounded-sm px-4 py-2 transition-colors uppercase tracking-wider disabled:opacity-50"
                        >
                            Connect via OAuth
                        </button>
                    </>
                )}
            </div>
            
            {error && (
                <div className="w-full text-xs text-red-400 mt-2">
                    {error}
                </div>
            )}
        </div>
    );
}
