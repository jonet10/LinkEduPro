"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken, isNsivStudent } from '@/lib/auth';
import SectionIcon from '@/components/ui/SectionIcon';

function normalizeSubjectName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function scoreSubjectForTrack(subjectName, track) {
  const normalized = normalizeSubjectName(subjectName);
  const nsivTrack = String(track || 'ORDINAIRE').toUpperCase();

  let score = 0;
  if (normalized.includes('annales')) score += 3;
  if (normalized.includes('connaissance generale')) score += 2;

  if (nsivTrack === 'SVT') {
    if (normalized.includes('svt')) score += 8;
    if (normalized.includes('chimie')) score += 3;
    if (normalized.includes('histoire')) score += 3;
    if (normalized.includes('philosophie')) score += 2;
    if (normalized.includes('physique')) score += 2;
  } else if (nsivTrack === 'SMP') {
    if (normalized.includes('physique')) score += 8;
    if (normalized.includes('chimie')) score += 5;
    if (normalized.includes('svt')) score += 2;
    if (normalized.includes('philosophie')) score += 2;
    if (normalized.includes('histoire')) score += 2;
  } else if (nsivTrack === 'SES' || nsivTrack === 'LLA') {
    if (normalized.includes('philosophie')) score += 9;
    if (normalized.includes('histoire')) score += 8;
    if (normalized.includes('connaissance generale')) score += 5;
    if (normalized.includes('svt')) score += 2;
    if (normalized.includes('chimie')) score += 1;
  } else {
    if (normalized.includes('philosophie')) score += 6;
    if (normalized.includes('connaissance generale')) score += 7;
    if (normalized.includes('histoire')) score += 5;
    if (normalized.includes('physique')) score += 3;
    if (normalized.includes('chimie')) score += 3;
    if (normalized.includes('svt')) score += 3;
  }

  return score;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [canSeeProbableExercises, setCanSeeProbableExercises] = useState(false);
  const [isNsivSectionVisible, setIsNsivSectionVisible] = useState(false);
  const [isPublicView, setIsPublicView] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const currentStudent = useMemo(() => getStudent(), []);
  const nsivTrack = String(currentStudent?.nsivTrack || 'ORDINAIRE').toUpperCase();
  const publicSubjects = useMemo(
    () => ([
      { name: 'Mathématiques', description: 'Algèbre, géométrie et logique appliquée.' },
      { name: 'Physique', description: 'Mécanique, électricité et optique.' },
      { name: 'Chimie', description: 'Réactions, stœchiométrie et solutions.' },
      { name: 'Histoire-Géographie', description: 'Méthode, repères et exercices guidés.' },
      { name: 'Philosophie', description: 'Dissertations, notions clés et analyses.' },
      { name: 'Connaissance générale', description: 'Culture générale et sujets NSIV.' }
    ]),
    []
  );
  const visibleSubjects = useMemo(() => {
    const filtered = !isNsivSectionVisible ? subjects : subjects.filter((subject) => {
      const normalized = normalizeSubjectName(subject.name);
      return normalized !== 'sciences' && normalized !== 'francais';
    });

    if (!isNsivSectionVisible) return filtered;

    const scored = filtered.map((subject) => ({
      ...subject,
      _trackScore: scoreSubjectForTrack(subject.name, nsivTrack)
    }));

    scored.sort((a, b) => b._trackScore - a._trackScore || a.name.localeCompare(b.name));
    return scored;
  }, [subjects, isNsivSectionVisible, nsivTrack]);

  useEffect(() => {
    const token = getToken();
    const student = getStudent();
    if (!token) {
      setIsPublicView(true);
      return;
    }
    const isNsiv = isNsivStudent(student);
    setIsNsivSectionVisible(Boolean(isNsiv));
    setCanSeeProbableExercises(student?.role !== 'STUDENT' || isNsiv);

    apiClient('/subjects', { token })
      .then(setSubjects)
      .catch((e) => setError(e.message || 'Impossible de charger les matières'));
  }, [router]);

  if (isPublicView) {
    return (
      <section className="space-y-5">
        <article className="card public-card grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Apprendre par matière</h1>
            <p className="mt-2 text-sm text-brand-700">
              Découvre les rubriques et les types d’entraînement disponibles sur LinkEduPro.
              Connecte-toi pour accéder aux quiz complets et au suivi personnalisé.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">Créer un compte</Link>
              <Link href="/login" className="btn-secondary">Se connecter</Link>
            </div>
          </div>
          <div className="public-hero-media">
            <img src="/images/tool-rubriques-nsiv.png" alt="Rubriques et apprentissage guidé" />
          </div>
        </article>

        <article className="card public-card public-card-delay-1">
          <h2 className="text-xl font-semibold text-brand-900">Ce que tu peux faire</h2>
          <ul className="mt-3 space-y-2 text-sm text-brand-700">
            <li>Apprendre avec des rubriques classées par matière.</li>
            <li>Tester tes connaissances avec des séries d’entraînement.</li>
            <li>Suivre ta progression après connexion.</li>
          </ul>
        </article>

        <section className="card public-card public-card-delay-2">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques phares</h2>
          <p className="mt-2 text-sm text-brand-700">Aperçu des matières disponibles.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicSubjects.map((subject) => (
              <article key={subject.name} className="rounded-lg border border-brand-100 p-4 public-card public-card-delay-3">
                <h3 className="text-lg font-semibold text-brand-900">{subject.name}</h3>
                <p className="mt-2 text-sm text-brand-700">{subject.description}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold text-brand-900">Catalogue des rubriques</h1>
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {canSeeProbableExercises && !isNsivSectionVisible ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Exercices les plus probables</h2>
          <p className="mt-2 text-sm text-brand-700">Analyse NSIV des sujets les plus fréquents par matière.</p>
          <Link href="/probable-exercises" className="btn-primary mt-4 inline-block">Voir la rubrique</Link>
        </article>
      ) : null}
      {isNsivSectionVisible ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques NSIV</h2>
          <p className="mt-2 text-sm text-brand-700">
            Accès rapide aux contenus structurés pour la classe NSIV.
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-800">Filière active : {nsivTrack}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link href="/nsiv" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="nsiv" />
                </span>
                Espace NSIV
              </p>
              <p className="mt-1 text-sm text-brand-700">Vue complète des rubriques NSIV.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="target" />
                </span>
                Exercices les plus probables
              </p>
              <p className="mt-1 text-sm text-brand-700">Analyse des sujets récurrents du Bac NSIV.</p>
            </Link>
            <Link href="/video-lessons" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="video" />
                </span>
                Classe Numerique
              </p>
              <p className="mt-1 text-sm text-brand-700">Leçons et exercices vidéo, gratuits ou payants.</p>
            </Link>
            <Link href="/rattrapage" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="video" />
                </span>
                Rattrapage Google Meet
              </p>
              <p className="mt-1 text-sm text-brand-700">Cours de rattrapage planifiés pour NSIV.</p>
            </Link>
            <Link href="/subjects" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="globe" />
                </span>
                Histoire-Géographie NSIV
              </p>
              <p className="mt-1 text-sm text-brand-700">Nouveaux quiz basés sur vos documents Hist-Géo.</p>
            </Link>
            <Link href="/subjects" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="brain" />
                </span>
                Connaissance générale NSIV
              </p>
              <p className="mt-1 text-sm text-brand-700">Rubrique culture générale pour toutes les filières.</p>
            </Link>
          </div>
        </article>
      ) : null}
      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">Rubriques disponibles</h2>
        <p className="mt-2 text-sm text-brand-700">
          {isNsivSectionVisible
            ? 'Sélection adaptée au niveau NSIV. Chaque rubrique contient des contenus et des quiz.'
            : 'Sélection générale des rubriques disponibles. Chaque rubrique contient des contenus et des quiz.'}
        </p>
        {isNsivSectionVisible ? (
          <p className="mt-1 text-xs font-semibold text-brand-700">
            Affichage priorise pour ta Filière ({nsivTrack}).
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <article key={subject.id} className="card">
              <h2 className="text-xl font-semibold text-brand-900">{subject.name}</h2>
              <p className="mt-2 text-sm text-brand-700">{subject.description}</p>
              <p className="mt-3 text-xs font-semibold text-brand-500">{subject.questionCount} questions disponibles</p>
              <Link href={`/quiz/${subject.id}`} className="btn-primary mt-4 inline-block">Ouvrir la rubrique</Link>
            </article>
          ))}
          {visibleSubjects.length === 0 ? (
            <p className="text-sm text-brand-700">Aucune matière disponible pour le moment.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
