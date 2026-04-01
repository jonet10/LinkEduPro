"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const ROLE_MAP = {
  ADMIN: 'business',
  PUBLISHER: 'business',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

function resolveRole(student) {
  const key = String(student?.role || '').toUpperCase();
  return ROLE_MAP[key] || 'student';
}

function normalizeHistory(messages) {
  return messages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10)
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjou! Mwen se asistan LinkEduPro. Kijan mwen ka ede w jodi a?'
    }
  ]);

  const endRef = useRef(null);
  const student = useMemo(() => getStudent(), [open]);
  const token = useMemo(() => getToken(), [open]);

  useEffect(() => {
    if (!open) return;
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, open]);

  async function sendMessage() {
    const question = String(input || '').trim();
    if (!question || busy) return;

    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);

    try {
      const payload = {
        question,
        role: resolveRole(student),
        history: normalizeHistory(nextMessages)
      };
      const data = await apiClient('/ai/ask-docs', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      const reply = data.reply || data.answer || 'Mwen pa jwenn repons la. Eseye ankò.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error?.message || 'IA pa disponib kounye a.' }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      {open ? (
        <div className="w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 3a7 7 0 0 0-7 7v2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-1h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-1V10a7 7 0 0 0-7-7Zm-5 9v-2a5 5 0 1 1 10 0v2H7Zm1 7v-1h8v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold">EduPro</p>
                <p className="text-xs text-white/80">Assistant IA</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Posez une question..."
                className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                disabled={busy}
              />
              <button
                type="button"
                className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                onClick={sendMessage}
                disabled={busy}
              >
                {busy ? '...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir EduPro"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3a7 7 0 0 0-7 7v2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-1h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-1V10a7 7 0 0 0-7-7Zm-5 9v-2a5 5 0 1 1 10 0v2H7Zm1 7v-1h8v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
