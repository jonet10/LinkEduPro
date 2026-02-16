'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';

export default function InviteProfesseurPage() {
  const params = useParams();
  const token = params?.token;
  const [info, setInfo] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function validate() {
      try {
        const res = await apiClient(`/auth/teacher/invite/${token}`);
        setInfo(res);
      } catch (e) {
        setError(e.message);
      }
    }
    if (token) validate();
  }, [token]);

  async function submit() {
    try {
      setError('');
      const res = await apiClient('/auth/teacher/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, firstName, lastName, password })
      });
      setAuth(res.token, res.student);
      setMessage('Compte professeur cree avec succes.');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold">Invitation Professeur</h1>
        {info?.email ? <p>Email invite: <strong>{info.email}</strong></p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}
        {message ? <p className="text-green-700">{message}</p> : null}

        <input className="input" placeholder="Prenom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input className="input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary" onClick={submit}>Activer mon compte</button>
      </section>
    </main>
  );
}
