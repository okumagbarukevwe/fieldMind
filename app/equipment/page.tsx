'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

const healthConfig: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  good: { color: 'text-green-400', bg: 'bg-green-950', border: 'border-green-800', bar: 'bg-green-500' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800', bar: 'bg-yellow-500' },
  critical: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800', bar: 'bg-red-500' },
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState('');

  const fetchEquipment = async () => {
    const res = await fetch('/api/equipment');
    const data = await res.json();
    setEquipment(data.equipment || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
    const subscription = supabase
      .channel('equipment-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'equipment',
      }, () => fetchEquipment())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const updateHealth = async (equipment_id: string) => {
    setUpdating(equipment_id);
    await fetch('/api/equipment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id }),
    });
    await fetchEquipment();
    setUpdating('');
  };

  const filtered = filter === 'all' ? equipment : equipment.filter(e => e.health_status === filter);

  const counts = {
    all: equipment.length,
    good: equipment.filter(e => e.health_status === 'good').length,
    warning: equipment.filter(e => e.health_status === 'warning').length,
    critical: equipment.filter(e => e.health_status === 'critical').length,
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Equipment Health</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time equipment health tracking powered by AI</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: counts.all, color: 'text-white' },
            { label: 'Good', value: counts.good, color: 'text-green-400' },
            { label: 'Warning', value: counts.warning, color: 'text-yellow-400' },
            { label: 'Critical', value: counts.critical, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {['all', 'good', 'warning', 'critical'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-4 py-2 rounded-full transition capitalize ${
                filter === f ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f} ({counts[f as keyof typeof counts]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading equipment...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((eq) => {
              const config = healthConfig[eq.health_status] || healthConfig.good;
              return (
                <div key={eq.id} className={`bg-gray-900 border rounded-2xl p-5 ${config.border}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{eq.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{eq.location} — {eq.zone}</p>
                      <p className="text-xs text-gray-600 mt-0.5">QR Code: {eq.qr_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${config.color}`}>{eq.health_score}</p>
                        <p className="text-xs text-gray-500">/100</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${config.color} ${config.bg} ${config.border}`}>
                        {eq.health_status}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-1.5 mb-3">
                    <div
                      className={`h-1.5 rounded-full transition-all ${config.bar}`}
                      style={{ width: `${eq.health_score}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Last updated {new Date(eq.created_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => updateHealth(eq.id)}
                      disabled={updating === eq.id}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl transition"
                    >
                      {updating === eq.id ? 'Updating...' : 'Update Health'}
                    </button>
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