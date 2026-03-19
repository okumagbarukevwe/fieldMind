'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from './utils/supabase';


const supabase = createClient();

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentIncidentId, setCurrentIncidentId] = useState('');
  const [workerMessage, setWorkerMessage] = useState('');
  const [sendingWorkerMessage, setSendingWorkerMessage] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const alertIdsRef = useRef<Set<string>>(new Set());

  const audioUnlockedRef = useRef(false);

  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.001);
    audioUnlockedRef.current = true;
  };

    useEffect(() => {
      const playAlertSound = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctx.resume().then(() => {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.value = 880;
            gain1.gain.value = 0.5;
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.2);
      
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            gain2.gain.value = 0.5;
            osc2.start(ctx.currentTime + 0.3);
            osc2.stop(ctx.currentTime + 0.6);
          });
        } catch (e) {
          console.log('Audio error:', e);
        }
      };

      const fetchAlerts = async () => {
        const res = await fetch('/api/alerts');
        const data = await res.json();
        const newAlerts = data.alerts || [];

        const newIds = newAlerts.filter((a: any) => !alertIdsRef.current.has(a.id));
        if (newIds.length > 0 && alertIdsRef.current.size > 0) {
          playAlertSound();
        }

        newAlerts.forEach((a: any) => alertIdsRef.current.add(a.id));
        setAlerts(newAlerts);
      };

      fetchAlerts();
      const subscription = supabase
        .channel('alerts-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
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
    if (!currentIncidentId) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?incident_id=${currentIncidentId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    };
    fetchMessages();
    const subscription = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentIncidentId]);

  const sendWorkerMessage = async () => {
    if (!workerMessage.trim() || !currentIncidentId) return;
    setSendingWorkerMessage(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: currentIncidentId,
        sender_email: workerName,
        sender_role: 'worker',
        content: workerMessage,
      }),
    });
    setWorkerMessage('');
    const res = await fetch(`/api/messages?incident_id=${currentIncidentId}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setSendingWorkerMessage(false);
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }
  
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
  
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
      if (finalTranscript) {
        setDescription(prev => prev + ' ' + finalTranscript);
      }
    };
  
    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsRecording(false);
    };
  
    recognition.onend = () => {
      setIsRecording(false);
    };
  
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript('');
  };
  
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    if (!title || !workerName) return;
    setLoading(true);
    setAiResponse('');
    setSubmitted(false);

    const { data: { session } } = await supabase.auth.getSession();

    const { data: locationData } = await supabase
      .from('worker_locations')
      .select('zone')
      .eq('worker_email', session?.user?.email)
      .single();

    const workerZone = locationData?.zone || 'Unknown Zone';

    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { timeout: 5000 }
      );
    });

    const incident = {
      id: crypto.randomUUID(),
      title,
      description,
      worker_name: workerName,
      worker_email: session?.user?.email || '',
      severity: 'low',
      created_at: new Date().toISOString(),
      latitude: position?.coords.latitude || null,
      longitude: position?.coords.longitude || null,
      zone: workerZone,
    };

    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });

    const aiRes = await fetch('/api/mastra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incident.id,
        title,
        description,
        worker_name: workerName,
      }),
    });

    const aiData = await aiRes.json();
    fetch('/api/zone-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incident.id,
        title,
        severity: aiData.severity || 'medium',
        zone: workerZone,
        reporter_email: session?.user?.email || '',
      }),
    });
    setAiResponse(aiData.response);
    setSubmitted(true);
    setCurrentIncidentId(incident.id);
    setLoading(false);
    setTitle('');
    setDescription('');
    setWorkerName('');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-orange-500 text-black text-sm font-semibold text-center py-2 px-4">
          ⚠️ You are offline — incidents will sync automatically when reconnected
        </div>
      )}

      {alerts.map((alert) => (
        <div key={alert.id} className={`text-sm font-semibold py-3 px-4 flex items-center justify-between ${
          alert.severity === 'critical' ? 'bg-red-600 text-white' :
          alert.severity === 'high' ? 'bg-orange-500 text-black' :
          'bg-yellow-400 text-black'
        }`}>
          <span>🚨 {alert.title}: {alert.message}</span>
          <button
            onClick={async () => {
              await fetch('/api/alerts', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: alert.id }),
              });
              setAlerts(alerts.filter(a => a.id !== alert.id));
            }}
            className="ml-4 text-xs underline opacity-75 hover:opacity-100 shrink-0"
          >
            Dismiss
          </button>
        </div>
      ))}

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-black font-bold text-lg">F</div>
            <div>
              <h1 className="text-2xl font-bold text-white">FieldMind</h1>
              <p className="text-gray-500 text-sm">AI-powered field operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-xs text-gray-500">{isOnline ? 'Connected — syncing to HQ' : 'Offline — working locally'}</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-5">Report an Incident</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Your name</label>
              <input
                type="text"
                placeholder="e.g. John Okeke"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Incident title</label>
              <input
                type="text"
                placeholder="e.g. Gas leak near pump station 4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1 block">Description</label>
              <div className="relative">
                  <textarea
                    placeholder="Describe what happened in detail... or use voice 🎤"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition ${
                      isRecording
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {isRecording ? '⏹' : '🎤'}
                  </button>
                </div>

                {isRecording && (
                  <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                    <p className="text-red-400 text-xs">
                      {transcript || 'Listening... speak now'}
                    </p>
                  </div>
                )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !title || !workerName}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analyzing with AI...
                </span>
              ) : 'Submit Incident'}
            </button>
          </div>
        </div>

        {/* AI Response */}
        {submitted && aiResponse && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <p className="text-green-400 font-semibold text-sm">Incident submitted & triaged by AI</p>
            </div>

            {aiResponse.match(/EMERGENCY_SERVICES:\s*yes/i) && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-400 font-bold text-sm">Emergency Services Required</p>
                  <p className="text-red-300 text-xs">Contact emergency services immediately</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {aiResponse.match(/SEVERITY:\s*(\w+)/i) && (
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Severity</p>
                  <p className="text-sm font-bold text-white uppercase">
                    {aiResponse.match(/SEVERITY:\s*(\w+)/i)?.[1]}
                  </p>
                </div>
              )}
              {aiResponse.match(/RESPONSE_TIME:\s*([^\n]+)/i) && (
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Response time</p>
                  <p className="text-sm font-bold text-white">
                    {aiResponse.match(/RESPONSE_TIME:\s*([^\n]+)/i)?.[1]}
                  </p>
                </div>
              )}
            </div>

            {aiResponse.match(/IMMEDIATE_ACTION:\s*([^\n]+)/i) && (
              <div className="bg-orange-950 border border-orange-800 rounded-xl p-4">
                <p className="text-xs text-orange-400 mb-1 font-semibold uppercase tracking-wide">⚡ Immediate action</p>
                <p className="text-sm text-orange-200">
                  {aiResponse.match(/IMMEDIATE_ACTION:\s*([^\n]+)/i)?.[1]}
                </p>
              </div>
            )}

            {aiResponse.match(/RESOURCES_NEEDED:\s*([^\n]+)/i) && (
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Resources needed</p>
                <div className="flex flex-wrap gap-2">
                  {aiResponse.match(/RESOURCES_NEEDED:\s*([^\n]+)/i)?.[1]
                    .split(/,\s*/)
                    .map((r: string, i: number) => (
                      <span key={i} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                        {r.trim()}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {aiResponse.match(/ACTION_PLAN:\n([\s\S]+)/i) && (
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Action plan</p>
                <div className="space-y-2">
                  {aiResponse.match(/ACTION_PLAN:\n([\s\S]+)/i)?.[1]
                    .split('\n')
                    .filter((line: string) => line.trim())
                    .map((step: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-green-500 font-bold text-sm mt-0.5">{i + 1}.</span>
                        <p className="text-sm text-gray-300">{step.replace(/^\d+\.\s*/, '').trim()}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-800">
              <Link href="/dashboard" className="text-xs text-green-400 hover:text-green-300 transition">
                View in HQ Dashboard →
              </Link>
            </div>
            <div className="border-t border-gray-800 pt-4 mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Messages from HQ</p>
  
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {messages.length === 0 ? (
                <p className="text-xs text-gray-600">No messages yet — HQ will respond here</p>
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
                 </div>
                </div>
               ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Send message to HQ..."
                value={workerMessage}
                onChange={(e) => setWorkerMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendWorkerMessage()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-green-500 text-xs"
              />
              <button
                onClick={sendWorkerMessage}
                disabled={sendingWorkerMessage || !workerMessage.trim()}
                className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                Send
              </button>
            </div>
           </div>
          </div>
        )}
      </div>
      <main className="min-h-screen bg-gray-950 text-white" onClick={unlockAudio}></main>
    </main>
  );
}