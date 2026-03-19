'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, []);

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push('/'), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-black font-bold text-lg">F</div>
          <div>
            <h1 className="text-xl font-bold text-white">FieldMind</h1>
            <p className="text-gray-500 text-xs">Set new password</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2">Set new password</h2>

          {!ready && !success && (
            <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-yellow-400 text-sm">⚠️ Please click the link from your email to activate this page</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-green-400 text-sm">✓ Password changed! Redirecting...</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={!ready}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="Confirm new password"
                disabled={!ready}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading || !newPassword || !confirmPassword || !ready}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}