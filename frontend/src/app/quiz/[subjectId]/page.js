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
  const [quizResult, setQuizResult] = useState(null);
  const [shareInfo, setShareInfo] = useState('');
  const [likedQuiz, setLikedQuiz] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

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
      const result = await apiClient('/quiz/submit', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      setQuizResult(result);
      setQuestions([]);
      setShareInfo('');
    } catch (e) {
      setError(e.message || 'Échec de la soumission du quiz');
    } finally {
      setLoading(false);
    }
  };

  const shareQuizResult = async () => {
    if (!quizResult) return;

    const subjectName = subject?.name || 'ce quiz';
    const text = `J'ai obtenu ${quizResult.percentage}% sur ${subjectName} avec LinkEduPro. Rejoins-moi pour t'entrainer !`;
    const link = `${window.location.origin}/register`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mon resultat LinkEduPro',
          text,
          url: link
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${link}`);
      }
      setShareInfo('Partage pret.');
    } catch (_) {
      setShareInfo('Partage non disponible sur cet appareil.');
    }
  };

  const toggleQuizLike = async () => {
    if (!quizResult?.attemptId || liking) return;
    const token = getToken();
    if (!token) return;

    setLiking(true);
    try {
      const data = await apiClient(`/quiz/attempt/${quizResult.attemptId}/like-toggle`, {
        method: 'POST',
        token
      });
      setLikedQuiz(Boolean(data.likedByMe));
      setLikesCount(Number(data.likesCount || 0));
    } catch (_) {
      // No-op: keep current UI state if network fails.
    } finally {
      setLiking(false);
    }
  };

  useEffect(() => {
    if (!quizResult?.attemptId) return;
    const token = getToken();
    if (!token) return;

    apiClient(`/quiz/attempt/${quizResult.attemptId}/like-state`, { token })
      .then((data) => {
        setLikedQuiz(Boolean(data.likedByMe));
        setLikesCount(Number(data.likesCount || 0));
      })
      .catch(() => {
        setLikedQuiz(Boolean(quizResult.likedByMe));
        setLikesCount(Number(quizResult.likesCount || 0));
      });
  }, [quizResult]);

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

      {quizResult ? (
        <article className="card mt-4 space-y-3">
          <h2 className="text-xl font-semibold text-brand-900">Quiz termine</h2>
          <p className="text-sm text-brand-700">
            Ton score: <span className="font-semibold">{quizResult.score}/{quizResult.totalQuestions}</span> ({quizResult.percentage}%)
          </p>
          <p className="text-sm text-brand-700">Tu peux aimer ce quiz et partager ton résultat avec tes amis.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={toggleQuizLike} disabled={liking}>
              {likedQuiz ? '❤️ J’aime ce quiz' : '🤍 J’aime ce quiz'} ({likesCount})
            </button>
            <button className="btn-secondary" onClick={shareQuizResult}>Partager avec mes amis</button>
            <button className="btn-primary" onClick={() => router.push('/progress')}>Voir mes progres</button>
            <button
              className="btn-secondary"
              onClick={async () => {
                setQuizResult(null);
                if (selectedSetKey) await startSet(selectedSetKey);
              }}
            >
              Refaire ce quiz
            </button>
          </div>
          {shareInfo ? <p className="text-xs text-brand-700">{shareInfo}</p> : null}
        </article>
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
