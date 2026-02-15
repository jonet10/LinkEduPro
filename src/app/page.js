import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="grid gap-6 md:grid-cols-2 md:items-center">
      <div>
        <p className="mb-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-brand-900">L'éducation connectée</p>
        <h1 className="mb-4 text-4xl font-black leading-tight text-brand-900">Réviser, simuler, progresser avec LinkEduPro</h1>
        <p className="mb-6 text-brand-700">Module élève: quiz par matière, examens chronométrés, score automatique et suivi précis des progrès.</p>
        <div className="flex gap-3">
          <Link href="/register" className="btn-primary">Commencer</Link>
          <Link href="/login" className="btn-secondary">Se connecter</Link>
        </div>
      </div>
      <div className="card">
        <h2 className="mb-3 text-lg font-bold">Ce que vous obtenez</h2>
        <ul className="space-y-2 text-sm text-brand-900">
          <li>- Catalogue de matières</li>
          <li>- Quiz interactifs et notation immédiate</li>
          <li>- Simulation d'examen chronométrée</li>
          <li>- Tableau de bord de progression</li>
        </ul>
      </div>
    </section>
  );
}
