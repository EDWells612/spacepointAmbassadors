import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md">
      <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md shadow-2xl">
        <div className="text-center mb-lg">
          <h1 className="text-headline-md text-on-surface mb-2">Welcome Back</h1>
          <p className="text-body-sm text-secondary">Sign in to your Ambassador Portal</p>
        </div>

        {error && (
          <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block text-label-md text-secondary mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="ambassador@spacepoint.ae"
            />
          </div>
          
          <div>
            <label className="block text-label-md text-secondary mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-60 text-on-surface text-label-lg font-semibold py-4 rounded-full transition-colors mt-lg disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-md text-center">
          <p className="text-body-sm text-secondary">
            Don't have an account?{' '}
            <Link to="/apply" className="text-primary-60 hover:text-secondary transition-colors">
              Apply as Ambassador
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
