'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';

const supabase = createClient();

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  hq_notes: string;
  resolved_by: string;
  resolved_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_role: string;
  sender_email: string;
  created_at: string;
};

const severityConfig: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-950', border: 'border-green-800' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800' },
  high: { color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-800' },
  critical: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800' },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: 'text-blue-400', bg: 'bg-blue-950', label: 'Open' },
  investigating: { color: 'text-yellow-400', bg: 'bg-yellow-950', label: 'Being Investigated' },
  resolved: { color: 'text-green-400', bg: 'bg-green-950', label: 'Resolved' },
};

export default function MyIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [workerEmail, setWorkerEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setWorkerEmail(session.user.email || '');
    });
  }, []);

  const fetchIncidents = async () => {
    const res = await fetch('/api/my-incidents');
    const data = await res.json();
    setIncidents(data.incidents || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const subscription = supabase
        .channel('my-incidents-realtime')
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

  const fetchMessages = async (incident_id: string) => {
    const res = await fetch(`/api/messages?incident_id=${incident_id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  };

  useEffect(() => {
    if (!selectedIncident) return;
    fetchMessages(selectedIncident.id);
    const subscription = supabase
        .channel('my-messages-realtime')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
        }, () => {
            fetchMessages(selectedIncident.id);
        })
        .subscribe();

        return () => {
        supabase.removeChannel(subscription);
        };
  }, [selectedIncident]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedIncident) return;
    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: selectedIncident.id,
        sender_email: workerEmail,
        sender_role: 'worker',
        content: newMessage,
      }),
    });
    setNewMessage('');
    await fetchMessages(selectedIncident.id);
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Incidents</h1>
          <p className="text-gray-500 text-sm mt-1">Track your reported incidents and messages from HQ</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your incidents...</p>
        ) : incidents.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500">You haven't reported any incidents yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const sevConfig = severityConfig[incident.severity] || severityConfig.low;
              const statConfig = statusConfig[incident.status] || statusConfig.open;
              return (
                <div
                  key={incident.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{incident.title}</h3>
                    <div className="flex gap-2 ml-3 shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sevConfig.color} ${sevConfig.bg} ${sevConfig.border} uppercase`}>
                        {incident.severity}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statConfig.color} ${statConfig.bg}`}>
                        {statConfig.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {incident.description?.split('--- AI TRIAGE ---')[0].trim()}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {new Date(incident.created_at).toLocaleString()}
                    </span>
                    {incident.status === 'resolved' && (
                      <span className="text-xs text-green-400">
                        ✓ Resolved by {incident.resolved_by}
                      </span>
                    )}
                  </div>
                  {incident.hq_notes && (
                    <div className="mt-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-semibold mb-1">HQ Notes</p>
                      <p className="text-xs text-gray-300">{incident.hq_notes}</p>
                    </div>
                  )}
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
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedIncident.title}</h2>
              <button onClick={() => setSelectedIncident(null)} className="text-gray-500 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            <div className="flex gap-2 mb-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${(severityConfig[selectedIncident.severity] || severityConfig.low).color} ${(severityConfig[selectedIncident.severity] || severityConfig.low).bg} ${(severityConfig[selectedIncident.severity] || severityConfig.low).border} uppercase`}>
                {selectedIncident.severity}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${(statusConfig[selectedIncident.status] || statusConfig.open).color} ${(statusConfig[selectedIncident.status] || statusConfig.open).bg}`}>
                {(statusConfig[selectedIncident.status] || statusConfig.open).label}
              </span>
            </div>

            {selectedIncident.hq_notes && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500 font-semibold mb-1">HQ Notes</p>
                <p className="text-sm text-gray-300">{selectedIncident.hq_notes}</p>
              </div>
            )}

            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Messages</p>

              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-600">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_role === 'worker' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`text-xs px-3 py-2 rounded-xl max-w-xs ${
                        msg.sender_role === 'worker'
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-green-900 text-green-200'
                      }`}>
                        <p className="font-semibold mb-0.5">{msg.sender_role === 'worker' ? 'You' : 'HQ Manager'}</p>
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-50 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Reply to HQ..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-green-500 text-xs"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl text-xs transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}