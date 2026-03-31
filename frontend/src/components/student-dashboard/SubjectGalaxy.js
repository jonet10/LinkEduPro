"use client";

import { useMemo, useState } from 'react';
import { masteryFromScore, normalizeText, toPercent } from './utils';

function buildNodes(subjectStats, fallbackTrack) {
  const rows = Array.isArray(subjectStats) ? subjectStats : [];
  if (!rows.length) {
    return [
      { subject: 'Mathématiques', score: 55 },
      { subject: 'Physique', score: 60 },
      { subject: 'SVT', score: 50 },
      { subject: 'Philosophie', score: 48 },
      { subject: 'Histoire', score: 45 }
    ];
  }

  const sorted = [...rows]
    .map((row) => ({
      subject: String(row?.subject || 'Rubrique').trim(),
      score: toPercent(row?.average, 0),
      attempts: Number(row?.attempts || 0)
    }))
    .sort((a, b) => b.score - a.score);

  const top = sorted.slice(0, 8);
  if (!top.some((n) => normalizeText(n.subject).toLowerCase().includes('philo')) && fallbackTrack) {
    // Keep variety: add a track node if missing.
    top.push({ subject: String(fallbackTrack), score: Math.round(top[0]?.score || 60), attempts: 0 });
  }
  return top;
}

function toneClass(tone) {
  if (tone === 'good') return 'galaxy-node-good';
  if (tone === 'mid') return 'galaxy-node-mid';
  return 'galaxy-node-weak';
}

export default function SubjectGalaxy({
  subjectStats,
  overallPercent = 0,
  successProbability = 0,
  onOpenSubject
}) {
  const nodes = useMemo(() => buildNodes(subjectStats), [subjectStats]);
  const [hovered, setHovered] = useState(null);

  const positions = useMemo(() => {
    // Deterministic orbit layout.
    const base = [
      { x: 18, y: 18 },
      { x: 72, y: 15 },
      { x: 86, y: 52 },
      { x: 70, y: 84 },
      { x: 26, y: 86 },
      { x: 10, y: 55 },
      { x: 38, y: 10 },
      { x: 60, y: 92 }
    ];
    return nodes.map((_, idx) => base[idx % base.length]);
  }, [nodes]);

  return (
    <section className="cockpit-glass relative overflow-hidden rounded-3xl p-5" aria-label="Univers d'apprentissage">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="cockpit-kicker">Univers d'apprentissage</p>
          <h2 className="cockpit-title">Galaxie des matières</h2>
          <p className="cockpit-subtitle">Clique une matière pour ouvrir tes rubriques et quiz.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-200/70">Préparation</p>
          <p className="text-sm font-bold text-slate-100">{successProbability}%</p>
        </div>
      </div>

      <div className="relative mt-5 aspect-square w-full">
        <div className="galaxy-bg absolute inset-0 rounded-[2.5rem]" aria-hidden="true" />

        <button
          type="button"
          className="galaxy-core absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          onClick={() => onOpenSubject?.('Tableau de bord')}
          aria-label="Ouvrir le tableau de bord"
        >
          <div className="galaxy-core-inner">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200/70">Progression</p>
            <p className="mt-1 text-3xl font-black text-slate-50">{toPercent(overallPercent, 0)}%</p>
            <p className="mt-1 text-xs font-semibold text-slate-200/70">Global</p>
          </div>
        </button>

        {nodes.map((node, idx) => {
          const mastery = masteryFromScore(node.score);
          const pos = positions[idx] || { x: 50, y: 50 };
          const key = `${node.subject}-${idx}`;

          return (
            <button
              key={key}
              type="button"
              className={`galaxy-node ${toneClass(mastery.tone)}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseEnter={() => setHovered({ ...node, mastery })}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered({ ...node, mastery })}
              onBlur={() => setHovered(null)}
              onClick={() => onOpenSubject?.(node.subject)}
              aria-label={`Ouvrir ${node.subject}`}
            >
              <span className="galaxy-node-label">{node.subject}</span>
              <span className="galaxy-node-score">{toPercent(node.score, 0)}%</span>
            </button>
          );
        })}

        {hovered ? (
          <div className="galaxy-tooltip" role="status" aria-live="polite">
            <p className="text-xs font-semibold text-slate-200/70">{hovered.subject}</p>
            <p className="mt-1 text-sm font-bold text-slate-50">{toPercent(hovered.score, 0)}% • Maîtrise {hovered.mastery.label}</p>
            {Number(hovered.attempts || 0) > 0 ? (
              <p className="mt-1 text-xs text-slate-200/70">{hovered.attempts} tentative(s) récente(s)</p>
            ) : (
              <p className="mt-1 text-xs text-slate-200/70">Clique pour explorer</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
