'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

const STATUS_LABELS = {
  OPEN: 'Ouvert pour inscription',
  UPCOMING: 'Bientôt',
  ARCHIVED: 'Archivé'
};

function formatStatus(value) {
  const key = String(value || '').toUpperCase();
  return STATUS_LABELS[key] || 'Ouvert';
}

function formatPrice(isFree) {
  return isFree ? 'Gratuit' : 'Payant';
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;
  const [token, setToken] = useState('');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
  }, [router]);

  useEffect(() => {
    if (!token || !courseId) return;
    let mounted = true;
    async function fetchCourse() {
      try {
        setLoading(true);
        setError('');
        const [courseData, dashboard] = await Promise.all([
          apiClient(`/v2/courses/${courseId}`, { token }),
          apiClient('/v2/courses/dashboard', { token }).catch(() => ({ enrolled: [] }))
        ]);
        if (!mounted) return;
        setCourse(courseData?.course || courseData);
        const isEnrolled = (dashboard?.enrolled || []).some((item) => String(item.id) === String(courseId));
        setEnrolled(isEnrolled);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Impossible de charger le cours.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCourse();
    return () => {
      mounted = false;
    };
  }, [token, courseId]);

  async function enrollCourse() {
    if (!token || !courseId) return;
    try {
      setActionLoading(true);
      setError('');
      await apiClient(`/v2/courses/${courseId}/enroll`, { method: 'POST', token });
      setEnrolled(true);
    } catch (err) {
      setError(err?.message || "Impossible d'inscrire ce cours.");
    } finally {
      setActionLoading(false);
    }
  }

  const meta = useMemo(() => {
    if (!course) return [];
    return [
      { label: 'Statut', value: formatStatus(course.status) },
      { label: 'Langue', value: course.language || 'Français' },
      { label: 'Prix', value: formatPrice(course.isFree) }
    ];
  }, [course]);

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <button
          type="button"
          className="text-sm font-semibold text-blue-700"
          onClick={() => router.back()}
        >
          ← Retour
        </button>

        {loading ? <p className="mt-6 text-sm text-slate-500">Chargement...</p> : null}
        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {course ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{course.description || 'Aucune description.'}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {meta.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase text-slate-500">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Inscription</p>
              <p className="mt-2 text-sm text-slate-600">
                Confirmez votre participation et accédez au parcours certifiant.
              </p>
              <button
                type="button"
                className={`mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold ${
                  enrolled ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-700 text-white'
                }`}
                disabled={enrolled || actionLoading}
                onClick={enrollCourse}
              >
                {enrolled ? 'Déjà inscrit' : 'Je participe'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
