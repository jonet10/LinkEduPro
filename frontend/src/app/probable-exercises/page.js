"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/runtime-config';

function subjectKey(year, subject) {
  return `${String(year || '').trim()}::${String(subject || '').trim()}`;
}

function extractYear(fileName) {
  const match = String(fileName || '').match(/(19\d{2}|20\d{2})/);
  return match ? match[1] : 'Sans annee';
}

function cleanFileLabel(fileName) {
  return String(fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function normalizeSubjectLabel(value) {
  return String(value || 'Autre')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildYearBuckets(items) {
  const yearMap = new Map();

  for (const subjectRow of items || []) {
    const subject = normalizeSubjectLabel(subjectRow?.subject);
    const topicRows = Array.isArray(subjectRow?.topics) ? subjectRow.topics : [];

    for (const topicRow of topicRows) {
      const topic = String(topicRow?.topic || '').trim();
      const sources = Array.isArray(topicRow?.sources) ? topicRow.sources : [];

      for (const source of sources) {
        const fileName = String(source?.fileName || '').trim();
        if (!fileName) continue;

        const year = extractYear(fileName);
        if (!yearMap.has(year)) yearMap.set(year, new Map());
        const subjectMap = yearMap.get(year);

        if (!subjectMap.has(subject)) subjectMap.set(subject, new Map());
        const fileMap = subjectMap.get(subject);

        if (!fileMap.has(fileName)) {
          fileMap.set(fileName, {
            fileName,
            label: cleanFileLabel(fileName),
            topics: new Set()
          });
        }
        if (topic) fileMap.get(fileName).topics.add(topic);
      }
    }
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    if (a === 'Sans annee') return 1;
    if (b === 'Sans annee') return -1;
    return Number(b) - Number(a);
  });

  return years.map((year) => {
    const subjectMap = yearMap.get(year);
    const subjects = Array.from(subjectMap.entries())
      .map(([subject, fileMap]) => ({
        subject,
        exams: Array.from(fileMap.values())
          .map((exam) => ({
            fileName: exam.fileName,
            label: exam.label,
            topics: Array.from(exam.topics).sort((a, b) => a.localeCompare(b))
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    return {
      year,
      subjects,
      subjectSummary: subjects.map((row) => row.subject).join(' - ')
    };
  });
}

export default function ProbableExercisesPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [level, setLevel] = useState('NSIV');
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getToken();
    apiClient('/public/probable-exercises', { token: authToken })
      .then((data) => {
        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setLevel(String(data?.level || 'NSIV'));
        setItems(nextItems);
      })
      .catch((e) => setError(e.message || 'Impossible de charger les examens passés.'))
      .finally(() => setLoading(false));
  }, []);

  const yearBuckets = useMemo(() => buildYearBuckets(items), [items]);

  useEffect(() => {
    if (!yearBuckets.length) {
      setSelectedYear('');
      return;
    }
    setSelectedYear((prev) => (prev && yearBuckets.some((row) => row.year === prev) ? prev : yearBuckets[0].year));
  }, [yearBuckets]);

  useEffect(() => {
    // Default state: exams hidden. Reset when year changes so the UI stays predictable.
    setExpandedSubjects(new Set());
  }, [selectedYear]);

  const activeYear = useMemo(
    () => yearBuckets.find((row) => row.year === selectedYear) || null,
    [yearBuckets, selectedYear]
  );

  function openExamPdf(fileName) {
    if (typeof window === 'undefined') return;
    const pdfUrl = `${getApiBaseUrl()}/public/exam-pdfs/${encodeURIComponent(fileName)}`;
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
    if (isMobileViewport) {
      window.location.assign(pdfUrl);
      return;
    }
    router.push(`/exam-viewer?file=${encodeURIComponent(fileName)}`);
  }

  function toggleSubject(year, subject) {
    const key = subjectKey(year, subject);
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const levelLabel = useMemo(() => {
    const raw = String(level || '').toUpperCase();
    if (raw === 'LEVEL_9E') return '9e AF';
    if (raw === 'NSI') return 'NSI';
    if (raw === 'NSII') return 'NSII';
    if (raw === 'NSIII') return 'NSIII';
    if (raw === 'UNIVERSITAIRE') return 'Universitaire';
    return 'NSIV';
  }, [level]);

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Examens passes</h1>
        <p className="mt-2 text-sm text-brand-700">
          Les sujets sont organises par annee, puis par matiere.
        </p>
        <p className="mt-1 text-xs font-semibold text-brand-700">Niveau filtre: {levelLabel}</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white/70">
        <div className="flex min-w-max">
          {yearBuckets.map((row, idx) => (
            <button
              key={row.year}
              type="button"
              className={`min-w-[180px] px-6 py-4 text-center text-3xl font-bold text-brand-900 transition ${
                selectedYear === row.year ? 'bg-brand-50' : 'bg-transparent'
              }`}
              onClick={() => setSelectedYear(row.year)}
            >
              {row.year}
              {idx < yearBuckets.length - 1 ? <span className="ml-6 text-brand-400">-</span> : null}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        !activeYear ? (
          <div className="card">
            <p className="text-sm text-brand-700">Aucun PDF d examen disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <article className="card">
              <h2 className="text-2xl font-semibold text-brand-900">
                {activeYear.year === 'Sans annee' ? 'Annee non precisee' : `Annee ${activeYear.year}`}
              </h2>
              <p className="mt-2 text-sm text-brand-700">
                Matieres: {activeYear.subjectSummary || 'Aucune matiere detectee'}
              </p>
            </article>

            <div className="grid gap-4 md:grid-cols-2">
              {activeYear.subjects.map((subjectRow) => (
                <article key={`${activeYear.year}-${subjectRow.subject}`} className="card">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 text-left"
                    onClick={() => toggleSubject(activeYear.year, subjectRow.subject)}
                    aria-expanded={expandedSubjects.has(subjectKey(activeYear.year, subjectRow.subject))}
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-brand-900">{subjectRow.subject}</h3>
                      <p className="mt-1 text-xs font-semibold text-brand-600">{subjectRow.exams.length} PDF</p>
                      {!expandedSubjects.has(subjectKey(activeYear.year, subjectRow.subject)) ? (
                        <p className="mt-2 text-xs text-brand-600">Clique pour afficher les examens.</p>
                      ) : null}
                    </div>
                    <span className="mt-1 select-none text-2xl text-brand-500">
                      {expandedSubjects.has(subjectKey(activeYear.year, subjectRow.subject)) ? '▾' : '▸'}
                    </span>
                  </button>

                  {expandedSubjects.has(subjectKey(activeYear.year, subjectRow.subject)) ? (
                    <div className="mt-3 space-y-3">
                      {subjectRow.exams.map((exam) => (
                        <div key={`${subjectRow.subject}-${exam.fileName}`} className="rounded-xl border border-brand-100 p-4">
                          <p className="text-base font-semibold text-brand-900">{exam.label}</p>
                          {exam.topics.length > 0 ? (
                            <p className="mt-1 text-sm text-brand-700">
                              Themes: {exam.topics.slice(0, 3).join(', ')}
                              {exam.topics.length > 3 ? ', ...' : ''}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            className="btn-primary mt-3 !px-3 !py-1.5 text-xs"
                            onClick={() => openExamPdf(exam.fileName)}
                          >
                            Ouvrir PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
