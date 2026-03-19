'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../utils/supabase';
import ReactMarkdown from 'react-markdown';

const supabase = createClient();

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  offline?: boolean;
};

const sessionId = crypto.randomUUID();

const offlineResponses = [
  "I'm currently offline. I can still help with basic safety guidelines. For equipment-specific questions, please check the Manual Q&A section which works offline.",
  "No internet connection detected. Remember: always follow lockout/tagout procedures before maintenance. Stay safe!",
  "Offline mode active. Key safety reminder: if in doubt about any situation, stop work and contact your supervisor.",
  "Currently offline. Emergency contacts should be posted at your worksite. If this is an emergency, call emergency services immediately.",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerName, setWorkerName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setWorkerEmail(session.user.email || '');
    });

    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "Hi! I'm FieldMind AI 👋 I know your equipment manuals and incident history. Ask me anything about safety, equipment, or field operations — I work even when you're offline!",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    if (!isOnline) {
      const offlineResponse = offlineResponses[Math.floor(Math.random() * offlineResponses.length)];
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: offlineResponse,
          timestamp: new Date(),
          offline: true,
        }]);
        setLoading(false);
      }, 800);
      return;
    }

    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        history,
        worker_email: workerEmail,
        session_id: sessionId,
      }),
    });

    const data = await res.json();

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.response,
      timestamp: new Date(),
    }]);

    setLoading(false);
  };

  const quickPrompts = [
    'What safety checks should I do before starting my shift?',
    'How do I report an incident?',
    'What PPE do I need today?',
    'What are the emergency procedures?',
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">FieldMind AI Chat</h1>
            <p className="text-gray-500 text-xs mt-0.5">Your personal field operations assistant</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-orange-400'}`}></div>
            <span className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline mode'}</span>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-orange-950 border border-orange-800 rounded-xl px-4 py-2 mb-4">
            <p className="text-orange-400 text-xs">⚠️ Offline — AI responses are limited but still available</p>
          </div>
        )}

        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-y-auto mb-4 space-y-4" style={{ minHeight: '400px', maxHeight: '500px' }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white'
                  : msg.offline
                  ? 'bg-orange-950 border border-orange-800 text-orange-200'
                  : 'bg-gray-800 text-gray-200'
              }`}>
                {msg.role === 'assistant' && (
                  <p className="text-xs mb-1 font-semibold opacity-60">
                    {msg.offline ? '⚡ Offline AI' : '🤖 FieldMind AI'}
                  </p>
                )}
                <div className="text-sm space-y-1 [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>strong]:font-semibold">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <p className="text-xs opacity-40 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-gray-500 mr-2">FieldMind AI is thinking</span>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setInput(prompt); }}
                className="text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white px-3 py-2 rounded-xl transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={isOnline ? "Ask anything about field operations..." : "Ask a question (offline mode)..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold px-5 py-3 rounded-xl transition text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}