'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';

const supabase = createClient();

type Profile = {
  id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
};

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }

      setCurrentUserEmail(session.user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (data?.role !== 'hq_manager') {
        router.push('/');
        return;
      }
      setCurrentUserRole(data.role);
      fetchProfiles();
    });
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    setUpdating(id);
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
    await fetchProfiles();
    setUpdating('');
  };

  const managers = profiles.filter(p => p.role === 'hq_manager');
  const workers = profiles.filter(p => p.role === 'worker');

  if (currentUserRole !== 'hq_manager' && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Custom header — no main nav */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">F</div>
          <span className="text-white font-bold text-sm">FieldMind</span>
          <span className="text-gray-600 text-sm">→</span>
          <span className="text-gray-400 text-sm">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{currentUserEmail}</span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage user roles and access permissions</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Users</p>
            <p className="text-3xl font-bold text-white">{profiles.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">HQ Managers</p>
            <p className="text-3xl font-bold text-green-400">{managers.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Workers</p>
            <p className="text-3xl font-bold text-blue-400">{workers.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading users...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                HQ Managers ({managers.length})
              </h2>
              <div className="space-y-2">
                {managers.map((profile) => (
                  <div key={profile.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-950 border border-green-800 rounded-xl flex items-center justify-center text-green-400 font-bold text-sm">
                        {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-gray-500">{profile.email}</p>
                        <p className="text-xs text-gray-600">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-green-950 border border-green-800 text-green-400 px-3 py-1 rounded-full font-semibold">
                        HQ Manager
                      </span>
                      {profile.email !== currentUserEmail && (
                        <button
                          onClick={() => updateRole(profile.id, 'worker')}
                          disabled={updating === profile.id}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl transition"
                        >
                          {updating === profile.id ? 'Updating...' : 'Demote to Worker'}
                        </button>
                      )}
                      {profile.email === currentUserEmail && (
                        <span className="text-xs text-gray-600">You</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Workers ({workers.length})
              </h2>
              <div className="space-y-2">
                {workers.map((profile) => (
                  <div key={profile.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center text-gray-400 font-bold text-sm">
                        {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-gray-500">{profile.email}</p>
                        <p className="text-xs text-gray-600">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-950 border border-blue-800 text-blue-400 px-3 py-1 rounded-full font-semibold">
                        Worker
                      </span>
                      <button
                        onClick={() => updateRole(profile.id, 'hq_manager')}
                        disabled={updating === profile.id}
                        className="text-xs bg-green-900 hover:bg-green-800 border border-green-700 text-green-400 px-3 py-1.5 rounded-xl transition"
                      >
                        {updating === profile.id ? 'Updating...' : 'Promote to HQ Manager'}
                      </button>
                    </div>
                  </div>
                ))}
                {workers.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                    <p className="text-gray-500">No workers yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}