'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type SafetyScore = {
  id: string;
  worker_email: string;
  worker_name: string;
  score: number;
  grade: string;
  total_incidents: number;
  critical_incidents: number;
  resolved_incidents: number;
  last_updated: string;
};

function ScoreRing({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" className="absolute -rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-2xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

export default function Safety() {
  const [myScore, setMyScore] = useState<SafetyScore | null>(null);
  const [allScores, setAllScores] = useState<SafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('');
  const [isHQ, setIsHQ] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('email', session.user.email)
        .single();

      setRole(profile?.role || 'worker');
      setIsHQ(profile?.role === 'hq_manager');
    });
  }, []);

  const fetchScores = async () => {
    const res = await fetch('/api/safety-score');
    const data = await res.json();
    setAllScores(data.scores || []);
    if (userEmail) {
      const mine = data.scores.find((s: SafetyScore) => s.worker_email === userEmail);
      setMyScore(mine || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userEmail) return;
    fetchScores();

    const subscription = supabase
      .channel('safety-scores-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'safety_scores',
      }, () => fetchScores())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [userEmail]);

  const calculateMyScore = async () => {
    setCalculating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const workerName = session?.user?.email?.split('@')[0] || 'Worker';

    const res = await fetch('/api/safety-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_email: userEmail,
        worker_name: workerName,
      }),
    });

    const data = await res.json();
    setAssessment(data.assessment);
    await fetchScores();
    setCalculating(false);
  };

  const gradeColor: Record<string, string> = {
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    F: 'text-red-400',
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Safety Score</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered safety assessment synced in real time</p>
        </div>

        {!isHQ && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Safety Score</h2>
              <button
                onClick={calculateMyScore}
                disabled={calculating}
                className="bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold px-4 py-2 rounded-xl text-sm transition"
              >
                {calculating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Calculating...
                  </span>
                ) : 'Calculate Score'}
              </button>
            </div>

            {myScore ? (
              <div className="flex items-center gap-6">
                <ScoreRing score={myScore.score} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-4xl font-bold ${gradeColor[myScore.grade]}`}>
                      {myScore.grade}
                    </span>
                    <div>
                      <p className="text-sm text-gray-400">Safety Grade</p>
                      <p className="text-xs text-gray-600">Updated {new Date(myScore.last_updated).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-white">{myScore.total_incidents}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-red-400">{myScore.critical_incidents}</p>
                      <p className="text-xs text-gray-500">Critical</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-green-400">{myScore.resolved_incidents}</p>
                      <p className="text-xs text-gray-500">Resolved</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No score calculated yet</p>
                <p className="text-gray-600 text-sm">Click Calculate Score to get your AI safety assessment</p>
              </div>
            )}

            {assessment && (
              <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-2">🤖 AI Assessment</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{assessment}</p>
              </div>
            )}
          </div>
        )}

        {isHQ && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">All Workers Safety Scores</h2>
            {loading ? (
              <p className="text-gray-500">Loading scores...</p>
            ) : allScores.length === 0 ? (
              <p className="text-gray-500">No scores calculated yet</p>
            ) : (
              <div className="space-y-3">
                {allScores.map((score, index) => (
                  <div key={score.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-500 w-6">#{index + 1}</span>
                    <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center font-bold text-sm">
                      {score.worker_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{score.worker_name}</p>
                      <p className="text-xs text-gray-500">{score.worker_email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="font-bold text-white">{score.score}</p>
                      </div>
                      <div className={`text-2xl font-bold ${gradeColor[score.grade]}`}>
                        {score.grade}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}