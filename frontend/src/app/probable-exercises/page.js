"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/runtime-config';

const API_URL = API_BASE_URL;

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
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expandedYear, setExpandedYear] = useState('');
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
        setExpandedYear('');
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

  useEffect(() => {
    if (!yearGroups.length) {
      setExpandedYear('');
      return;
    }
    setExpandedYear((prev) => (prev && yearGroups.some((group) => group.year === prev) ? prev : yearGroups[0].year));
  }, [yearGroups]);

  function openExamPdf(fileName) {
    if (typeof window === 'undefined') return;
    const pdfUrl = `${API_URL}/public/exam-pdfs/${encodeURIComponent(fileName)}`;
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
    if (isMobileViewport) {
      window.location.assign(pdfUrl);
      return;
    }
    router.push(`/exam-viewer?file=${encodeURIComponent(fileName)}`);
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Examens passés</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sélectionne une matière puis une année pour ouvrir les PDF des examens précédents.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white/70">
        <div className="flex min-w-max">
        {availableSubjects.map((subject) => (
          <button
            key={subject.key}
            type="button"
            className={`min-w-[220px] border-r border-brand-100 px-6 py-4 text-left text-2xl font-semibold text-brand-900 transition ${
              selectedSubject === subject.key ? 'bg-brand-50' : 'bg-transparent'
            }`}
            onClick={() => setSelectedSubject(subject.key)}
          >
            {subject.label}
          </button>
        ))}
        </div>
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
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                      {group.exams.length} PDF
                    </span>
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      onClick={() => setExpandedYear((prev) => (prev === group.year ? '' : group.year))}
                    >
                      {expandedYear === group.year ? 'Masquer' : 'Voir les PDF'}
                    </button>
                  </div>
                </div>

                {expandedYear === group.year ? (
                  <div className="space-y-3">
                    {group.exams.map((exam) => (
                      <div key={`${group.year}-${exam.fileName}`} className="rounded-xl border border-brand-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-brand-900">{exam.label}</p>
                            {exam.topics.length > 0 ? (
                              <p className="mt-1 text-sm text-brand-700">
                                Thèmes: {exam.topics.slice(0, 3).join(', ')}
                                {exam.topics.length > 3 ? ', ...' : ''}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => openExamPdf(exam.fileName)}
                            className="btn-primary !px-3 !py-1.5 text-xs whitespace-nowrap"
                          >
                            Ouvrir PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
