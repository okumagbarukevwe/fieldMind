'use client';
import { useState } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';


const supabase = createClient();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Account created! Please check your email and click the verification link before logging in.');
          setIsSignUp(false);
        }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/');
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-black font-bold text-lg">F</div>
          <div>
            <h1 className="text-xl font-bold text-white">FieldMind</h1>
            <p className="text-gray-500 text-xs">AI-powered field operations</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-5">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm"
              />
            </div>

            <button
              onClick={handleAuth}
              disabled={loading || !email || !password}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log in'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-green-400 hover:text-green-300 transition"
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}