"use client";

import { useEffect } from 'react';
import { initThemeFromStorage } from '@/lib/auth';

export default function ThemeInit() {
  useEffect(() => {
    initThemeFromStorage();
  }, []);

  return null;
}
