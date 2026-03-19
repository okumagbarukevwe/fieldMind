'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../utils/supabase';
import Link from 'next/link';

const supabase = createClient();

const healthConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  good: { color: 'text-green-400', bg: 'bg-green-950', border: 'border-green-800', label: 'Good' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800', label: 'Warning' },
  critical: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800', label: 'Critical' },
};

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [equipment, setEquipment] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [updatingHealth, setUpdatingHealth] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  const lookupEquipment = async (code: string) => {
    setLoading(true);
    setError('');
    setEquipment(null);
    setAiRecommendation('');

    const res = await fetch(`/api/equipment?qr_code=${code}`);
    const data = await res.json();

    if (data.error) {
      setError(`Equipment "${code}" not found`);
      setLoading(false);
      return;
    }

    setEquipment(data.equipment);
    setIncidents(data.incidents || []);
    setLoading(false);

    const healthRes = await fetch('/api/equipment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment_id: data.equipment.id }),
    });
    const healthData = await healthRes.json();
    setAiRecommendation(healthData.aiRecommendation);
    setEquipment((prev: any) => ({
      ...prev,
      health_score: healthData.healthScore,
      health_status: healthData.healthStatus,
    }));
  };

  const startScanner = async () => {
    const { Html5QrcodeScanner } = await import('html5-qrcode');
    setScanning(true);

    setTimeout(() => {
      if (!scannerDivRef.current) return;

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText: string) => {
          scanner.clear();
          setScanning(false);
          lookupEquipment(decodedText);
        },
        () => {}
      );

      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const health = equipment ? healthConfig[equipment.health_status] || healthConfig.good : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Equipment Scanner</h1>
          <p className="text-gray-500 text-sm mt-1">Scan QR code or enter equipment code to check health status</p>
        </div>

        {!equipment && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
            {!scanning ? (
              <div className="space-y-4">
                <button
                  onClick={startScanner}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition text-sm"
                >
                  📷 Scan QR Code
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-xs text-gray-500">or enter code manually</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. EQ-001"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && lookupEquipment(manualCode)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm"
                  />
                  <button
                    onClick={() => lookupEquipment(manualCode)}
                    disabled={!manualCode.trim() || loading}
                    className="bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold px-4 py-3 rounded-xl transition text-sm"
                  >
                    Search
                  </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Available equipment codes:</p>
                  <div className="flex flex-wrap gap-2">
                    {['EQ-001', 'EQ-002', 'EQ-003', 'EQ-004', 'EQ-005', 'EQ-006', 'EQ-007', 'EQ-008'].map(code => (
                      <button
                        key={code}
                        onClick={() => lookupEquipment(code)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-xl transition"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div id="qr-reader" ref={scannerDivRef} className="w-full rounded-xl overflow-hidden"></div>
                <button
                  onClick={stopScanner}
                  className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mt-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-4 mt-4">
                <p className="text-gray-500 text-sm">Looking up equipment...</p>
              </div>
            )}
          </div>
        )}

        {equipment && health && (
          <div className="space-y-4">
            <div className={`bg-gray-900 border rounded-2xl p-6 ${health.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{equipment.name}</h2>
                  <p className="text-gray-500 text-sm">{equipment.location} — {equipment.zone}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${health.color} ${health.bg} ${health.border}`}>
                    {health.label}
                  </span>
                  <p className={`text-2xl font-bold mt-1 ${health.color}`}>{equipment.health_score}/100</p>
                </div>
              </div>

              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${
                    equipment.health_score >= 80 ? 'bg-green-500' :
                    equipment.health_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${equipment.health_score}%` }}
                />
              </div>

              {aiRecommendation && (
                <div className={`${health.bg} border ${health.border} rounded-xl p-4 mb-4`}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60">🤖 AI Safety Assessment</p>
                  <p className={`text-sm ${health.color}`}>{aiRecommendation}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Link
                  href={`/?equipment_id=${equipment.id}&equipment_name=${encodeURIComponent(equipment.name)}`}
                  className="bg-green-500 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition text-sm text-center"
                >
                  Report Incident
                </Link>
                <button
                  onClick={() => { setEquipment(null); setManualCode(''); setAiRecommendation(''); }}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Scan Another
                </button>
              </div>
            </div>

            {incidents.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Recent Incidents ({incidents.length})
                </h3>
                <div className="space-y-2">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <p className="text-sm text-white">{incident.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase ${
                          incident.severity === 'critical' ? 'text-red-400' :
                          incident.severity === 'high' ? 'text-orange-400' :
                          incident.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="text-xs text-gray-600">{new Date(incident.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}