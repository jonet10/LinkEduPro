"use client";

import Link from 'next/link';
import SectionIcon from '@/components/ui/SectionIcon';

function ActionCard({ href, title, desc, tone = 'blue', primary = false, icon = 'rocket' }) {
  return (
    <Link
      href={href}
      className={`cockpit-action ${primary ? 'cockpit-action-primary' : ''}`}
      data-tone={tone}
      aria-label={title}
    >
      <div className="cockpit-action-icon" aria-hidden="true">
        <SectionIcon name={icon} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-50">{title}</p>
        <p className="mt-1 text-xs text-slate-200/70">{desc}</p>
      </div>
    </Link>
  );
}

export default function ActionButtons({ primaryCta }) {
  return (
    <section className="grid gap-3">
      <ActionCard
        href={primaryCta?.href || '/subjects'}
        title={primaryCta?.label || 'Launch Study Session'}
        desc="Demarre une session guidee par l IA."
        icon="compass"
        tone="gold"
        primary
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard href="/video-lessons" title="Digital Classroom" desc="Lecons video courtes et efficaces." icon="video" tone="cyan" />
        <ActionCard href="/probable-exercises" title="Practice Exercises" desc="Examens passes organises par annee." icon="target" tone="mint" />
        <ActionCard href="/subjects" title="Validated Quizzes" desc="Catalogue des rubriques et quiz." icon="quiz" tone="violet" />
        <ActionCard href="/focus" title="Exam Simulator" desc="Mode focus + entrainement chronometre." icon="timer" tone="blue" />
      </div>
    </section>
  );
}

