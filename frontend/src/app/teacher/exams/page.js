"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { OFFICIAL_9E_EXAM_SUBJECTS, getExamSubjectSuggestions } from '@/lib/exam-subjects';

const LEVEL_OPTIONS = [
  { value: '9e', label: '9e AF' },
  { value: 'NSI', label: 'NSI' },
  { value: 'NSII', label: 'NSII' },
  { value: 'NSIII', label: 'NSIII' },
  { value: 'NSIV', label: 'NSIV' },
  { value: 'Universitaire', label: 'Universitaire / Professionnel' }
];

function defaultTopicFromFile(file) {
  const name = String(file?.name || '').replace(/\.pdf$/i, '').trim();
  return name || '';
}

export default function TeacherExamsPage() {
  const [ready, setReady] = useState(false);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState('');

  const [level, setLevel] = useState('NSIV');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastCreated, setLastCreated] = useState(null);

  useEffect(() => {
    const me = getStudent();
    const t = getToken();
    setStudent(me);
    setToken(t || '');
    setReady(true);
  }, []);

  const canManage = useMemo(() => ['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(student?.role), [student?.role]);

  const subjectSuggestions = useMemo(() => {
    return getExamSubjectSuggestions(level);
  }, [level]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLastCreated(null);

    if (!token) {
      setError('Connecte-toi pour continuer.');
      return;
    }
    if (!canManage) {
      setError('Accès réservé aux professeurs / admins.');
      return;
    }
    if (!file) {
      setError('Choisis un fichier PDF.');
      return;
    }
    if (!subject.trim()) {
      setError('Indique la matière (ex : Mathématiques, Anglais...).');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('level', level);
      formData.append('subject', subject.trim());
      formData.append('topic', topic.trim());
      formData.append('file', file, file.name);

      const data = await apiClient('/exams/sources', {
        method: 'POST',
        token,
        body: formData
      });

      setSuccess(data.message || 'Examen ajouté.');
      setLastCreated(data.source || null);
      setTopic('');
      setSubject('');
      setFile(null);
    } catch (e2) {
      setError(e2.message || "Impossible d'ajouter l'examen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return <p className="text-sm text-brand-700">Chargement...</p>;

  if (!token) {
    return (
      <section className="card">
        <h1 className="text-2xl font-bold text-brand-900">Ajouter un examen passé</h1>
        <p className="mt-2 text-sm text-brand-700">Connecte-toi pour accéder au formulaire.</p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="card">
        <h1 className="text-2xl font-bold text-brand-900">Ajouter un examen passé</h1>
        <p className="mt-2 text-sm text-red-600">Accès réservé aux professeurs / admins.</p>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Examens passés</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">Ajouter un PDF</h1>
        <p className="mt-2 text-sm text-brand-700">
          Les élèves verront le document dans la rubrique « Examens passés » selon la classe sélectionnée.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
      </section>

      <section className="card">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Classe</span>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Matière</span>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              list="linkedupro-exam-subject-suggestions"
              placeholder="Ex: Mathématiques"
              maxLength={120}
              required
            />
            <datalist id="linkedupro-exam-subject-suggestions">
              {subjectSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {level === '9e' ? (
              <p className="text-xs text-brand-600">Suggestions officielles 9e : {OFFICIAL_9E_EXAM_SUBJECTS.join(' • ')}</p>
            ) : null}
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-brand-900">Titre / Thème</span>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Bac 2025 - Sujet officiel"
              maxLength={200}
            />
            <p className="text-xs text-brand-600">Optionnel: si vide, le titre est déduit du nom du fichier.</p>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-brand-900">PDF</span>
            <input
              className="input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const nextFile = e.target.files?.[0] || null;
                setFile(nextFile);
                if (!topic.trim() && nextFile) {
                  setTopic(defaultTopicFromFile(nextFile));
                }
              }}
              required
            />
          </label>

          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Ajouter examen'}
            </button>
          </div>
        </form>
      </section>

      {lastCreated ? (
        <section className="card">
          <h2 className="text-xl font-semibold text-brand-900">Dernier examen ajouté</h2>
          <p className="mt-2 text-sm text-brand-700">
            {lastCreated.subject} • {lastCreated.topic} • {lastCreated.level}
          </p>
          <a className="btn-secondary mt-3 inline-block" href={`/exam-viewer?file=${encodeURIComponent(lastCreated.fileName)}`}>
            Ouvrir le PDF
          </a>
        </section>
      ) : null}
    </main>
  );
}
