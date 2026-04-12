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
      if (role !== 'PUBLISHER') {
        if (!subjects.trim()) return setError('Ajoute au moins une matière.');
        if (!levels.trim()) return setError('Ajoute au moins un niveau.');
        if (!experienceYears || Number(experienceYears) < 0) return setError('Années d’expérience invalides.');
        if (!bio.trim() || bio.trim().length < 30) return setError('La bio doit contenir au moins 30 caractères.');
      } else {
        if (!publisherName.trim()) return setError('Nom du partenaire requis.');
        if (!publisherType.trim()) return setError('Type partenaire requis.');
        if (publisherDescription && publisherDescription.trim().length > 0 && publisherDescription.trim().length < 30) {
          return setError('La description du partenaire doit contenir au moins 30 caractères.');
        }
      }
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
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              Profil tuteur : indique tes matières, niveaux et une courte présentation.
            </div>
            <input className="input" placeholder="Matières (séparées par virgule) *" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
            <input className="input" placeholder="Niveaux (NSI, NSII, NSIII...) *" value={levels} onChange={(e) => setLevels(e.target.value)} />
            <input className="input" type="number" min={0} placeholder="Années d'expérience *" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            <textarea className="input min-h-[120px]" placeholder="Bio / Présentation (min 30 caractères) *" value={bio} onChange={(e) => setBio(e.target.value)} />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              Profil partenaire : informations de l’organisation et description.
            </div>
            <input className="input" placeholder="Nom de l'organisation *" value={publisherName} onChange={(e) => setPublisherName(e.target.value)} />
            <select className="input" value={publisherType} onChange={(e) => setPublisherType(e.target.value)}>
              <option value="">Type partenaire *</option>
              <option value="AUTHOR">Écrivain / Auteur</option>
              <option value="EDITOR">Éditeur</option>
              <option value="INSTITUTION">Institution</option>
              <option value="UNIVERSITY">Université</option>
              <option value="VOCATIONAL_SCHOOL">École professionnelle</option>
              <option value="ORGANIZATION">ONG / Organisation</option>
              <option value="COMPANY">Entreprise</option>
            </select>
            <input className="input" placeholder="Téléphone partenaire" value={publisherPhone} onChange={(e) => setPublisherPhone(e.target.value)} />
            <input className="input" placeholder="Logo (URL)" value={publisherLogo} onChange={(e) => setPublisherLogo(e.target.value)} />
            <textarea className="input min-h-[120px]" placeholder="Description du partenaire (min 30 caractères)" value={publisherDescription} onChange={(e) => setPublisherDescription(e.target.value)} />
          </>
        )}
        <button className="btn-primary" onClick={submit}>Activer mon compte</button>
      </section>
    </main>
  );
}
