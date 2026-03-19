'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type Incident = {
  id: string;
  title: string;
  description: string;
  worker_name: string;
  severity: string;
  created_at: string;
};

const severityColor: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default function Demo() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchIncidents = async () => {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    setIncidents(data.incidents || []);
  };

  useEffect(() => {
    fetchIncidents();
    const subscription = supabase
        .channel('demo-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'incidents',
        }, () => {
            fetchIncidents();
        })
        .subscribe();

        return () => {
        supabase.removeChannel(subscription);
        };
  }, []);

  const handleSubmit = async () => {
    if (!title || !workerName) return;
    setLoading(true);

    const incident = {
      id: crypto.randomUUID(),
      title,
      description,
      worker_name: workerName,
      severity: 'low',
      created_at: new Date().toISOString(),
    };

    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incident.id,
        title,
        description,
      }),
    });

    setSubmitted(true);
    setLoading(false);
    setTitle('');
    setDescription('');
    setWorkerName('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">FieldMind Live Demo</h1>
          <p className="text-gray-400 mt-1">Watch incidents sync from field to HQ in real time</p>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* LEFT — Field Worker */}
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Field Worker</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {!isOnline && (
              <div className="bg-orange-500 text-black text-xs font-semibold px-3 py-2 rounded-xl">
                ⚠️ Offline — incident will sync when reconnected
              </div>
            )}

            <input
              type="text"
              placeholder="Your name"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />

            <input
              type="text"
              placeholder="Incident title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />

            <textarea
              placeholder="Describe what happened..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>

            {submitted && (
              <p className="text-green-400 text-sm text-center">✓ Incident submitted — syncing to HQ...</p>
            )}
          </div>

          {/* RIGHT — HQ Live Feed */}
          <div className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">HQ Live Feed</h2>
              <div className="flex items-center gap-2">
                {syncing ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                    <span className="text-xs text-yellow-400">Syncing...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs text-gray-400">Live</span>
                  </>
                )}
              </div>
            </div>

            {incidents.length === 0 ? (
              <p className="text-gray-500 text-sm">No incidents yet — submit one on the left</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {incidents.map((incident) => (
                  <div key={incident.id} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-sm">{incident.title}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-black ${severityColor[incident.severity] || 'bg-gray-500'}`}>
                        {incident.severity?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-2">{incident.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>👷 {incident.worker_name}</span>
                      <span>{new Date(incident.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

