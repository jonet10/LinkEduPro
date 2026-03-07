"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function toSubjectKey(subject) {
  const normalized = normalizeText(subject);
  if (normalized.includes('PHYSIQUE')) return 'PHYSIQUE';
  if (normalized.includes('MATHEMAT')) return 'MATHEMATIQUE';
  if (normalized.includes('CHIM')) return 'CHIMIE';
  return normalized || 'AUTRE';
}

function toSubjectLabel(key) {
  if (key === 'PHYSIQUE') return 'Physique';
  if (key === 'MATHEMATIQUE') return 'Mathématique';
  if (key === 'CHIMIE') return 'Chimie';
  return key;
}

function extractYear(fileName) {
  const match = String(fileName || '').match(/(19\d{2}|20\d{2})/);
  return match ? match[1] : 'Sans année';
}

function cleanFileLabel(fileName) {
  return String(fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function groupExamsByYear(subjectRows) {
  const byFile = new Map();

  for (const row of subjectRows || []) {
    const topic = String(row?.topic || '').trim();
    for (const source of row?.sources || []) {
      const fileName = String(source?.fileName || '').trim();
      if (!fileName) continue;

      if (!byFile.has(fileName)) {
        byFile.set(fileName, {
          fileName,
          year: extractYear(fileName),
          topics: new Set()
        });
      }
      if (topic) byFile.get(fileName).topics.add(topic);
    }
  }

  const byYear = new Map();
  for (const exam of byFile.values()) {
    if (!byYear.has(exam.year)) byYear.set(exam.year, []);
    byYear.get(exam.year).push({
      fileName: exam.fileName,
      label: cleanFileLabel(exam.fileName),
      topics: Array.from(exam.topics).sort((a, b) => a.localeCompare(b)),
      href: `/exam-viewer?file=${encodeURIComponent(exam.fileName)}`
    });
  }

  const years = Array.from(byYear.keys()).sort((a, b) => {
    if (a === 'Sans année') return 1;
    if (b === 'Sans année') return -1;
    return Number(b) - Number(a);
  });

  return years.map((year) => ({
    year,
    exams: (byYear.get(year) || []).sort((a, b) => a.label.localeCompare(b.label))
  }));
}

export default function ProbableExercisesPage() {
  const [items, setItems] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getToken();
    apiClient('/public/probable-exercises', { token: authToken })
      .then((data) => {
        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setItems(nextItems);
        const firstKey = nextItems.length ? toSubjectKey(nextItems[0].subject) : '';
        setSelectedSubject(firstKey);
      })
      .catch((e) => setError(e.message || 'Impossible de charger les examens passés.'))
      .finally(() => setLoading(false));
  }, []);

  const availableSubjects = useMemo(() => {
    const subjectMap = new Map();
    for (const row of items) {
      const key = toSubjectKey(row?.subject);
      if (!key) continue;
      if (!subjectMap.has(key)) subjectMap.set(key, toSubjectLabel(key));
    }
    return Array.from(subjectMap.entries()).map(([key, label]) => ({ key, label }));
  }, [items]);

  const selectedRows = useMemo(
    () => items.filter((row) => toSubjectKey(row?.subject) === selectedSubject),
    [items, selectedSubject]
  );

  const yearGroups = useMemo(() => {
    const topicRows = selectedRows.flatMap((row) => row?.topics || []);
    return groupExamsByYear(topicRows);
  }, [selectedRows]);

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Examens passés</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sélectionne une matière puis une année pour ouvrir les PDF des examens précédents.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {availableSubjects.map((subject) => (
          <button
            key={subject.key}
            type="button"
            className={`card text-left ${selectedSubject === subject.key ? 'ring-2 ring-brand-400' : ''}`}
            onClick={() => setSelectedSubject(subject.key)}
          >
            <p className="text-lg font-semibold text-brand-900">{subject.label}</p>
            <p className="mt-1 text-sm text-brand-700">Voir les examens passés de {subject.label} par année.</p>
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        yearGroups.length === 0 ? (
          <div className="card">
            <p className="text-lg font-semibold text-brand-900">{toSubjectLabel(selectedSubject || 'Matière')}</p>
            <p className="mt-2 text-sm text-brand-700">Aucun PDF d’examen disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {yearGroups.map((group) => (
              <article key={`${selectedSubject}-${group.year}`} className="card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-brand-900">
                    {group.year === 'Sans année' ? 'Année non précisée' : `Année ${group.year}`}
                  </h2>
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                    {group.exams.length} PDF
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {group.exams.map((exam) => (
                    <div key={`${group.year}-${exam.fileName}`} className="rounded-lg border border-brand-100 p-3">
                      <p className="font-semibold text-brand-900">{exam.label}</p>
                      {exam.topics.length > 0 ? (
                        <p className="mt-1 text-xs text-brand-700">
                          Thèmes: {exam.topics.slice(0, 3).join(' • ')}
                          {exam.topics.length > 3 ? ' • ...' : ''}
                        </p>
                      ) : null}
                      <div className="mt-3">
                        <Link href={exam.href} className="btn-primary !px-3 !py-1.5 text-xs">
                          Ouvrir PDF
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
