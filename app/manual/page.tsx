'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase';
import ReactMarkdown from 'react-markdown';

const supabase = createClient();

const categories = [
  { label: 'Pressure & Safety', icon: '⚡', questions: [
    'What is the safe operating pressure for the gas pump?',
    'When should I shut down the pump immediately?',
    'What are the emergency shutdown procedures?',
  ]},
  { label: 'Temperature', icon: '🌡️', questions: [
    'What temperature should the boiler not exceed?',
    'What is the safe operating temperature range?',
    'How do I handle overheating?',
  ]},
  { label: 'PPE & Safety', icon: '🦺', questions: [
    'What PPE is required for chemical storage?',
    'What PPE do I need near the electrical panel?',
    'What safety equipment is needed for crane operations?',
  ]},
  { label: 'Equipment', icon: '🔧', questions: [
    'What is the maximum load for the crane?',
    'How often should gas pump seals be checked?',
    'How do I reset a circuit breaker safely?',
  ]},
  { label: 'Emergency', icon: '🚨', questions: [
    'What do I do if there is a chemical spill?',
    'Where is the spill kit located?',
    'What is the emergency response for a gas leak?',
  ]},
];

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function Manual() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [manualCount, setManualCount] = useState(0);

  useEffect(() => {
    supabase.from('manuals').select('id').then(({ data }) => {
      setManualCount(data?.length || 0);
    });
  }, []);

  const askQuestion = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');

    const res = await fetch('/api/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });

    const data = await res.json();

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: data.answer,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, assistantMessage]);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Equipment Manual AI</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ask anything about {manualCount} equipment manuals — works offline
          </p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === i
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories[activeCategory].questions.map((q, i) => (
            <button
              key={i}
              onClick={() => askQuestion(q)}
              className="text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 px-3 py-2 rounded-xl transition text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {chatHistory.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4 space-y-4 max-h-96 overflow-y-auto">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                }`}>
                  {msg.role === 'assistant' && (
                    <p className="text-xs text-gray-500 mb-1 font-semibold">🤖 Manual AI</p>
                  )}
                  <div className="text-sm space-y-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-1 [&>h1]:font-bold [&>h2]:font-bold [&>h3]:font-semibold [&>strong]:font-semibold">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <p className="text-xs opacity-40 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          {chatHistory.length === 0 && !loading && (
            <div className="text-center py-8 mb-4">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-gray-500 text-sm">Ask any question about equipment safety and operations</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about any equipment..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askQuestion(question)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-green-500 text-sm"
            />
            <button
              onClick={() => askQuestion(question)}
              disabled={loading || !question.trim()}
              className="bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-semibold px-4 py-3 rounded-xl transition text-sm"
            >
              Ask
            </button>
          </div>

          {chatHistory.length > 0 && (
            <button
              onClick={() => setChatHistory([])}
              className="w-full mt-3 text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </main>
  );
}