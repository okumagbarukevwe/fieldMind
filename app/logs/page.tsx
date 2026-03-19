'use client';
import { useState, useEffect } from 'react';

type AILog = {
  id: string;
  prompt: string;
  response: string;
  model: string;
  created_at: string;
  incident_id: string;
};

export default function Logs() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setLoading(false);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400">AI Observability</h1>
          <p className="text-gray-400 mt-1">Every AI prompt and response logged and synced</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No AI logs yet — submit an incident first</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-900 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-purple-900 text-purple-300 px-3 py-1 rounded-full font-semibold">
                    {log.model}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">AI Response</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{log.response}</p>
                </div>

                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition"
                >
                  {expanded === log.id ? '▲ Hide prompt' : '▼ Show full prompt'}
                </button>

                {expanded === log.id && (
                  <div className="mt-3 bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Prompt sent to AI</p>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap">{log.prompt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}