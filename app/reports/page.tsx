'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type Report = {
  id: string;
  title: string;
  content: string;
  incident_count: number;
  created_at: string;
  report_type: string;
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    await fetch('/api/pattern', { method: 'POST' });
    await fetchReports();
    setGenerating(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Risk Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Mastra agent analyses incident patterns automatically</p>
          </div>
          <button
            onClick={generateReport}
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
            ) : ' Generate Report'}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading reports...</p>
        ) : reports.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">No reports yet</p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
            >
              Generate First Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white">{report.title}</h3>
                  <span className="text-xs bg-purple-950 border border-purple-800 text-purple-400 px-3 py-1 rounded-full ml-3 shrink-0">
                    {report.incident_count} incidents
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {new Date(report.created_at).toLocaleString()}
                </p>
                <p className={`text-sm text-gray-300 whitespace-pre-wrap ${expanded === report.id ? '' : 'line-clamp-3'}`}>
                  {report.content}
                </p>
                <button
                  onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition mt-2"
                >
                  {expanded === report.id ? '▲ Show less' : '▼ Read full report'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}