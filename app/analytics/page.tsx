'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend
} from 'recharts';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../map/MapComponent'), { ssr: false });

const supabase = createClient();

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  investigating: '#eab308',
  resolved: '#22c55e',
};

export default function Analytics() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [mapIncidents, setMapIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: true });
      setIncidents(data || []);
      const { data: mapData } = await supabase
        .from('incidents')
        .select('*')
        .not('latitude', 'is', null);
      setMapIncidents(mapData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const severityData = ['low', 'medium', 'high', 'critical'].map(s => ({
    name: `${s.charAt(0).toUpperCase() + s.slice(1)} (${incidents.filter(i => i.severity === s).length})`,
    value: incidents.filter(i => i.severity === s).length,
    color: SEVERITY_COLORS[s],
  })).filter(d => d.value > 0);

  const statusData = ['open', 'investigating', 'resolved'].map(s => ({
    name: `${s.charAt(0).toUpperCase() + s.slice(1)} (${incidents.filter(i => (i.status || 'open') === s).length})`,
    value: incidents.filter(i => (i.status || 'open') === s).length,
    color: STATUS_COLORS[s],
  })).filter(d => d.value > 0);

  const dailyData = incidents.reduce((acc: any[], incident) => {
    const date = new Date(incident.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.incidents++;
    } else {
      acc.push({ date, incidents: 1 });
    }
    return acc;
  }, []);

  const workerData = incidents.reduce((acc: any[], incident) => {
    const name = incident.worker_name || 'Unknown';
    const existing = acc.find(d => d.name === name);
    if (existing) {
      existing.incidents++;
    } else {
      acc.push({ name, incidents: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.incidents - a.incidents).slice(0, 5);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Loading analytics...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Incident trends and insights</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total incidents', value: incidents.length, color: 'text-white' },
            { label: 'Critical', value: incidents.filter(i => i.severity === 'critical').length, color: 'text-red-400' },
            { label: 'Resolved', value: incidents.filter(i => i.status === 'resolved').length, color: 'text-green-400' },
            { label: 'Open', value: incidents.filter(i => !i.status || i.status === 'open').length, color: 'text-blue-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Live Map at top */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Live Incident Map</h2>
            <span className="text-xs text-gray-500">{mapIncidents.length} incidents with location</span>
          </div>
          <div style={{ height: '400px' }}>
            {mapIncidents.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-sm">No incidents with location data yet</p>
              </div>
            ) : (
              <MapComponent incidents={mapIncidents} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">By severity</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {severityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
                <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">By status</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
                <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Incidents over time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
              <Line type="monotone" dataKey="incidents" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Top reporters</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={workerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="incidents" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}