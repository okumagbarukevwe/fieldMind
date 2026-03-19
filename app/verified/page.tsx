'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Verified() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-black font-bold text-lg">F</div>
          <div>
            <h1 className="text-xl font-bold text-white">FieldMind</h1>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-green-950 border border-green-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-green-400 mb-2">Email Verified!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Your email has been verified successfully. Redirecting you to the app in 3 seconds...
          </p>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div className="bg-green-500 h-1 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </main>
  );
}