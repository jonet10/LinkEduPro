"use client";

import { useEffect, useMemo, useState } from 'react';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useDailyStreak(studentId) {
  const storageKey = useMemo(() => `linkedupro:streak:${studentId || 'anon'}`, [studentId]);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const today = todayKey();
      const last = String(parsed?.lastDay || '');
      const prevStreak = Number(parsed?.streak || 1);

      if (!last) {
        window.localStorage.setItem(storageKey, JSON.stringify({ lastDay: today, streak: 1 }));
        setStreak(1);
        return;
      }

      if (last === today) {
        setStreak(prevStreak || 1);
        return;
      }

      const lastDate = new Date(`${last}T00:00:00`);
      const todayDate = new Date(`${today}T00:00:00`);
      const deltaDays = Math.round((todayDate - lastDate) / (24 * 60 * 60 * 1000));
      const nextStreak = deltaDays === 1 ? Math.max(1, prevStreak + 1) : 1;
      window.localStorage.setItem(storageKey, JSON.stringify({ lastDay: today, streak: nextStreak }));
      setStreak(nextStreak);
    } catch (_) {
      setStreak(1);
    }
  }, [storageKey]);

  return streak;
}

