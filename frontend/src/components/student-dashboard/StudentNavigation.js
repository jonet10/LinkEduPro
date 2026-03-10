"use client";

import Link from 'next/link';
import SectionIcon from '@/components/ui/SectionIcon';

function NavCard({ href, title, desc, icon, badge }) {
  return (
    <Link href={href} className="cockpit-tool" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="cockpit-tool-icon" aria-hidden="true">
          <SectionIcon name={icon} />
        </div>
        {badge ? <span className="cockpit-tool-badge" aria-label={badge}>{badge}</span> : null}
      </div>
      <p className="mt-3 text-sm font-black text-slate-50">{title}</p>
      <p className="mt-1 text-xs text-slate-200/70">{desc}</p>
    </Link>
  );
}

export default function StudentNavigation({ communityCount = 0 }) {
  const communityBadge = communityCount > 0 ? String(Math.min(99, communityCount)) : '';

  return (
    <nav className="grid gap-3 md:grid-cols-4" aria-label="Outils élève">
      <NavCard href="/library" title="📚 Bibliothèque" desc="PDF, fiches, supports." icon="library" />
      <NavCard href="/probable-exercises" title="📝 Examens passés" desc="Annales organisées par année." icon="target" />
      <NavCard href="/focus" title="🤖 Tuteur IA" desc="Focus + accompagnement (bientôt)." icon="spark" badge="Bientôt" />
      <NavCard href="/blog" title="👥 Communauté" desc="Posts, conseils, entraide." icon="collection" badge={communityBadge} />
    </nav>
  );
}
