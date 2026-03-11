"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

const DISMISS_KEY = 'linkedupro:pwa:dismissedAt';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  return ua.includes('android');
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  // Android/Chrome: display-mode, iOS: navigator.standalone
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true;
}

function wasDismissedRecently() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const ts = raw ? Number(raw) : 0;
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch (_) {
    return false;
  }
}

function saveDismissedNow() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch (_) {
  }
}

export default function PwaInstallPrompt() {
  const deferredPromptRef = useRef(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [visible, setVisible] = useState(false);

  const eligible = useMemo(() => isAndroid() && !isStandalone() && !wasDismissedRecently(), []);

  useEffect(() => {
    if (!eligible) return;

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      deferredPromptRef.current = event;
      setCanPrompt(true);
      setVisible(true);
    }

    function onAppInstalled() {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setVisible(false);
      saveDismissedNow();
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [eligible]);

  async function onInstall() {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;

    try {
      setVisible(true);
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (_) {
    } finally {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      saveDismissedNow();
      setVisible(false);
    }
  }

  function onDismiss() {
    saveDismissedNow();
    setVisible(false);
  }

  if (!eligible || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[130] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white/95 p-3 shadow-xl backdrop-blur md:bottom-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-900">Installer LinkEduPro</p>
        <p className="mt-0.5 text-xs text-brand-700">Ajoute l’app sur ton téléphone (accès rapide, plein écran).</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={onDismiss}>
          Plus tard
        </button>
        <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={onInstall} disabled={!canPrompt}>
          Installer
        </button>
      </div>
    </div>
  );
}

