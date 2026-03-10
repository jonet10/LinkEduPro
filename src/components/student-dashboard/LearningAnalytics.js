"use client";

import { useMemo } from 'react';
import { clamp, masteryFromScore, normalizeText, toPercent } from './utils';

function dayKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildWeeklyBars(recentAttempts) {
  const rows = Array.isArray(recentAttempts) ? recentAttempts : [];
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), count: 0 });
  }

  const map = new Map(days.map((d) => [d.key, d]));
  rows.forEach((row) => {
    const key = dayKey(row?.createdAt || row?.created_at || row?.date);
    const slot = map.get(key);
    if (slot) slot.count += 1;
  });

  const max = Math.max(1, ...days.map((d) => d.count));
  return days.map((d) => ({ ...d, pct: clamp((d.count / max) * 100, 6, 100) }));
}

function pickWeakSubjects(subjectStats) {
  const rows = Array.isArray(subjectStats) ? subjectStats : [];
  return [...rows]
    .map((row) => ({
      subject: String(row?.subject || 'Rubrique').trim(),
      score: toPercent(row?.average, 0),
      attempts: Number(row?.attempts || 0)
    }))
    .filter((row) => row.attempts > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);
}

function recommendFromWeak(weak) {
  return weak.map((row) => {
    const normalized = normalizeText(row.subject).toLowerCase();
    if (normalized.includes('phys') || normalized.includes('chim')) return { title: `Serie de calcul: ${row.subject}`, hint: '20 min + 1 correction' };
    if (normalized.includes('math')) return { title: `Exercices rapides: ${row.subject}`, hint: '15 min + 5 questions' };
    if (normalized.includes('philo')) return { title: `Notions cle: ${row.subject}`, hint: '1 fiche + 1 mini quiz' };
    return { title: `Revision guidee: ${row.subject}`, hint: '1 quiz + 1 correction' };
  });
}

export default function LearningAnalytics({ subjectStats, recentAttempts }) {
  const bars = useMemo(() => buildWeeklyBars(recentAttempts), [recentAttempts]);
  const weak = useMemo(() => pickWeakSubjects(subjectStats), [subjectStats]);
  const recs = useMemo(() => recommendFromWeak(weak), [weak]);

  return (
    <section className="cockpit-glass rounded-3xl p-5" aria-label="Smart Analytics">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="cockpit-kicker">Smart Analytics</p>
          <h3 className="cockpit-title-sm">Performance Insights</h3>
        </div>
        <p className="text-xs font-semibold text-slate-200/70">7 jours</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200/70">Weekly activity</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            {bars.map((bar) => (
              <div key={bar.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="h-20 w-full rounded-lg bg-white/5 p-1">
                  <div
                    className="h-full w-full rounded-md bg-gradient-to-b from-cyan-400/70 to-indigo-500/70"
                    style={{ transform: `scaleY(${bar.pct / 100})`, transformOrigin: 'bottom' }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-200/70">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200/70">Weak subjects</p>
          {weak.length ? (
            <div className="mt-3 space-y-3">
              {weak.map((row) => {
                const mastery = masteryFromScore(row.score);
                return (
                  <div key={row.subject} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-50">{row.subject}</p>
                      <p className="text-[11px] text-slate-200/70">Mastery {mastery.label}</p>
                    </div>
                    <p className="text-sm font-black text-slate-50">{row.score}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-200/70">Pas assez de donnees. Lance 2 quiz pour activer l analyse.</p>
          )}

          {recs.length ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200/70">Recommended next</p>
              <ul className="mt-2 space-y-2">
                {recs.slice(0, 3).map((row) => (
                  <li key={row.title} className="text-xs text-slate-100">
                    <span className="font-semibold">{row.title}</span>
                    <span className="text-slate-200/70"> · {row.hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

