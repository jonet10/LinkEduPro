"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { setAuth } from '@/lib/auth';

const initialState = {
  firstName: '',
  lastName: '',
  sex: 'MALE',
  dateOfBirth: '',
  school: '',
  gradeLevel: '',
  email: '',
  phone: '',
  password: ''
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setAuth(data.token, data.student);
      router.push('/subjects');
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
          <option value="FEMALE">Feminin</option>
          <option value="OTHER">Autre</option>
        </select>
        <input className="input" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} required />
        <input className="input" name="school" placeholder="École" value={form.school} onChange={onChange} required />
        <input className="input" name="gradeLevel" placeholder="Niveau / Classe" value={form.gradeLevel} onChange={onChange} required />
        <input className="input" type="email" name="email" placeholder="Email (optionnel)" value={form.email} onChange={onChange} />
        <input className="input" name="phone" placeholder="Téléphone (optionnel)" value={form.phone} onChange={onChange} />
        <input className="input md:col-span-2" type="password" name="password" placeholder="Mot de passe" value={form.password} onChange={onChange} required />

        {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}

        <button className="btn-primary md:col-span-2" type="submit" disabled={loading}>
          {loading ? 'Inscription...' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  );
}
