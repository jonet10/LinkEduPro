'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function formatHtg(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function EduCollectPage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [mine, setMine] = useState(false);

  const canCreate = student?.role === 'STUDENT';
  const isAdmin = student?.role === 'ADMIN';

  useEffect(() => {
    setStudent(getStudent());
  }, []);

  async function loadProjects(nextMine) {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const query = nextMine ? '?mine=true' : '';
      const data = await apiClient(`/educollect/projects${query}`, { token: token || undefined });
      setProjects(data.projects || []);
    } catch (e) {
      setProjects([]);
      setError(e.message || 'Impossible de charger les projets EduCollect.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects(mine);
  }, [mine]);

  const title = useMemo(() => (mine ? 'Mes projets' : 'Projets approuvés'), [mine]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Nouveau module</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">EduCollect</h1>
        <p className="mt-2 text-sm text-brand-700">
          Financement éducatif sécurisé, transparent et contrôlé pour soutenir les projets validés.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canCreate ? <Link className="btn-primary" href="/educollect/create">Créer un projet</Link> : null}
          {isAdmin ? <Link className="btn-secondary" href="/educollect/admin">Dashboard admin</Link> : null}
          {student ? (
            <button type="button" className={mine ? 'btn-primary' : 'btn-secondary'} onClick={() => setMine((prev) => !prev)}>
              {mine ? 'Voir les projets publics' : 'Voir mes projets'}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">{title}</h2>
        {loading ? <p className="mt-3 text-sm text-brand-700">Chargement...</p> : null}
        {!loading && projects.length === 0 ? <p className="mt-3 text-sm text-brand-700">Aucun projet disponible.</p> : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-brand-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{project.category}</p>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{project.status}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-brand-900">{project.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-brand-700">{project.description}</p>
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${project.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-brand-700">
                  {formatHtg(project.collectedAmount)} collectés / {formatHtg(project.targetAmount)} ({project.progressPercent}%)
                </p>
                <p className="text-xs text-brand-700">Contributeurs: {project.contributorCount}</p>
              </div>
              <Link className="btn-secondary mt-4 inline-block" href={`/educollect/projects/${project.id}`}>
                Voir le projet
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
