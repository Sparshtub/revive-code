'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from './AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emailTrimmed = email.trim().toLowerCase();

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isSignUp ? '/auth/signup' : '/auth/login';
      const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailTrimmed, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed.');
      }

      if (isSignUp) {
        // Automatically log in after successful signup
        const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailTrimmed, password }),
        });
        
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
          throw new Error(loginData.detail || 'Login failed after signup.');
        }
        
        login(loginData.token, loginData.email);
      } else {
        login(data.token, data.email);
      }

      // Reset form and close
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Modal overlay */}
      <div 
        className="fixed inset-0 bg-surface-dark/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-canvas border border-hairline rounded-lg p-8 shadow-xl z-10 transition-all duration-300 transform scale-100 flex flex-col">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-ink w-8 h-8 rounded-full border border-hairline flex items-center justify-center text-lg bg-canvas hover:bg-surface-card transition-colors focus:outline-none"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-serif text-ink font-normal tracking-tight mb-2">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h3>
          <p className="text-sm text-muted">
            {isSignUp 
              ? 'Join ReviveCode to save analysis history' 
              : 'Sign in to access your saved code reviews'}
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md text-xs text-error font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-canvas border border-hairline text-ink font-sans text-sm rounded-md px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-canvas border border-hairline text-ink font-sans text-sm rounded-md px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted/60"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-canvas border border-hairline text-ink font-sans text-sm rounded-md px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted/60"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-active text-on-primary font-medium text-sm rounded-md py-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider mt-2"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div className="text-center mt-6 pt-4 border-t border-hairline-soft">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-medium text-primary hover:underline focus:outline-none"
          >
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
