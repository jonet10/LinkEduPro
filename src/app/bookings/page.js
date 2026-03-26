"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function BookingsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login?redirect=/bookings');
      return;
    }
    apiClient('/bookings/user', { token })
      .then((data) => setBookings(data.bookings || []))
      .catch((e) => setError(e.message || 'Impossible de charger les sessions.'))
      .finally(() => setLoading(false));
  }, [token, router]);

  const upcoming = bookings.filter((b) => new Date(b.startsAt) > new Date());
  const past = bookings.filter((b) => new Date(b.startsAt) <= new Date());

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-8">Chargement...</p>;

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">Mes sessions tuteur</h1>
        <p className="mt-2 text-sm text-brand-700">Suivi des sessions à venir et passées.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-900">À venir</h2>
        {upcoming.length === 0 ? <p className="text-sm text-brand-700">Aucune session à venir.</p> : null}
        {upcoming.map((booking) => (
          <div key={booking.id} className="card">
            <p className="text-sm font-semibold text-brand-900">
              {booking.subject} • {booking.level}
            </p>
            <p className="text-sm text-brand-700">
              {new Date(booking.startsAt).toLocaleString()} • {booking.durationMinutes} min
            </p>
            <p className="text-xs text-brand-600">Statut: {booking.status}</p>
            {booking.status === 'PAID' ? (
              <button className="btn-primary mt-2" onClick={() => router.push('/messages')}>Rejoindre la session</button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-900">Passées</h2>
        {past.length === 0 ? <p className="text-sm text-brand-700">Aucune session passée.</p> : null}
        {past.map((booking) => (
          <div key={booking.id} className="card">
            <p className="text-sm font-semibold text-brand-900">
              {booking.subject} • {booking.level}
            </p>
            <p className="text-sm text-brand-700">
              {new Date(booking.startsAt).toLocaleString()} • {booking.durationMinutes} min
            </p>
            <p className="text-xs text-brand-600">Statut: {booking.status}</p>
            <button className="btn-secondary mt-2" onClick={() => router.push(`/tutors/${booking.tutorId}/book`)}>
              Rebooker ce tuteur
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}