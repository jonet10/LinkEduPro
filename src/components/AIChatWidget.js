'use client';

import { useEffect, useRef, useState } from 'react';
import { AI_SERVICE_URL } from '@/lib/runtime-config';

const STORAGE_KEY = 'linkedu_chat_messages_v1';
const WELCOME_MESSAGE = "Salut ! Je suis EduPro AI. Comment puis-je vous accompagner aujourd'hui ?";

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    // Restore session messages if available
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch (_) {
      // Ignore storage errors
    }

    setMessages([{ role: 'ai', text: WELCOME_MESSAGE }]);
  }, []);

  useEffect(() => {
    // Persist messages in session
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (_) {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    // Auto-scroll to newest message
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  async function sendMessage() {
    const question = String(input || '').trim();
    if (!question || loading) return;

    setError('');
    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);

    try {
      const res = await fetch(`${AI_SERVICE_URL}/ai/ask-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail || 'Erreur IA.');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer || 'Réponse vide.' }]);
    } catch (e) {
      setError(e.message || 'Erreur IA.');
      setMessages((prev) => [...prev, { role: 'ai', text: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir le chat IA"
        className="fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-2xl text-white shadow-lg transition-transform hover:-translate-y-1"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        💬
      </button>

      <div
        className={`fixed bottom-24 right-6 z-[200] w-[320px] max-w-[90vw] origin-bottom-right rounded-2xl border border-brand-100 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Chat IA LinkEduPro</p>
            <p className="text-xs opacity-80">Assistant éducatif</p>
          </div>
          <button
            type="button"
            className="text-lg"
            aria-label="Fermer"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="h-72 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-center text-brand-600">Pose une question pour commencer.</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'ml-auto bg-sky-600 text-white'
                    : 'mr-auto bg-emerald-50 text-brand-900'
                }`}
              >
                {msg.text}
              </div>
            ))
          )}
          {loading ? (
            <div className="mr-auto max-w-[85%] rounded-2xl bg-emerald-50 px-3 py-2 text-brand-700">
              IA écrit...
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {error ? (
          <div className="px-4 pb-2 text-xs text-red-600">{error}</div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-brand-100 px-4 py-3">
          <input
            className="input flex-1"
            placeholder="Écris ta question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={loading}
          />
          <button
            type="button"
            className="btn-primary !px-3"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            Envoyer
          </button>
        </div>
      </div>
    </>
  );
}
