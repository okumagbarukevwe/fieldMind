'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import dynamic from 'next/dynamic';

const supabase = createClient();

const MapComponent = dynamic(() => import('../map/MapComponent'), { ssr: false });

export default function MapPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false });
    setIncidents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const subscription = supabase
      .channel('map-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'incidents',
      }, () => fetchIncidents())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.severity === filter);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Incident Map</h1>
            <p className="text-gray-500 text-sm mt-1">{incidents.length} incidents with location data</p>
          </div>
          <div className="flex gap-2">
            {['all', 'critical', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition capitalize ${
                  filter === f ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl h-96 flex items-center justify-center">
            <p className="text-gray-500">Loading map...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl h-96 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No incidents with location data yet</p>
              <p className="text-gray-600 text-sm">Submit an incident from the field worker page to see it here</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden" style={{ height: '600px' }}>
            <MapComponent incidents={filtered} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mt-6">
          {['critical', 'high', 'medium', 'low'].map(s => ({
            label: s,
            count: incidents.filter(i => i.severity === s).length,
            color: s === 'critical' ? 'text-red-400' : s === 'high' ? 'text-orange-400' : s === 'medium' ? 'text-yellow-400' : 'text-green-400'
          })).map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}