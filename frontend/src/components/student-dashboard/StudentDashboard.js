"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SubjectGalaxy from './SubjectGalaxy';
import AIObjectivePanel from './AIObjectivePanel';
import LearningAnalytics from './LearningAnalytics';
import StudentNavigation from './StudentNavigation';
import { estimateSuccessProbability, toPercent } from './utils';

function useProgressCelebration(studentId, percent) {
  const key = `linkedupro:cockpit:progress:${studentId || 'anon'}`;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = toPercent(percent, 0);
    try {
      const raw = window.localStorage.getItem(key);
      const prev = raw ? Number(raw) : null;
      window.localStorage.setItem(key, String(next));
      if (prev !== null && Number.isFinite(prev) && next > prev) {
        setCelebrate(true);
        const t = window.setTimeout(() => setCelebrate(false), 1200);
        return () => window.clearTimeout(t);
      }
    } catch (_) {
    }
  }, [key, percent]);

  return celebrate;
}

export default function StudentDashboard({
  student,
  progress,
  dailyObjective,
  trackLabel,
  overallPercent,
  community
}) {
  const router = useRouter();
  const successProbability = useMemo(
    () => estimateSuccessProbability(progress?.overview?.averageScore || overallPercent),
    [progress?.overview?.averageScore, overallPercent]
  );
  const celebrate = useProgressCelebration(student?.id, overallPercent);

  function openSubject(subjectName) {
    // A dedicated subject dashboard can be wired later; keep navigation reliable today.
    if (!subjectName) {
      router.push('/subjects');
      return;
    }
    router.push('/subjects');
  }

  const communityCount = Array.isArray(community?.recent) ? community.recent.length : 0;

  return (
    <section className="cockpit-shell space-y-4">
      <header className="cockpit-header">
        <div>
          <p className="cockpit-kicker">Cockpit d'apprentissage</p>
          <h1 className="cockpit-h1">Bienvenue, {student?.firstName || 'Eleve'}.</h1>
          <p className="cockpit-subtitle">
            Vue en temps réel: progression, recommandations et prochaine action.
          </p>
        </div>
        <div className="cockpit-metric">
          <p className="text-xs font-semibold text-slate-200/70">Préparation estimée</p>
          <p className="text-2xl font-black text-slate-50">{successProbability}%</p>
          <p className="text-xs text-slate-200/70">Basé sur tes résultats récents</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="relative">
            <SubjectGalaxy
              subjectStats={progress?.subjectStats}
              overallPercent={overallPercent}
              successProbability={successProbability}
              onOpenSubject={openSubject}
            />
            {celebrate ? <div className="cockpit-celebrate" aria-hidden="true" /> : null}
          </div>
          <LearningAnalytics subjectStats={progress?.subjectStats} recentAttempts={progress?.recentAttempts} />
        </div>

        <AIObjectivePanel
          student={student}
          progress={progress}
          trackLabel={trackLabel}
          overallPercent={overallPercent}
          dailyObjective={dailyObjective}
        />
      </div>

      <section className="cockpit-glass rounded-3xl p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="cockpit-kicker">Outils</p>
            <h2 className="cockpit-title-sm">Aller plus vite</h2>
          </div>
          <p className="text-xs font-semibold text-slate-200/70">Accès rapide</p>
        </div>
        <div className="mt-4">
          <StudentNavigation communityCount={communityCount} />
        </div>
      </section>
    </section>
  );
}
