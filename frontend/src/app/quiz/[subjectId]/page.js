"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

const QUIZ_SECONDS = 300;

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId;

  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);
  const [startedAt, setStartedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const now = new Date().toISOString();
    setStartedAt(now);

    apiClient(`/quiz/subject/${subjectId}?limit=10`, { token })
      .then((data) => {
        setSubject(data.subject);
        setQuestions(data.questions);
      })
      .catch((e) => setError(e.message || 'Erreur chargement quiz'));
  }, [subjectId, router]);

  useEffect(() => {
    if (questions.length === 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [questions.length]);

  const durationSec = useMemo(() => QUIZ_SECONDS - timeLeft, [timeLeft]);

  const setAnswer = (questionId, selectedOption) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const submitQuiz = async () => {
    if (loading || questions.length === 0) return;
    setLoading(true);
    setError('');

    const token = getToken();
    const payload = {
      subjectId: Number(subjectId),
      startedAt,
      durationSec: Math.max(durationSec, 1),
      answers: questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({
          questionId: q.id,
          selectedOption: answers[q.id]
        }))
    };

    if (payload.answers.length === 0) {
      setError('Repondez au moins a une question avant soumission.');
      setLoading(false);
      return;
    }

    try {
      await apiClient('/quiz/submit', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      router.push('/progress');
    } catch (e) {
      setError(e.message || 'Echec soumission quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Quiz {subject ? `- ${subject.name}` : ''}</h1>
        <p className="rounded-lg bg-accent/20 px-3 py-2 text-sm font-semibold text-brand-900">Temps restant: {timeLeft}s</p>
      </div>

      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <article key={q.id} className="card">
            <p className="mb-3 font-semibold">{idx + 1}. {q.prompt}</p>
            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <label key={optIdx} className="flex cursor-pointer items-center gap-2 rounded border border-brand-100 px-3 py-2 hover:bg-brand-50">
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    checked={answers[q.id] === optIdx}
                    onChange={() => setAnswer(q.id, optIdx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <button className="btn-primary mt-6" onClick={submitQuiz} disabled={loading || questions.length === 0}>
        {loading ? 'Soumission...' : 'Soumettre le quiz'}
      </button>
    </section>
  );
}