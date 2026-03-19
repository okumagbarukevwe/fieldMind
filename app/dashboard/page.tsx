'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';

const supabase = createClient();

async function checkRole() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', session.user.email)
      .single();
    return data?.role;
  }

type Incident = {
  id: string;
  title: string;
  description: string;
  worker_name: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_by: string;
  resolved_at: string;
  hq_notes: string;
  assigned_to: string | null;
};

const severityConfig: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-950', border: 'border-green-800' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800' },
  high: { color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
  critical: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
};

const statusConfig: Record<string, { color: string; bg: string }> = {
  open: { color: 'text-blue-400', bg: 'bg-blue-950' },
  investigating: { color: 'text-yellow-400', bg: 'bg-yellow-950' },
  resolved: { color: 'text-green-400', bg: 'bg-green-950' },
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [hqNotes, setHqNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('high');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [showAlertManager, setShowAlertManager] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email || '');
    });
  }, []);

  useEffect(() => {
    const checkEscalations = async () => {
      await fetch('/api/escalate', { method: 'POST' });
    };
    checkEscalations();
    const interval = setInterval(checkEscalations, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setActiveAlerts(data.alerts || []);
    };
    fetchAlerts();
    const subscription = supabase
        .channel('dashboard-alerts-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'alerts',
        }, () => {
            fetchAlerts();
        })
        .subscribe();

        return () => {
        supabase.removeChannel(subscription);
        };
  }, []);

  useEffect(() => {
    checkRole().then(role => {
      if (role === 'hq_manager') {
        setIsAuthorized(true);
      }
      setAuthChecking(false);
    });
  }, []);

  const fetchIncidents = async () => {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    setIncidents(data.incidents || []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const subscription = supabase
        .channel('incidents-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'incidents',
        }, () => {
            fetchIncidents();
        })
        .subscribe();

        return () => {
        supabase.removeChannel(subscription);
        };
  }, []);

  useEffect(() => {
    if (!selectedIncident) return;
    const subscription = supabase
      .channel('comments-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, () => {
        fetchComments(selectedIncident.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [selectedIncident]);

  const updateStatus = async (incident: Incident, newStatus: string) => {
    setUpdating(true);
    await supabase.from('incidents').update({
      status: newStatus,
      hq_notes: hqNotes || incident.hq_notes,
      resolved_by: newStatus === 'resolved' ? userEmail : incident.resolved_by,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : incident.resolved_at,
    }).eq('id', incident.id);
    await fetchIncidents();
    setSelectedIncident(null);
    setHqNotes('');
    setUpdating(false);
  };

  const assignToMe = async (incident: Incident) => {
  await supabase
    .from('incidents')
    .update({ assigned_to: userEmail })
    .eq('id', incident.id);
  await fetchIncidents();
  setSelectedIncident({ ...incident, assigned_to: userEmail });
};

const unassign = async (incident: Incident) => {
  await supabase
    .from('incidents')
    .update({ assigned_to: null })
    .eq('id', incident.id);
  await fetchIncidents();
  setSelectedIncident({ ...incident, assigned_to: null });
};

  const fetchMessages = async (incident_id: string) => {
    const res = await fetch(`/api/messages?incident_id=${incident_id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedIncident) return;
    setSendingMessage(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: selectedIncident.id,
        sender_email: userEmail,
        sender_role: 'hq_manager',
        content: newMessage,
      }),
    });
    setNewMessage('');
    await fetchMessages(selectedIncident.id);
    setSendingMessage(false);
  };

  const fetchComments = async (incident_id: string) => {
    const res = await fetch(`/api/comments?incident_id=${incident_id}`);
    const data = await res.json();
    setComments(data.comments || []);
  };
  
  const sendComment = async () => {
    if (!newComment.trim() || !selectedIncident) return;
    setSendingComment(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: selectedIncident.id,
        author_email: userEmail,
        content: newComment,
      }),
    });
    setNewComment('');
    await fetchComments(selectedIncident.id);
    setSendingComment(false);
  };

  const filtered = filter === 'all'
    ? incidents
    : ['open', 'investigating', 'resolved'].includes(filter)
    ? incidents.filter(i => i.status === filter)
    : incidents.filter(i => i.severity === filter);

  const counts = {
    all: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
  };

  if (authChecking) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Checking access...</p></div>;

  if (!isAuthorized) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🚫</div>
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-6">You don't have permission to view the HQ Dashboard.</p>
        <a href="/" className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-xl text-sm transition">
          Go to Field Worker App
        </a>
      </div>
    </main>
  );;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">HQ Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowAlertForm(true)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                    🚨 Broadcast Alert
                </button>
                {activeAlerts.length > 0 && (
                    <button
                    onClick={() => setShowAlertManager(true)}
                    className="bg-orange-900 hover:bg-orange-800 border border-orange-700 text-orange-300 text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                    {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
                    </button>
                )}
            </div>
         </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: counts.all, color: 'text-white' },
            { label: 'Open', value: counts.open, color: 'text-blue-400' },
            { label: 'Investigating', value: counts.investigating, color: 'text-yellow-400' },
            { label: 'Resolved', value: counts.resolved, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'open', label: `Open (${counts.open})` },
            { key: 'investigating', label: `Investigating (${counts.investigating})` },
            { key: 'resolved', label: `Resolved (${counts.resolved})` },
            { key: 'critical', label: `Critical (${counts.critical})` },
            { key: 'high', label: `High (${counts.high})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-4 py-2 rounded-full transition ${
                filter === f.key
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading incidents...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((incident) => {
              const sevConfig = severityConfig[incident.severity] || severityConfig.low;
              const statConfig = statusConfig[incident.status] || statusConfig.open;
              return (
                <div
                  key={incident.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition cursor-pointer"
                  onClick={() => { setSelectedIncident(incident); setHqNotes(incident.hq_notes || ''); fetchMessages(incident.id); fetchComments(incident.id); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white">{incident.title}</h3>
                    <div className="flex gap-2 ml-3 shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sevConfig.color} ${sevConfig.bg} ${sevConfig.border} uppercase`}>
                        {incident.severity}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statConfig.color} ${statConfig.bg} uppercase`}>
                        {incident.status || 'open'}
                      </span>
                    </div>
                  </div>
                  {incident.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {incident.description.split('--- AI TRIAGE ---')[0].trim()}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">
                        {incident.worker_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-500">{incident.worker_name}</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(incident.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedIncident && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedIncident.title}</h2>
              <button onClick={() => setSelectedIncident(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              {selectedIncident.description?.split('--- AI TRIAGE ---')[0].trim()}
            </p>

            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1 block">HQ notes</label>
              <textarea
                value={hqNotes}
                onChange={(e) => setHqNotes(e.target.value)}
                placeholder="Add notes about this incident..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => updateStatus(selectedIncident, 'open')}
                    disabled={updating || selectedIncident.status === 'resolved'}
                    className="bg-blue-900 hover:bg-blue-800 border border-blue-700 text-blue-300 text-xs font-semibold py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Mark Open
                </button>
                <button
                    onClick={() => updateStatus(selectedIncident, 'investigating')}
                    disabled={updating || selectedIncident.status === 'resolved'}
                    className="bg-yellow-900 hover:bg-yellow-800 border border-yellow-700 text-yellow-300 text-xs font-semibold py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Investigating
                </button>
                <button
                    onClick={() => updateStatus(selectedIncident, 'resolved')}
                    disabled={updating || selectedIncident.status === 'resolved'}
                    className="bg-green-900 hover:bg-green-800 border border-green-700 text-green-300 text-xs font-semibold py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {selectedIncident.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                </button>
            </div>

            {selectedIncident.resolved_by && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Resolved by {selectedIncident.resolved_by} at {new Date(selectedIncident.resolved_at).toLocaleString()}
              </p>
            )}

            <div className="mt-4 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
                HQ Team Comments ({comments.length})
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {comments.length === 0 ? (
                <p className="text-xs text-gray-600">No comments yet — be the first to comment</p>
                ) : (
                comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-green-400">{comment.author_email}</p>
                        <p className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-xs text-gray-300">{comment.content}</p>
                    </div>
                ))
                )}
            </div>

            <div className="flex gap-2">
                <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-green-500 text-xs"
                />
                <button
                onClick={sendComment}
                disabled={sendingComment || !newComment.trim()}
                className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl text-xs transition"
                >
                Post
                </button>
            </div>

            <div className="mt-4 border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Messages with Worker
                    </p>
                    {selectedIncident.assigned_to ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400">
                        {selectedIncident.assigned_to === userEmail ? '✓ Assigned to you' : `Assigned to ${selectedIncident.assigned_to}`}
                        </span>
                        {selectedIncident.assigned_to === userEmail && (
                        <button
                            onClick={() => unassign(selectedIncident)}
                            className="text-xs text-gray-500 hover:text-red-400 transition"
                        >
                            Unassign
                        </button>
                        )}
                    </div>
                    ) : (
                    <button
                        onClick={() => assignToMe(selectedIncident)}
                        className="text-xs bg-green-900 hover:bg-green-800 border border-green-700 text-green-400 px-3 py-1 rounded-xl transition"
                    >
                        Assign to me
                    </button>
                    )}
                </div>
  
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {messages.length === 0 ? (
                 <p className="text-xs text-gray-600">No messages yet</p>
              ) : (
                 messages.map((msg) => (
                   <div key={msg.id} className={`flex ${msg.sender_role === 'hq_manager' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`text-xs px-3 py-2 rounded-xl max-w-xs ${
                         msg.sender_role === 'hq_manager'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-gray-700 text-gray-300'
                    }`}>
                        <p className="font-semibold mb-0.5">{msg.sender_role === 'hq_manager' ? 'HQ' : msg.sender_email}</p>
                        <p>{msg.content}</p>
                    </div>
                   </div>
                  ))
                )}
             </div>

             {selectedIncident.assigned_to && selectedIncident.assigned_to !== userEmail ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-gray-500">This incident is assigned to {selectedIncident.assigned_to}</p>
                    <p className="text-xs text-gray-600 mt-1">Only assigned manager can message the worker</p>
                </div>
                ) : (
                <div className="flex gap-2">
                    <input
                    type="text"
                    placeholder={selectedIncident.assigned_to === userEmail ? "Reply to worker..." : "Assign to yourself to message worker..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && selectedIncident.assigned_to === userEmail && sendMessage()}
                    disabled={!selectedIncident.assigned_to || selectedIncident.assigned_to !== userEmail}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-green-500 text-xs disabled:opacity-50"
                    />
                    <button
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.trim() || !selectedIncident.assigned_to || selectedIncident.assigned_to !== userEmail}
                    className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl text-xs transition"
                    >
                    Send
                    </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showAlertForm && (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
            onClick={() => setShowAlertForm(false)}
        >
            <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold">Broadcast Alert to All Workers</h2>
                <button onClick={() => setShowAlertForm(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
                <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1 block">Alert title</label>
                <input
                    type="text"
                    placeholder="e.g. Evacuate Zone 3 Immediately"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-red-500 text-sm"
                />
                </div>

                <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1 block">Message</label>
                <textarea
                    placeholder="Detailed instructions for workers..."
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-red-500 resize-none text-sm"
                />
                </div>

                <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1 block">Severity</label>
                <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 text-sm"
                >
                    <option value="info">Info</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
                </div>

                <button
                onClick={async () => {
                    if (!alertTitle || !alertMessage) return;
                    setSendingAlert(true);
                    await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: alertTitle,
                        message: alertMessage,
                        severity: alertSeverity,
                        sent_by: userEmail,
                    }),
                    });
                    setAlertTitle('');
                    setAlertMessage('');
                    setAlertSeverity('high');
                    setSendingAlert(false);
                    setShowAlertForm(false);
                }}
                disabled={sendingAlert || !alertTitle || !alertMessage}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                {sendingAlert ? 'Broadcasting...' : '🚨 Send Alert to All Workers'}
                </button>
            </div>
            </div>
        </div>
        )}

        {showAlertManager && (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
            onClick={() => setShowAlertManager(false)}
        >
            <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold">Active Alerts</h2>
                <button onClick={() => setShowAlertManager(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
                {activeAlerts.map((alert) => (
                <div key={alert.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                    <div>
                        <p className="font-semibold text-sm text-white">{alert.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-600 mt-1">Sent by {alert.sent_by}</p>
                    </div>
                    <button
                        onClick={async () => {
                        await fetch('/api/alerts', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: alert.id }),
                        });
                        setActiveAlerts(activeAlerts.filter(a => a.id !== alert.id));
                        }}
                        className="text-xs bg-red-900 hover:bg-red-800 border border-red-700 text-red-400 px-3 py-1 rounded-xl ml-3 shrink-0"
                    >
                        Deactivate
                    </button>
                    </div>
                </div>
                ))}
                {activeAlerts.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No active alerts</p>
                )}
            </div>

            <button
                onClick={async () => {
                for (const alert of activeAlerts) {
                    await fetch('/api/alerts', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: alert.id }),
                    });
                }
                setActiveAlerts([]);
                setShowAlertManager(false);
                }}
                className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold py-3 rounded-xl transition"
            >
                Deactivate All Alerts
            </button>
            </div>
        </div>
        )}


    </main>
  );
}