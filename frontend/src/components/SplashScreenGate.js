"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

const MIN_SPLASH_MS = 1400;

export default function SplashScreenGate() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();
    let mounted = true;
    let timer = null;

    function hideWithMinimumDelay() {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
      timer = setTimeout(() => {
        if (mounted) setVisible(false);
      }, wait);
    }

    if (document.readyState === 'complete') {
      hideWithMinimumDelay();
    } else {
      window.addEventListener('load', hideWithMinimumDelay, { once: true });
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener('load', hideWithMinimumDelay);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen" role="status" aria-live="polite" aria-label="Chargement de LinkEduPro">
      <div className="splash-inner">
        <Image src="/logo.png" alt="LinkEduPro" width={110} height={110} className="splash-logo" priority />
        <p className="splash-title">LinkEduPro</p>
        <div className="splash-loader" aria-hidden="true" />
      </div>
    </div>
  );
}
