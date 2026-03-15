"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const HIDE_ON_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/verify-email']);

export default function MobileBackButton() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [canGoBack, setCanGoBack] = useState(false);

  const shouldShow = useMemo(() => {
    if (!pathname || HIDE_ON_PATHS.has(pathname)) return false;
    return true;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  if (!shouldShow) return null;

  return (
    <button
      type="button"
      aria-label="Retour"
      title="Retour"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-100 bg-white/80 text-brand-800 shadow-sm backdrop-blur hover:bg-white md:hidden"
      onClick={() => {
        if (canGoBack) router.back();
        else router.push('/');
      }}
    >
      <span className="text-xl leading-none">←</span>
    </button>
  );
}

