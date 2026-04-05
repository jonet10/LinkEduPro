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
  const [navOpen, setNavOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  const endRef = useRef(null);
  const student = useMemo(() => getStudent(), [open]);
  const token = useMemo(() => getToken(), [open]);

  useEffect(() => {
    if (!open) return;
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateState = () => {
      setNavOpen(Boolean(document.body?.dataset?.mobileNavOpen));
    };
    updateState();
    const observer = new MutationObserver(updateState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mobile-nav-open'] });
    return () => observer.disconnect();
  }, []);

  async function sendMessage() {
    const question = String(input || '').trim();
    if (!question || busy) return;

    const nextMessages = [...messages, { role: 'user', content: question }];
    const isFirstMessage = messages.length === 0;
    setMessages(nextMessages);
    setInput('');
    setBusy(true);

    try {
      const payload = {
        question,
        role: resolveRole(student),
        history: normalizeHistory(nextMessages),
        isFirstMessage
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

  const wrapperClass = `fixed z-[200] md:bottom-6 md:right-6 ${navOpen ? 'bottom-28 right-5' : 'bottom-20 right-5'}`;
  const fabSizeClass = navOpen && !open ? 'h-10 w-10' : 'h-14 w-14';
  const fabIconClass = navOpen && !open ? 'h-8 w-8' : 'h-12 w-12';

  return (
    <div className={wrapperClass}>
      {open ? (
        <div className="w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
                  <defs>
                    <linearGradient id="edupro-bubble" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#37E0D4" />
                      <stop offset="100%" stopColor="#22A6F0" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="30" fill="url(#edupro-bubble)" />
                  <path
                    d="M19 22c-4.4 4-6 9.5-4.5 14.7 1.6 5.6 6.6 9.3 12.6 9.3h12.3l6.6 6.7c.8.8 2.3.2 2.3-1v-5.7c4.4-3.3 6.9-7.8 6.9-12.8 0-8.3-7.4-15-16.5-15H27.1c-3.1 0-5.9 1.1-8.1 2.8Z"
                    fill="#FFFFFF"
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
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Posez une question..."
                className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400"
                disabled={busy}
              />
              <button
                type="button"
                className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
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
          className={`flex ${fabSizeClass} items-center justify-center rounded-full bg-transparent shadow-lg transition`}
          onClick={() => setOpen(true)}
          aria-label="Ouvrir EduPro"
        >
          <svg viewBox="0 0 64 64" className={fabIconClass} aria-hidden="true">
            <defs>
              <linearGradient id="edupro-bubble-fab" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#37E0D4" />
                <stop offset="100%" stopColor="#22A6F0" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="url(#edupro-bubble-fab)" />
            <path
              d="M19 22c-4.4 4-6 9.5-4.5 14.7 1.6 5.6 6.6 9.3 12.6 9.3h12.3l6.6 6.7c.8.8 2.3.2 2.3-1v-5.7c4.4-3.3 6.9-7.8 6.9-12.8 0-8.3-7.4-15-16.5-15H27.1c-3.1 0-5.9 1.1-8.1 2.8Z"
              fill="#FFFFFF"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
