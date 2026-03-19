'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

const OFFICE_LAT = 7.444565276015563;
const OFFICE_LNG = 3.898470064417696;
const MAX_DISTANCE_METERS = 200;

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CheckIn() {
  const [workerName, setWorkerName] = useState('');
  const [zone, setZone] = useState('Zone 1');
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');

  const [locationError, setLocationError] = useState('');
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email || '');
    });
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    const fetchMyLocation = async () => {
      const { data } = await supabase
        .from('worker_locations')
        .select('*')
        .eq('worker_email', userEmail)
        .single();
      if (data) {
        setMyLocation(data);
        setCheckedIn(data.status === 'active');
        setWorkerName(data.worker_name);
        setZone(data.zone);
      }
    };
    fetchMyLocation();
  }, [userEmail]);

  const handleCheckIn = async () => {
    if (!workerName) return;
    setLoading(true);
    setLocationError('');
    setLocationChecking(true);
  
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceMeters(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setDistance(Math.round(dist));
        setLocationChecking(false);
  
        if (dist > MAX_DISTANCE_METERS) {
          setLocationError(`You are ${Math.round(dist)}m away from the site. You must be within ${MAX_DISTANCE_METERS}m to check in.`);
          setLoading(false);
          return;
        }
  
        setLocationVerified(true);
  
        await supabase.from('worker_locations').upsert({
          worker_email: userEmail,
          worker_name: workerName,
          zone,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'worker_email' });
  
        setCheckedIn(true);
        setLoading(false);
      },
      (error) => {
        setLocationChecking(false);
        setLoading(false);
        setLocationError('Location access denied. You must allow location access to check in.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = async () => {
    setLoading(true);
    await supabase.from('worker_locations').update({
      status: 'inactive',
      updated_at: new Date().toISOString(),
    }).eq('worker_email', userEmail);
    setCheckedIn(false);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Shift Check-in</h1>
          <p className="text-gray-500 text-sm mt-1">Let HQ know you are on site</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          {checkedIn ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-950 border border-green-800 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                ✅
              </div>
              <div>
                <p className="text-green-400 font-bold text-lg">You are checked in</p>
                <p className="text-gray-500 text-sm mt-1">{workerName} — {zone}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                <p className="text-xs text-gray-500">Your location is syncing to HQ in real time via PowerSync</p>
              </div>
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 font-semibold py-3 rounded-xl transition text-sm"
              >
                {loading ? 'Checking out...' : 'End Shift — Check Out'}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Your name</label>
                <input
                  type="text"
                  placeholder="e.g. John Okeke"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Your zone</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500 text-sm"
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              {locationError && (
                <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">📍 {locationError}</p>
                </div>
               )}

              {locationChecking && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                    <p className="text-gray-400 text-sm">📍 Verifying your location...</p>
                </div>
              )}

              <button
                onClick={handleCheckIn}
                disabled={loading || !workerName}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold py-3 rounded-xl transition text-sm"
              >
                {locationChecking ? '📍 Checking location...' : loading ? 'Checking in...' : '✅ Start Shift — Check In'}
              </button>

               <p className="text-xs text-gray-600 text-center">
                  You must be within {MAX_DISTANCE_METERS}m of the site to check in
               </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}