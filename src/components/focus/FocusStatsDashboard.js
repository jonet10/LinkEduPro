"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function FocusStatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiClient('/focus/stats?days=7', { token })
      .then((data) => setStats(data))
      .catch((e) => setError(e.message || 'Erreur chargement statistiques'))
      .finally(() => setLoading(false));
  }, []);

  const maxWeekly = useMemo(() => {
    if (!stats?.weekly?.length) return 1;
    return Math.max(...stats.weekly.map((d) => d.totalMinutes), 1);
  }, [stats]);

  if (loading) return <article className="card"><p className="text-sm text-brand-700">Chargement statistiques...</p></article>;
  if (error) return <article className="card"><p className="text-sm text-red-600">{error}</p></article>;

  return (
    <article className="card space-y-5">
      <h2 className="text-xl font-semibold text-brand-900">Study Statistics</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-brand-100 p-3">
          <p className="text-xs text-brand-700">Focus aujourd'hui</p>
          <p className="text-2xl font-bold text-brand-900">{stats.dailyFocusMinutes} min</p>
        </div>
        <div className="rounded-lg border border-brand-100 p-3">
          <p className="text-xs text-brand-700">Total focus</p>
          <p className="text-2xl font-bold text-brand-900">{stats.totalFocusMinutes} min</p>
        </div>
        <div className="rounded-lg border border-brand-100 p-3">
          <p className="text-xs text-brand-700">Pomodoros complétés</p>
          <p className="text-2xl font-bold text-brand-900">{stats.totalPomodorosCompleted}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-900">Weekly focus chart</h3>
        <div className="grid grid-cols-7 gap-2">
          {stats.weekly.map((day) => {
            const h = Math.max(Math.round((day.totalMinutes / maxWeekly) * 100), 6);
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div className="flex h-28 w-full items-end rounded bg-brand-50 p-1">
                  <div className="w-full rounded bg-brand-500" style={{ height: `${h}%` }} title={`${day.totalMinutes} min`} />
                </div>
                <p className="text-[10px] text-brand-700">{day.date.slice(5)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-900">Recent sessions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-brand-700">
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Durée</th>
                <th className="px-2 py-1">Début</th>
                <th className="px-2 py-1">Fin</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recentSessions || []).map((s) => (
                <tr key={s.id} className="border-b border-brand-100">
                  <td className="px-2 py-1">{s.cycleType || 'WORK'}</td>
                  <td className="px-2 py-1">{s.duration} min</td>
                  <td className="px-2 py-1">{s.startTime ? new Date(s.startTime).toLocaleString() : '-'}</td>
                  <td className="px-2 py-1">{s.endTime ? new Date(s.endTime).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {(!stats.recentSessions || stats.recentSessions.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-brand-700">Aucune session récente.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
