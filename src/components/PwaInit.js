"use client";

import { useEffect } from 'react';
import PwaInstallPrompt from './PwaInstallPrompt';

export default function PwaInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register SW after load to avoid blocking first paint.
    function register() {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return <PwaInstallPrompt />;
}

