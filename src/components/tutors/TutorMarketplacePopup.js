"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'linkedupro_tutor_popup_state_v1';

export default function TutorMarketplacePopup() {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved?.closed) return;
      setMinimized(Boolean(saved?.minimized));
    } catch (_) {
    }
    const t = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  const persist = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
    }
  };

  if (!visible) return null;

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed bottom-6 left-6 z-[120] rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
        onClick={() => {
          setMinimized(false);
          persist({ minimized: false, closed: false });
        }}
      >
        Trouver un tuteur
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-[120] w-[320px] max-w-[90vw] animate-[fadeInUp_.6s_ease] rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-900">Trouver un tuteur 🎓</p>
          <p className="mt-1 text-xs text-brand-700">
            Trouvez des enseignants qualifiés pour accompagner votre réussite
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-brand-600 hover:text-brand-900"
            onClick={() => {
              setMinimized(true);
              persist({ minimized: true, closed: false });
            }}
          >
            Minimiser
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-brand-600 hover:text-brand-900"
            onClick={() => {
              setVisible(false);
              persist({ minimized: false, closed: true });
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href="/tutors" className="btn-primary flex-1 text-center">
          Trouver un tuteur
        </Link>
        <Link href="/register" className="btn-secondary flex-1 text-center">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
