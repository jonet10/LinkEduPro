'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';

export default function InviteProfesseurPage() {
  const params = useParams();
  const token = params?.token;
  const [info, setInfo] = useState(null);
  const [role, setRole] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [subjects, setSubjects] = useState('');
  const [levels, setLevels] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [publisherType, setPublisherType] = useState('');
  const [publisherPhone, setPublisherPhone] = useState('');
  const [publisherDescription, setPublisherDescription] = useState('');
  const [publisherLogo, setPublisherLogo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function validate() {
      try {
        const res = await apiClient(`/auth/teacher/invite/${token}`);
        setInfo(res);
        setRole(String(res?.role || 'TEACHER').toUpperCase());
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
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          password,
          phone: phone || undefined,
          isTutor: role !== 'PUBLISHER',
          subjects: subjects ? subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
          levels: levels ? levels.split(',').map((s) => s.trim()).filter(Boolean) : [],
          experienceYears: experienceYears ? Number(experienceYears) : undefined,
          bio: bio || undefined,
          publisherName: role === 'PUBLISHER' ? publisherName : undefined,
          publisherType: role === 'PUBLISHER' ? publisherType : undefined,
          publisherPhone: role === 'PUBLISHER' ? publisherPhone : undefined,
          publisherDescription: role === 'PUBLISHER' ? publisherDescription : undefined,
          publisherLogo: role === 'PUBLISHER' ? publisherLogo : undefined
        })
      });
      setAuth(res.token, res.student);
      setMessage(role === 'PUBLISHER' ? 'Compte partenaire créé avec succès.' : 'Compte tuteur créé avec succès.');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold">
          {role === 'PUBLISHER' ? 'Invitation Partenaire' : 'Invitation Tuteur'}
        </h1>
        {info?.email ? <p>Email invite: <strong>{info.email}</strong></p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}
        {message ? <p className="text-green-700">{message}</p> : null}

        <input className="input" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input className="input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input className="input" placeholder="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {role !== 'PUBLISHER' ? (
          <>
            <input className="input" placeholder="Matières (séparées par virgule)" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
            <input className="input" placeholder="Niveaux (NSI, NSII, NSIII...)" value={levels} onChange={(e) => setLevels(e.target.value)} />
            <input className="input" type="number" min={0} placeholder="Années d'expérience" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            <textarea className="input min-h-[120px]" placeholder="Bio / Présentation" value={bio} onChange={(e) => setBio(e.target.value)} />
          </>
        ) : (
          <>
            <input className="input" placeholder="Nom de l'organisation" value={publisherName} onChange={(e) => setPublisherName(e.target.value)} />
            <input className="input" placeholder="Type partenaire (INSTITUTION / UNIVERSITY / ONG...)" value={publisherType} onChange={(e) => setPublisherType(e.target.value)} />
            <input className="input" placeholder="Téléphone partenaire" value={publisherPhone} onChange={(e) => setPublisherPhone(e.target.value)} />
            <input className="input" placeholder="Logo (URL)" value={publisherLogo} onChange={(e) => setPublisherLogo(e.target.value)} />
            <textarea className="input min-h-[120px]" placeholder="Description du partenaire" value={publisherDescription} onChange={(e) => setPublisherDescription(e.target.value)} />
          </>
        )}
        <button className="btn-primary" onClick={submit}>Activer mon compte</button>
      </section>
    </main>
  );
}
