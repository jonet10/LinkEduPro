"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    setLoading(true);
    apiClient(`/tutors/${id}`)
      .then((data) => setTutor(data.tutor || null))
      .catch((err) => setError(err.message || 'Impossible de charger le tuteur.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const onSelect = () => {
    const token = getToken();
    if (!token) {
      router.push(`/login?redirect=/tutors/${params?.id}`);
      return;
    }
    router.push('/messages');
  };

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8">Chargement...</p>;
  if (error) return <p className="mx-auto max-w-4xl px-4 py-8 text-red-600">{error}</p>;
  if (!tutor) return <p className="mx-auto max-w-4xl px-4 py-8">Tuteur introuvable.</p>;

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="card flex flex-col gap-4 md:flex-row md:items-center">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-brand-100">
          {tutor.profilePhoto ? (
            <img src={tutor.profilePhoto} alt={tutor.fullName} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-900">{tutor.fullName}</h1>
          <p className="text-sm text-brand-700">{tutor.subjects?.join(', ') || 'Matières variées'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-700">
            <span className="rounded-full bg-brand-50 px-2 py-1">Exp: {tutor.yearsOfExperience} ans</span>
            <span className="rounded-full bg-brand-50 px-2 py-1">Niveaux: {tutor.levels?.join(', ') || '-'}</span>
            <span className="rounded-full bg-brand-50 px-2 py-1">Note: {tutor.rating || 'N/A'}</span>
          </div>
        </div>
        <button className="btn-primary" onClick={onSelect}>Choisir ce tuteur</button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-900">Bio</h2>
        <p className="mt-2 text-sm text-brand-700">{tutor.bio || 'Bio non disponible.'}</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-900">Disponibilités</h2>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-brand-700">
          {tutor.availability ? JSON.stringify(tutor.availability, null, 2) : 'Disponibilités non renseignées.'}
        </pre>
      </div>
    </section>
  );
}
