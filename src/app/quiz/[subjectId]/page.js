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
  const [quizSets, setQuizSets] = useState([]);
  const [selectedSetKey, setSelectedSetKey] = useState('');
  const [mode, setMode] = useState('standard');
  const [premiumAvailable, setPremiumAvailable] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS);
  const [startedAt, setStartedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedSet = quizSets.find((s) => s.key === selectedSetKey) || null;

  const loadQuestions = async (setKey, selectedMode = mode) => {
    const token = getToken();
    const now = new Date().toISOString();
    setStartedAt(now);
    setTimeLeft(QUIZ_SECONDS);
    setAnswers({});
    setError('');

    const setQuery = setKey && setKey !== 'default' ? `&set=${encodeURIComponent(setKey)}` : '';
    const premiumQuery = selectedMode === 'premium' ? '&premium=1' : '';
    const data = await apiClient(`/quiz/subject/${subjectId}?limit=10${setQuery}${premiumQuery}`, { token });
    setSubject(data.subject);
    setQuestions(data.questions);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([
      apiClient(`/quiz/subject/${subjectId}/sets`, { token }),
      apiClient(`/quiz/subject/${subjectId}/premium-insights`, { token }).catch(() => null)
    ])
      .then(async ([data, premiumInfo]) => {
        setSubject(data.subject);
        setQuizSets(data.sets || []);
        setPremiumAvailable(Boolean(premiumInfo && premiumInfo.premiumQuestionCount > 0));

        if (data.sets && data.sets.length === 1) {
          const only = data.sets[0].key;
          setSelectedSetKey(only);
          await loadQuestions(only, 'standard');
        }
      })
      .catch((e) => setError(e.message || 'Erreur de chargement du quiz'));
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

  const startSet = async (setKey) => {
    setSelectedSetKey(setKey);
    try {
      await loadQuestions(setKey, mode);
    } catch (e) {
      setError(e.message || 'Erreur de chargement des questions');
    }
  };

  const onModeChange = async (nextMode) => {
    setMode(nextMode);
    if (!selectedSetKey) return;

    try {
      await loadQuestions(selectedSetKey, nextMode);
    } catch (e) {
      setError(e.message || 'Erreur de chargement des questions');
    }
  };

  const submitQuiz = async () => {
    if (loading || questions.length === 0) return;
    setLoading(true);
    setError('');

    const token = getToken();
    const payload = {
      subjectId: Number(questions[0].subjectId),
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
      setError('Répondez au moins à une question avant soumission.');
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
      setError(e.message || 'Échec de la soumission du quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">
          Quiz {subject ? `- ${subject.name}` : ''} {selectedSet ? `(${selectedSet.name})` : ''}
        </h1>

        <div className="flex gap-2">
          <button
            className={mode === 'standard' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => onModeChange('standard')}
          >
            Standard
          </button>
          {premiumAvailable ? (
            <button
              className={mode === 'premium' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onModeChange('premium')}
            >
              Premium
            </button>
          ) : null}
        </div>

        {questions.length > 0 ? (
          <p className="rounded-lg bg-accent/20 px-3 py-2 text-sm font-semibold text-brand-900">Temps restant : {timeLeft}s</p>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      {questions.length === 0 && quizSets.length > 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {quizSets.map((setItem) => (
            <article key={setItem.key} className="card">
              <h2 className="text-lg font-semibold text-brand-900">{setItem.name}</h2>
              <p className="mt-2 text-sm text-brand-700">{setItem.questionCount} questions disponibles</p>
              <button className="btn-primary mt-4" onClick={() => startSet(setItem.key)}>Commencer ce quiz</button>
            </article>
          ))}
        </div>
      ) : null}

      {questions.length > 0 ? (
        <>
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
        </>
      ) : null}
    </section>
  );
}