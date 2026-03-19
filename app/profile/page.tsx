'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('Zone 1');
  const [saved, setSaved] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [safetyScore, setSafetyScore] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    zone_alerts: true,
    incident_updates: true,
    hq_messages: true,
    safety_score: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const router = useRouter();

  const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setZone(profileData.zone || 'Zone 1');
        if (profileData.notification_preferences) {
          setNotifications(profileData.notification_preferences);
        }
      }

      const { data: incidentData } = await supabase
        .from('incidents')
        .select('*')
        .eq('worker_email', session.user.email)
        .order('created_at', { ascending: false });

      setIncidents(incidentData || []);

      const { data: scoreData } = await supabase
        .from('safety_scores')
        .select('*')
        .eq('worker_email', session.user.email)
        .single();

      setSafetyScore(scoreData);
      setLoading(false);
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, zone })
      .eq('id', profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const saveNotifications = async () => {
    setSavingNotifications(true);
    await supabase
      .from('profiles')
      .update({ notification_preferences: notifications })
      .eq('id', profile.id);
    setNotificationsSaved(true);
    setTimeout(() => setNotificationsSaved(false), 3000);
    setSavingNotifications(false);
  };

  const deleteAccount = async () => {
    if (confirmDelete !== profile.email) return;
    setDeleting(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const severityColor: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  const scoreColor = safetyScore
    ? safetyScore.score >= 90 ? 'text-green-400'
    : safetyScore.score >= 70 ? 'text-yellow-400'
    : safetyScore.score >= 50 ? 'text-orange-400'
    : 'text-red-400'
    : 'text-gray-500';

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'edit', label: 'Edit Profile' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'security', label: 'Security' },
    { key: 'activity', label: 'Activity' },
    { key: 'danger', label: 'Danger Zone' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Loading profile...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Profile header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 bg-green-950 border border-green-800 rounded-2xl flex items-center justify-center text-green-400 font-bold text-2xl shrink-0">
            {(fullName || profile?.email)?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-xl">{fullName || profile?.email}</p>
            <p className="text-gray-500 text-sm">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                profile?.role === 'hq_manager'
                  ? 'bg-green-950 border border-green-800 text-green-400'
                  : 'bg-blue-950 border border-blue-800 text-blue-400'
              }`}>
                {profile?.role === 'hq_manager' ? 'HQ Manager' : 'Field Worker'}
              </span>
              <span className="text-xs text-gray-500">{zone}</span>
              {safetyScore && (
                <span className={`text-xs font-bold ${scoreColor}`}>
                  Safety Score: {safetyScore.score}/100 ({safetyScore.grade})
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center shrink-0">
            <div>
              <p className="text-2xl font-bold text-white">{incidents.length}</p>
              <p className="text-xs text-gray-500">Incidents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{incidents.filter(i => i.status === 'resolved').length}</p>
              <p className="text-xs text-gray-500">Resolved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{incidents.filter(i => i.severity === 'critical').length}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="flex gap-6">

          {/* Sidebar tabs */}
          <div className="w-48 shrink-0">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-2 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${
                    activeTab === tab.key
                      ? tab.key === 'danger'
                        ? 'bg-red-950 text-red-400 font-semibold'
                        : 'bg-gray-800 text-white font-semibold'
                      : tab.key === 'danger'
                        ? 'text-red-500 hover:bg-red-950'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Incidents</h2>
                {incidents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No incidents reported yet</p>
                ) : (
                  <div className="space-y-3">
                    {incidents.slice(0, 8).map((incident) => (
                      <div key={incident.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-white">{incident.title}</p>
                          <p className="text-xs text-gray-500">{new Date(incident.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold uppercase ${severityColor[incident.severity] || 'text-gray-400'}`}>
                            {incident.severity}
                          </span>
                          <span className="text-xs text-gray-600">{incident.status || 'open'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Edit Profile */}
            {activeTab === 'edit' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Default zone</label>
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
                  <div>
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Email</label>
                    <input
                      type="text"
                      value={profile?.email}
                      disabled
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-500 outline-none text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold py-3 rounded-xl transition text-sm"
                  >
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
                <div className="space-y-3 mb-4">
                  {[
                    { key: 'zone_alerts', label: 'Zone alerts', desc: 'Incidents in your zone', locked: true },
                    { key: 'incident_updates', label: 'Incident updates', desc: 'Status changes on your incidents', locked: true },
                    { key: 'hq_messages', label: 'HQ messages', desc: 'Direct messages from HQ', locked: true },
                    { key: 'safety_score', label: 'Safety score updates', desc: 'When your score changes', locked: false },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                        {item.locked && <p className="text-xs text-orange-400 mt-0.5">Required for safety</p>}
                      </div>
                      {item.locked ? (
                        <div className="w-12 h-6 rounded-full bg-green-500 relative opacity-60 cursor-not-allowed">
                          <span className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          className={`w-12 h-6 rounded-full transition relative ${notifications[item.key as keyof typeof notifications] ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications[item.key as keyof typeof notifications] ? 'left-7' : 'left-1'}`} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {notificationsSaved && <p className="text-green-400 text-xs mb-3">✓ Preferences saved</p>}
                <button
                  onClick={saveNotifications}
                  disabled={savingNotifications}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition text-sm border border-gray-700"
                >
                  {savingNotifications ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-2">Change Password</h2>
                <p className="text-gray-500 text-sm mb-6">
                  We will send a password reset link to <span className="text-white">{profile?.email}</span>
                </p>

                {passwordError && (
                  <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-4">
                    <p className="text-red-400 text-sm">{passwordError}</p>
                  </div>
                )}

                {passwordSaved && (
                  <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-3 mb-4">
                    <p className="text-green-400 text-sm">✓ Password reset email sent! Check your inbox.</p>
                  </div>
                )}

                <button
                  onClick={async () => {
                    setSavingPassword(true);
                    setPasswordError('');
                    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) {
                      setPasswordError(error.message);
                    } else {
                      setPasswordSaved(true);
                      setTimeout(() => setPasswordSaved(false), 5000);
                    }
                    setSavingPassword(false);
                  }}
                  disabled={savingPassword}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm border border-gray-700"
                >
                  {savingPassword ? 'Sending...' : 'Send Password Reset Email'}
                </button>
              </div>
            )}

            {/* Activity */}
            {activeTab === 'activity' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Account Activity</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Account created', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '--', color: 'text-gray-400' },
                    { label: 'Total incidents reported', value: incidents.length, color: 'text-white' },
                    { label: 'Incidents resolved', value: incidents.filter(i => i.status === 'resolved').length, color: 'text-green-400' },
                    { label: 'Critical incidents', value: incidents.filter(i => i.severity === 'critical').length, color: 'text-red-400' },
                    { label: 'High severity incidents', value: incidents.filter(i => i.severity === 'high').length, color: 'text-orange-400' },
                    { label: 'Safety grade', value: safetyScore ? safetyScore.grade : '--', color: scoreColor },
                    { label: 'Safety score', value: safetyScore ? `${safetyScore.score}/100` : '--', color: scoreColor },
                    { label: 'Default zone', value: zone, color: 'text-gray-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <p className="text-sm text-gray-400">{item.label}</p>
                      <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <div className="bg-gray-900 border border-red-900 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Deleting your account is permanent and cannot be undone. All your incidents and data will remain in the system but your account access will be removed.
                </p>

                <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-4">
                  <p className="text-red-400 text-sm font-semibold mb-1">⚠️ This action cannot be undone</p>
                  <p className="text-red-300 text-xs">Type your email address to confirm deletion</p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={`Type ${profile?.email} to confirm`}
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    className="w-full bg-gray-800 border border-red-900 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-red-500 text-sm"
                  />
                  <button
                    onClick={deleteAccount}
                    disabled={deleting || confirmDelete !== profile?.email}
                    className="w-full bg-red-900 hover:bg-red-800 disabled:bg-gray-800 disabled:text-gray-600 border border-red-700 text-red-400 font-semibold py-3 rounded-xl transition text-sm"
                  >
                    {deleting ? 'Deleting...' : 'Delete My Account'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}