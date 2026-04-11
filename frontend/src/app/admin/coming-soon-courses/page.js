'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

export default function ComingSoonCoursesAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentToken = getToken();
    const student = getStudent();
    if (!currentToken || !student || !['ADMIN', 'SUPER_ADMIN'].includes(student.role)) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    loadCourses(token);
  }, [token]);

  async function loadCourses(authToken) {
    setError('');
    setLoading(true);
    try {
      const data = await apiClient('/courses', { token: authToken });
      const list = Array.isArray(data.courses) ? data.courses : [];
      setCourses(list);
      const defaultId = courseId || list[0]?.id;
      if (defaultId) {
        setCourseId(defaultId);
        await loadWaitlist(authToken, defaultId);
      }
    } catch (err) {
      setError(err?.message || 'Impossible de charger les cours.');
      setCourses([]);
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadWaitlist(authToken, id) {
    if (!id) return;
    try {
      const data = await apiClient(`/courses/admin/waitlist?courseId=${id}`, { token: authToken });
      setWaitlist(Array.isArray(data.participants) ? data.participants : []);
    } catch (err) {
      setError(err?.message || 'Impossible de charger la liste d’attente.');
      setWaitlist([]);
    }
  }

  async function activateCourse() {
    if (!token || !courseId) return;
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await apiClient(`/courses/admin/${courseId}/activate`, { method: 'PATCH', token });
      setMessage('Cours activé. Notifications envoyées.');
      await loadCourses(token);
    } catch (err) {
      setError(err?.message || 'Activation impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des cours à venir</h1>
            <p className="text-sm text-slate-600">Pré‑inscriptions et notifications.</p>
          </div>
          <button className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white" onClick={activateCourse}>
            Activer & notifier
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input"
              value={courseId}
              onChange={(e) => {
                const value = e.target.value;
                setCourseId(value);
                loadWaitlist(token, value);
              }}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <span className="text-sm text-slate-600">
              {courses.find((item) => String(item.id) === String(courseId))?.waitlistCount || 0} inscrit(s)
            </span>
          </div>

          {loading ? <p className="mt-4 text-sm text-slate-500">Chargement...</p> : null}

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">École</th>
                  <th className="px-3 py-2">Niveau</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.user?.firstName} {row.user?.lastName}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.user?.email || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.user?.school || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.user?.gradeLevel || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.status}</td>
                  </tr>
                ))}
                {!waitlist.length ? (
                  <tr>
                    <td className="px-3 py-3 text-center text-slate-600" colSpan={5}>
                      Aucun inscrit pour l’instant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
