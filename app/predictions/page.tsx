'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type Prediction = {
  id: string;
  zone: string;
  risk_level: string;
  prediction: string;
  recommended_actions: string;
  confidence: number;
  created_at: string;
};

const riskConfig: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-950', border: 'border-green-800' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800' },
  high: { color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
  critical: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
};

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPredictions = async () => {
    const res = await fetch('/api/predict');
    const data = await res.json();
    setPredictions(data.predictions || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPredictions();

    const subscription = supabase
      .channel('predictions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions',
      }, () => fetchPredictions())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const generatePredictions = async () => {
    setGenerating(true);
    await fetch('/api/predict', { method: 'POST' });
    await fetchPredictions();
    setGenerating(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Predictions</h1>
            <p className="text-gray-500 text-sm mt-1">Mastra AI predicts risks before they happen</p>
          </div>
          <button
            onClick={generatePredictions}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing...
              </span>
            ) : ' Generate Predictions'}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading predictions...</p>
        ) : predictions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3"></p>
            <p className="text-gray-500 mb-4">No predictions yet</p>
            <button
              onClick={generatePredictions}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
            >
              Generate First Prediction
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => {
              const config = riskConfig[prediction.risk_level] || riskConfig.medium;
              const actions = prediction.recommended_actions.split(';').filter(a => a.trim());

              return (
                <div key={prediction.id} className={`bg-gray-900 border rounded-2xl p-6 ${config.border}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{prediction.zone}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Generated {new Date(prediction.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Confidence</p>
                        <p className="text-lg font-bold text-white">{prediction.confidence}%</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${config.color} ${config.bg} ${config.border}`}>
                        {prediction.risk_level}
                      </span>
                    </div>
                  </div>

                  <div className={`${config.bg} border ${config.border} rounded-xl p-4 mb-4`}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60"> Prediction</p>
                    <p className={`text-sm ${config.color}`}>{prediction.prediction}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Recommended Actions</p>
                    <div className="space-y-2">
                      {actions.map((action, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-purple-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                          <p className="text-sm text-gray-300">{action.trim()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}