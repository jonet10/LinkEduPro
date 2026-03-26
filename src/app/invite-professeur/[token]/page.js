'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';

const SUBJECT_OPTIONS = ['Math', 'Français', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire', 'Géographie'];
const LEVEL_OPTIONS = ['7e', '8e', '9e', 'NSI', 'NSII', 'NSIII', 'NSIV'];

export default function InviteProfesseurPage() {
  const params = useParams();
  const token = params?.token;
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    profilePhoto: '',
    subjects: [],
    levels: [],
    experienceYears: '',
    availability: '',
    bio: '',
    isTutor: true
  });

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

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  function parseAvailability(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        return trimmed;
      }
    }
    return trimmed;
  }

  async function submit() {
    try {
      setError('');
      const payload = {
        token,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        isTutor: form.isTutor,
        profilePhoto: form.profilePhoto || undefined,
        subjects: form.subjects,
        levels: form.levels,
        experienceYears: Number(form.experienceYears || 0),
        availability: parseAvailability(form.availability),
        bio: form.bio || undefined
      };
      const res = await apiClient('/auth/teacher/accept-invite', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAuth(res.token, res.student);
      setMessage('Compte professeur créé avec succès.');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold">Invitation Professeur</h1>
        {info?.email ? <p>Email invité: <strong>{info.email}</strong></p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}
        {message ? <p className="text-green-700">{message}</p> : null}

        <input className="input" placeholder="Prénom" value={form.firstName} name="firstName" onChange={onChange} />
        <input className="input" placeholder="Nom" value={form.lastName} name="lastName" onChange={onChange} />
        <input className="input" type="password" placeholder="Mot de passe" value={form.password} name="password" onChange={onChange} />

        <label className="flex items-center gap-2 text-sm text-brand-700">
          <input type="checkbox" name="isTutor" checked={form.isTutor} onChange={onChange} />
          Activer mon profil en tant que tuteur
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Photo de profil (URL)" value={form.profilePhoto} name="profilePhoto" onChange={onChange} />
          <input className="input" type="number" min="0" max="60" placeholder="Années d'expérience" value={form.experienceYears} name="experienceYears" onChange={onChange} />
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-900">Matières enseignées</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((subject) => {
              const active = form.subjects.includes(subject);
              return (
                <button
                  type="button"
                  key={subject}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50'
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      subjects: active
                        ? prev.subjects.filter((item) => item !== subject)
                        : [...prev.subjects, subject]
                    }))
                  }
                >
                  {subject}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-brand-900">Classes / niveaux</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((level) => {
              const active = form.levels.includes(level);
              return (
                <button
                  type="button"
                  key={level}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50'
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      levels: active
                        ? prev.levels.filter((item) => item !== level)
                        : [...prev.levels, level]
                    }))
                  }
                >
                  {level}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-brand-600">Clique pour sélectionner plusieurs matières et niveaux.</p>
        </div>

        <textarea
          className="input min-h-[110px]"
          placeholder="Disponibilités (ex: Lundi 8h-12h, Mercredi 14h-18h)"
          value={form.availability}
          name="availability"
          onChange={onChange}
        />
        <textarea
          className="input min-h-[140px]"
          placeholder="Bio (30 caractères minimum)"
          value={form.bio}
          name="bio"
          onChange={onChange}
        />

        <button className="btn-primary" onClick={submit}>Activer mon compte</button>
      </section>
    </main>
  );
}
