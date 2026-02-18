"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getDepartments, getCommunes, getSchools } from '@/lib/schools';

const initialState = {
  firstName: '',
  lastName: '',
  sex: 'MALE',
  dateOfBirth: '',
  school: '',
  gradeLevel: '',
  email: '',
  phone: '',
  password: '',
  department: '',
  commune: '',
  schoolFromList: ''
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const departments = useMemo(() => getDepartments(), []);
  const communes = useMemo(() => getCommunes(form.department), [form.department]);
  const schools = useMemo(() => getSchools(form.department, form.commune), [form.department, form.commune]);

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onDepartmentChange = (e) => {
    const department = e.target.value;
    setForm((prev) => ({
      ...prev,
      department,
      commune: '',
      schoolFromList: ''
    }));
  };

  const onCommuneChange = (e) => {
    const commune = e.target.value;
    setForm((prev) => ({
      ...prev,
      commune,
      schoolFromList: ''
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setDevToken('');
    setLoading(true);

    const chosenSchool = form.schoolFromList || form.school;
    if (!chosenSchool) {
      setError("Veuillez choisir une école ou saisir une école manuellement.");
      setLoading(false);
      return;
    }

    const schoolLabel = form.department && form.commune
      ? `${form.department} / ${form.commune} / ${chosenSchool}`
      : chosenSchool;

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        sex: form.sex,
        dateOfBirth: form.dateOfBirth,
        school: schoolLabel,
        gradeLevel: form.gradeLevel,
        email: form.email,
        phone: form.phone,
        password: form.password
      };

      const data = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setInfo(data.message || 'Compte cree. Verifiez votre email avant connexion.');
      if (data.devVerificationToken) {
        setDevToken(data.devVerificationToken);
      }
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      setError(err.message || "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl card">
      <h1 className="mb-6 text-2xl font-bold text-brand-900">Inscription élève</h1>
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <input className="input" name="firstName" placeholder="Prénom" value={form.firstName} onChange={onChange} required />
        <input className="input" name="lastName" placeholder="Nom" value={form.lastName} onChange={onChange} required />

        <select className="input" name="sex" value={form.sex} onChange={onChange}>
          <option value="MALE">Masculin</option>
          <option value="FEMALE">Féminin</option>
          <option value="OTHER">Autre</option>
        </select>
        <input className="input" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} required />

        <select className="input" name="department" value={form.department} onChange={onDepartmentChange}>
          <option value="">Département (optionnel)</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select className="input" name="commune" value={form.commune} onChange={onCommuneChange} disabled={!form.department}>
          <option value="">Commune (optionnel)</option>
          {communes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="input md:col-span-2"
          name="schoolFromList"
          value={form.schoolFromList}
          onChange={onChange}
          disabled={!form.commune || schools.length === 0}
        >
          <option value="">Choisir une école dans la liste (optionnel)</option>
          {schools.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          className="input md:col-span-2"
          name="school"
          placeholder="École (saisie manuelle si non listée)"
          value={form.school}
          onChange={onChange}
        />

        <input className="input" name="gradeLevel" placeholder="Niveau / Classe" value={form.gradeLevel} onChange={onChange} required />
        <input className="input" type="email" name="email" placeholder="Email" value={form.email} onChange={onChange} required />
        <input className="input" name="phone" placeholder="Téléphone (optionnel)" value={form.phone} onChange={onChange} />
        <input className="input md:col-span-2" type="password" name="password" placeholder="Mot de passe" value={form.password} onChange={onChange} required />

        {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
        {info ? <p className="md:col-span-2 text-sm text-green-600">{info}</p> : null}
        {devToken ? <p className="md:col-span-2 text-xs text-brand-700">Token de verification (dev): {devToken}</p> : null}

        <button className="btn-primary md:col-span-2" type="submit" disabled={loading}>
          {loading ? 'Inscription...' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  );
}
