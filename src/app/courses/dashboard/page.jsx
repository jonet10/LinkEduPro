'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CourseCertificateButton from '../../../components/CourseCertificateButton';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function CoursesDashboardPage() {
  const [data, setData] = useState({ enrolled: [], completed: [] });

  useEffect(() => {
    const load = async () => {
      if (!API_BASE) return;
      const token = window.localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/v2/courses/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const payload = await res.json();
        setData(payload);
      } catch (_) {
        // silent
      }
    };

    load();
  }, []);

  return (
    <main>
      <section className="header-hero">
        <h1>Tableau de bord etudiant</h1>
        <p>Suivi de ta progression, cours termines et certificats disponibles.</p>
      </section>

      <h2 className="section-title">Cours en cours</h2>
      <section className="course-grid">
        {data.enrolled.map((course) => (
          <article className="course-card" key={course.id}>
            <img
              src={course.thumbnail || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f'}
              alt={course.title}
            />
            <h3>{course.title}</h3>
            <p className="meta">Progression: {course.progress?.progressPercentage || 0}%</p>
            <Link className="btn" href={`/courses/${course.id}`}>Continuer</Link>
          </article>
        ))}
        {data.enrolled.length === 0 && (
          <div className="course-card">
            <h3>Aucun cours inscrit</h3>
            <p className="meta">Inscris-toi a un cours pour commencer.</p>
          </div>
        )}
      </section>

      <h2 className="section-title">Cours termines</h2>
      <section className="course-grid">
        {data.completed.map((course) => (
          <article className="course-card" key={course.id}>
            <img
              src={course.thumbnail || 'https://images.unsplash.com/photo-1509062522246-3755977927d7'}
              alt={course.title}
            />
            <h3>{course.title}</h3>
            <p className="meta">Certificat: {course.certificate ? 'Disponible' : 'Non disponible'}</p>
            {course.certificate ? (
              <CourseCertificateButton courseId={course.id} />
            ) : (
              <span className="badge">Non certifie</span>
            )}
          </article>
        ))}
        {data.completed.length === 0 && (
          <div className="course-card">
            <h3>Pas encore termine</h3>
            <p className="meta">Continue tes cours pour obtenir un certificat.</p>
          </div>
        )}
      </section>
    </main>
  );
}
