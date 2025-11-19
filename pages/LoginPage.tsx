
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { SparklesIcon, ArrowRightIcon } from '../components/icons';

// The Login page component.
const LoginPage: React.FC = () => {
  const { navigateTo, login } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    
    try {
        const response = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const userData = await response.json();
            login(userData);
        } else {
            const err = await response.json();
            setError(err.detail || 'Login failed');
        }
    } catch (err) {
        setError('Cannot connect to server. Is backend running?');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center bg-white py-2 px-4 rounded-full shadow-sm mb-4">
          <SparklesIcon className="w-5 h-5 text-indigo-500 mr-2" />
          <span className="font-semibold text-gray-700">SlideForge AI</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
            Welcome Back
          </span>
        </h1>
        <p className="text-gray-500 text-lg">Sign in to continue creating amazing presentations</p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : (
                <>
                    <ArrowRightIcon className="w-5 h-5 mr-2" />
                    Sign In
                </>
            )}
          </button>
        </form>
        <p className="text-center text-gray-500 mt-6">
          Don't have an account?{' '}
          <button onClick={() => navigateTo(Page.SignUp)} className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
