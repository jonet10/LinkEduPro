"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const DEFAULT_RATE = 500;
const DURATION_OPTIONS = [30, 60, 90, 120];

export default function TutorBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState([]);
  const [childName, setChildName] = useState('');
  const [childLevel, setChildLevel] = useState('');
  const [savingChild, setSavingChild] = useState(false);
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const student = useMemo(() => getStudent(), []);
  const token = useMemo(() => getToken(), []);
  const isParent = student?.role === 'PARENT';

  const [form, setForm] = useState({
    childId: '',
    subject: '',
    level: '',
    date: '',
    time: '',
    durationMinutes: 60,
    paymentMethod: 'ONLINE'
  });

  useEffect(() => {
    const tutorId = params?.id;
    if (!tutorId) return;
    if (!token) {
      router.push(`/login?redirect=/tutors/${tutorId}/book`);
      return;
    }

    setLoading(true);
    apiClient(`/tutors/${tutorId}`)
      .then((data) => {
        setTutor(data.tutor || null);
        if (data?.tutor?.subjects?.length) {
          setForm((prev) => ({ ...prev, subject: data.tutor.subjects[0] }));
        }
        if (data?.tutor?.levels?.length) {
          setForm((prev) => ({ ...prev, level: data.tutor.levels[0] }));
        }
      })
      .catch((e) => setError(e.message || 'Impossible de charger le tuteur.'))
      .finally(() => setLoading(false));
  }, [params?.id, router, token]);

  useEffect(() => {
    if (!isParent || !token) return;
    apiClient('/parents/children', { token })
      .then((data) => setChildren(data.children || []))
      .catch(() => {});
  }, [isParent, token]);

  const price = useMemo(() => {
    const duration = Number(form.durationMinutes || 60);
    return ((duration / 60) * DEFAULT_RATE).toFixed(2);
  }, [form.durationMinutes]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const createChild = async () => {
    if (!childName || !childLevel) return;
    setSavingChild(true);
    try {
      const data = await apiClient('/parents/children', {
        method: 'POST',
        token,
        body: JSON.stringify({ childName, childLevel })
      });
      const next = data.child;
      setChildren((prev) => [next, ...prev]);
      setForm((prev) => ({ ...prev, childId: String(next.id) }));
      setChildName('');
      setChildLevel('');
    } catch (e) {
      setError(e.message || 'Impossible d\'ajouter l\'enfant.');
    } finally {
      setSavingChild(false);
    }
  };

  const submitBooking = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        tutorId: Number(params?.id),
        childId: isParent ? Number(form.childId || 0) || undefined : undefined,
        subject: form.subject,
        level: form.level,
        date: form.date,
        time: form.time,
        durationMinutes: Number(form.durationMinutes || 60),
        paymentMethod: form.paymentMethod
      };

      const bookingRes = await apiClient('/bookings', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      setBooking(bookingRes.booking);

      const paymentRes = await apiClient('/payments', {
        method: 'POST',
        token,
        body: JSON.stringify({ bookingId: bookingRes.booking.id, method: form.paymentMethod })
      });
      setPayment(paymentRes.payment || null);
    } catch (e) {
      setError(e.message || 'Impossible de créer la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-8">Chargement...</p>;
  if (!tutor) return <p className="mx-auto max-w-3xl px-4 py-8">Tuteur introuvable.</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">Réserver un tuteur</h1>
        <p className="mt-2 text-sm text-brand-700">
          {tutor.fullName} • {tutor.subjects?.join(', ') || 'Matières variées'}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {booking ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Confirmation</h2>
          <p className="mt-2 text-sm text-brand-700">Réservation créée avec succès.</p>
          <div className="mt-3 text-sm text-brand-800">
            <p><strong>Date:</strong> {new Date(booking.startsAt).toLocaleString()}</p>
            <p><strong>Durée:</strong> {booking.durationMinutes} min</p>
            <p><strong>Statut:</strong> {booking.status}</p>
          </div>
          {payment ? (
            <p className="mt-2 text-sm text-brand-700">Paiement: {payment.status}</p>
          ) : null}
          <div className="mt-3">
            <button className="btn-secondary" onClick={() => router.push('/bookings')}>Voir mes sessions</button>
          </div>
        </div>
      ) : (
        <div className="card space-y-4">
          {isParent ? (
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-900">Enfant</label>
              <select className="input" name="childId" value={form.childId} onChange={onChange}>
                <option value="">Sélectionner un enfant</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.childName} ({child.childLevel})
                  </option>
                ))}
              </select>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <input className="input" placeholder="Nom complet" value={childName} onChange={(e) => setChildName(e.target.value)} />
                <input className="input" placeholder="Niveau" value={childLevel} onChange={(e) => setChildLevel(e.target.value)} />
                <button className="btn-secondary" type="button" disabled={savingChild} onClick={createChild}>
                  {savingChild ? 'Ajout...' : 'Ajouter enfant'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" name="subject" value={form.subject} onChange={onChange}>
              <option value="">Matière</option>
              {(tutor.subjects || []).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <select className="input" name="level" value={form.level} onChange={onChange}>
              <option value="">Niveau</option>
              {(tutor.levels || []).map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
            <input className="input" type="date" name="date" value={form.date} onChange={onChange} />
            <input className="input" type="time" name="time" value={form.time} onChange={onChange} />
            <select className="input" name="durationMinutes" value={form.durationMinutes} onChange={onChange}>
              {DURATION_OPTIONS.map((dur) => (
                <option key={dur} value={dur}>{dur} minutes</option>
              ))}
            </select>
            <select className="input" name="paymentMethod" value={form.paymentMethod} onChange={onChange}>
              <option value="ONLINE">Paiement en ligne</option>
              <option value="MANUAL">Paiement manuel</option>
            </select>
          </div>

          <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
            <p className="text-sm text-brand-700">Résumé</p>
            <p className="mt-1 text-sm font-semibold text-brand-900">Prix session: {price} HTG</p>
          </div>

          <button className="btn-primary" type="button" disabled={submitting} onClick={submitBooking}>
            {submitting ? 'Réservation...' : 'Confirmer la réservation'}
          </button>
        </div>
      )}
    </section>
  );
}