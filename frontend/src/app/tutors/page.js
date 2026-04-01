"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

const LEVEL_OPTIONS = ['7e', '8e', '9e', 'NSI', 'NSII', 'NSIII', 'NSIV'];
const SUBJECT_OPTIONS = ['Math', 'Français', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire', 'Géographie'];

function formatRating(value) {
  if (!value) return 'N/A';
  return Number(value).toFixed(1);
}

export default function TutorsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    subject: '',
    level: '',
    experience: ''
  });

  const pageSize = 12;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.level) params.set('level', filters.level);
    if (filters.experience) params.set('experience', filters.experience);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    apiClient(`/tutors?${params.toString()}`)
      .then((data) => {
        if (!isMounted) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Impossible de charger les tuteurs.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filters, page]);

  const onSelectTutor = (id) => {
    const token = getToken();
    if (!token) {
      router.push(`/login?redirect=/tutors/${id}`);
      return;
    }
    router.push(`/tutors/${id}`);
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="card">
        <h1 className="text-3xl font-black text-brand-900">Trouver un tuteur</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sélectionne un tuteur certifié pour un accompagnement personnalisé.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="Rechercher par nom"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
          <select
            className="input"
            value={filters.subject}
            onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
          >
            <option value="">Toutes matières</option>
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.level}
            onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
          >
            <option value="">Tous niveaux</option>
            {LEVEL_OPTIONS.map((lv) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.experience}
            onChange={(e) => setFilters((prev) => ({ ...prev, experience: e.target.value }))}
          >
            <option value="">Expérience</option>
            <option value="1">1+ an</option>
            <option value="3">3+ ans</option>
            <option value="5">5+ ans</option>
            <option value="10">10+ ans</option>
          </select>
        </div>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !items.length ? (
        <p className="text-sm text-brand-700">Aucun tuteur disponible pour le moment.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((tutor) => (
          <button
            type="button"
            key={tutor.id}
            className="card lift-card text-left"
            onClick={() => onSelectTutor(tutor.id)}
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-brand-100">
                {tutor.profilePhoto ? (
                  <img src={tutor.profilePhoto} alt={tutor.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-brand-600">
                    {String(tutor.fullName || 'TU').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-brand-900">{tutor.fullName}</p>
                <p className="text-xs text-brand-700">{tutor.subjects?.join(', ') || 'Matières variées'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-700">
              <span className="rounded-full bg-brand-50 px-2 py-1">Exp: {tutor.yearsOfExperience} ans</span>
              <span className="rounded-full bg-brand-50 px-2 py-1">Niveaux: {tutor.levels?.join(', ') || '-'}</span>
              <span className="rounded-full bg-brand-50 px-2 py-1">Note: {formatRating(tutor.rating)}</span>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <span className="text-sm text-brand-700">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </button>
        </div>
      ) : null}
    </section>
  );
}
