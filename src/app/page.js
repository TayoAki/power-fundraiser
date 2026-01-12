'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        
        // Auto-login after signup for dev (in prod, may require email verification)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userId', data.user?.id || '');
        router.push('/dashboard/settings');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userId', data.user?.id || '');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
      
      // Fallback to demo mode for development
      if (err.message?.includes('Invalid login') || err.message?.includes('Email not confirmed')) {
        setError(err.message + ' (Use demo mode below)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userEmail', 'demo@nonprofit.org');
    sessionStorage.setItem('userId', 'demo-user');
    router.push('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo" style={{ background: 'none', width: 'auto', height: 'auto' }}>
          <img src="/logo.png" alt="Power Fundraiser" style={{ width: '180px', height: 'auto' }} />
        </div>

        <h2 className="login-title">{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="login-subtitle">
          {mode === 'signup' 
            ? 'Start your donor intelligence journey' 
            : 'Sign in to access your donor intelligence dashboard'}
        </p>

        {error && (
          <div className="login-error" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@nonprofit.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder={mode === 'signup' ? 'Create a password (6+ chars)' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (mode === 'signup' ? 'Creating Account...' : 'Signing in...') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#C9A227', 
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div style={{ 
          borderTop: '1px solid #e2e8f0', 
          paddingTop: '16px', 
          marginTop: '16px' 
        }}>
          <button 
            onClick={handleDemoLogin}
            type="button"
            style={{ 
              width: '100%',
              padding: '12px 16px',
              background: '#f1f5f9',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            disabled={loading}
          >
            🚀 Try Demo Mode (No Login Required)
          </button>
        </div>

        <p className="login-footer">
          Powered by AI • Built for Fundraisers
        </p>
      </div>
    </div>
  );
}
