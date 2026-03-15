"use client";

import { useMemo } from 'react';
import { estimateSuccessProbability, formatMinutes, makeInitials, toPercent } from './utils';
import { useDailyStreak } from './use-streak';
import ActionButtons from './ActionButtons';

function computeXp(progress) {
  const attempts = Number(progress?.overview?.totalAttempts || 0);
  const avg = Number(progress?.overview?.averageScore || 0);
  const xp = Math.round(attempts * 18 + avg * 4);
  return Math.max(0, xp);
}

function badgesFrom(progressPercent, xp) {
  const out = [];
  if (xp >= 600) out.push({ label: 'Maître des quiz', tone: 'violet' });
  if (progressPercent >= 75) out.push({ label: 'Prêt pour le Bac', tone: 'mint' });
  if (xp >= 300) out.push({ label: 'Explorateur', tone: 'cyan' });
  return out.slice(0, 3);
}

export default function AIObjectivePanel({
  student,
  progress,
  trackLabel,
  overallPercent,
  dailyObjective
}) {
  const streak = useDailyStreak(student?.id);
  const xp = useMemo(() => computeXp(progress), [progress]);
  const success = useMemo(() => estimateSuccessProbability(progress?.overview?.averageScore || overallPercent), [progress?.overview?.averageScore, overallPercent]);
  const badges = useMemo(() => badgesFrom(overallPercent, xp), [overallPercent, xp]);

  const objective = dailyObjective || {
    title: 'Objectif du jour',
    description: 'Fais 1 série de quiz puis révise 20 minutes.',
    ctaLabel: 'Commencer',
    ctaHref: '/subjects'
  };

  const eta = useMemo(() => {
    const base = 25;
    if (overallPercent >= 70) return base;
    if (overallPercent >= 50) return base + 10;
    return base + 20;
  }, [overallPercent]);

  return (
    <aside className="cockpit-glass rounded-3xl p-5" aria-label="Assistant IA">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="cockpit-avatar" aria-hidden="true">{makeInitials(student)}</div>
          <div>
            <p className="text-sm font-black text-slate-50">{student?.firstName || 'Élève'} {student?.lastName || ''}</p>
            <p className="mt-1 text-xs text-slate-200/70">Filière: {trackLabel || 'Général'} · Série: {streak} jour(s)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-200/70">XP</p>
          <p className="text-lg font-black text-slate-50">{xp}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200/70">Coach intelligent</p>
        <p className="mt-2 text-sm font-bold text-slate-50">
          Beau progrès {student?.firstName || ''} — préparation estimée: {success}%.
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200/70">
            <span>Progression globale</span>
            <span>{toPercent(overallPercent, 0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-400/80 via-cyan-400/70 to-indigo-500/80" style={{ transform: `scaleX(${toPercent(overallPercent, 0) / 100})` }} />
          </div>
        </div>

        {badges.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className="cockpit-badge" data-tone={b.tone}>{b.label}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200/70">Objectif IA</p>
        <p className="mt-2 text-sm font-black text-slate-50">{objective.title}</p>
        <p className="mt-2 text-sm text-slate-200/80">{objective.description}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-200/70">
          <span>Temps estimé</span>
          <span>{formatMinutes(eta)}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
          <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-fuchsia-400/70 to-amber-300/70" style={{ transform: `scaleX(${Math.max(0.12, Math.min(0.92, overallPercent / 100))})` }} />
        </div>
      </div>

      <div className="mt-4">
        <ActionButtons primaryCta={{ href: objective.ctaHref, label: objective.ctaLabel }} />
      </div>
    </aside>
  );
}
