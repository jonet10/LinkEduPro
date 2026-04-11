'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function ComingCourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id;
  const [token, setToken] = useState('');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
        const data = await apiClient('/courses', { token });
        if (!mounted) return;
        const list = Array.isArray(data?.courses) ? data.courses : [];
        const found = list.find((item) => String(item.id) === String(courseId));
        setCourse(found || null);
        if (!found) setError('Cours introuvable.');
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

  async function register() {
    if (!token || !courseId) return;
    try {
      setActionLoading(true);
      setError('');
      setMessage('');
      await apiClient(`/courses/${courseId}/register`, { method: 'POST', token });
      const data = await apiClient('/courses', { token });
      const list = Array.isArray(data?.courses) ? data.courses : [];
      const found = list.find((item) => String(item.id) === String(courseId));
      setCourse(found || null);
      setMessage('Vous serez notifié dès que le cours sera disponible.');
    } catch (err) {
      setError(err?.message || "Impossible de s'inscrire.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto w-full max-w-4xl px-4 py-10">
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
        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {course ? (
          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Bientôt disponible</span>
              <h1 className="mt-3 text-xl font-bold">{course.title}</h1>
            </div>
            <p className="mt-4 text-sm text-slate-600">{course.description}</p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
              <span>{course.waitlistCount || 0} inscrit(s)</span>
              <span>Statut : {course.status === 'coming_soon' ? 'Bientôt' : course.status}</span>
            </div>

            <button
              type="button"
              className="mt-6 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              disabled={course.registered || actionLoading}
              onClick={register}
            >
              {course.registered ? 'Inscrit ✔' : "S'inscrire pour être notifié"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
