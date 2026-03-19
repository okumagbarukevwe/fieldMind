'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type Worker = {
  id: string;
  worker_name: string;
  worker_email: string;
  zone: string;
  status: string;
  updated_at: string;
};

const zoneColors: Record<string, string> = {
  'Zone 1': 'bg-blue-950 border-blue-800 text-blue-400',
  'Zone 2': 'bg-purple-950 border-purple-800 text-purple-400',
  'Zone 3': 'bg-orange-950 border-orange-800 text-orange-400',
  'Zone 4': 'bg-teal-950 border-teal-800 text-teal-400',
  'Zone 5': 'bg-pink-950 border-pink-800 text-pink-400',
};

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('worker_locations')
      .select('*')
      .order('updated_at', { ascending: false });
    setWorkers(data || []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkers();
    const subscription = supabase
        .channel('workers-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'worker_locations',
        }, () => {
            fetchWorkers();
        })
        .subscribe();

        return () => {
        supabase.removeChannel(subscription);
        };
  }, []);

  const activeWorkers = workers.filter(w => w.status === 'active');
  const inactiveWorkers = workers.filter(w => w.status !== 'active');

  const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Worker Tracking</h1>
            <p className="text-gray-500 text-sm mt-1">
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total workers</p>
            <p className="text-3xl font-bold text-white">{workers.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">On shift</p>
            <p className="text-3xl font-bold text-green-400">{activeWorkers.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Off shift</p>
            <p className="text-3xl font-bold text-gray-500">{inactiveWorkers.length}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Zones</h2>
          <div className="grid grid-cols-5 gap-3">
            {zones.map(zone => {
              const zoneWorkers = activeWorkers.filter(w => w.zone === zone);
              return (
                <div key={zone} className={`border rounded-2xl p-4 text-center ${zoneColors[zone] || 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                  <p className="text-xs font-semibold mb-2">{zone}</p>
                  <p className="text-2xl font-bold">{zoneWorkers.length}</p>
                  <p className="text-xs opacity-60 mt-1">workers</p>
                </div>
              );
            })}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading workers...</p>
        ) : activeWorkers.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500">No workers currently on shift</p>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Active workers</h2>
            <div className="space-y-3">
              {activeWorkers.map((worker) => (
                <div key={worker.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-950 border border-green-800 rounded-xl flex items-center justify-center text-green-400 font-bold">
                      {worker.worker_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{worker.worker_name}</p>
                      <p className="text-xs text-gray-500">{worker.worker_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${zoneColors[worker.zone] || 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                      {worker.zone}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}