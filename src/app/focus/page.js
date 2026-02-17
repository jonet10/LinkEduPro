"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import FocusMusicPlayer from '@/components/focus/FocusMusicPlayer';
import PomodoroTimer from '@/components/focus/PomodoroTimer';
import FocusStatsDashboard from '@/components/focus/FocusStatsDashboard';

export default function FocusPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <section className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-black text-brand-900">Focus Module</h1>
        <p className="mt-2 text-sm text-brand-700">
          Musique de concentration, Pomodoro configurable et statistiques d'étude quotidiennes / hebdomadaires.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FocusMusicPlayer />
        <PomodoroTimer />
      </div>

      <FocusStatsDashboard />
    </section>
  );
}
