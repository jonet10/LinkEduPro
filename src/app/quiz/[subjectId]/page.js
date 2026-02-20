"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const QUIZ_SECONDS = 300;

function shuffleWithIndexMap(options = []) {
  const indexed = options.map((label, originalIndex) => ({ label, originalIndex }));
  for (let i = indexed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return {
    options: indexed.map((item) => item.label),
    optionIndexMap: indexed.map((item) => item.originalIndex)
  };
}

function sameOrder(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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
  const [reviewItems, setReviewItems] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const lastOptionOrderRef = useRef({});
  const currentStudent = useMemo(() => getStudent(), []);

  const selectedSet = quizSets.find((s) => s.key === selectedSetKey) || null;
  const shouldShowExamHeader = Boolean(subject?.name) && (
    String(subject.name).toLowerCase().includes('physique') ||
    String(subject.name).toLowerCase().includes('chimie') ||
    String(subject.name).toLowerCase().includes('svt') ||
    String(subject.name).toLowerCase().includes('histoire') ||
    String(subject.name).toLowerCase().includes('connaissance')
  );
  const trackLabel = String(currentStudent?.nsivTrack || 'ORDINAIRE').toUpperCase();
  const filiereLabel = trackLabel === 'SMP' || trackLabel === 'SVT'
    ? 'SMP/SVT'
    : trackLabel === 'SES' || trackLabel === 'LLA'
      ? 'SES/LLA'
      : 'Ordinaire';
  const examMatterLabel = String(subject?.name || '').toLowerCase().includes('chimie')
    ? 'Chimie'
    : String(subject?.name || '').toLowerCase().includes('svt')
      ? 'SVT'
    : String(subject?.name || '').toLowerCase().includes('histoire')
      ? 'Histoire-Geographie'
      : String(subject?.name || '').toLowerCase().includes('connaissance')
        ? 'Connaissance generale'
        : 'Physique';

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
    setQuestions(
      (data.questions || []).map((question) => {
        let shuffled = shuffleWithIndexMap(question.options || []);
        const previousOrder = lastOptionOrderRef.current[question.id];

        // Force a different order from the previous opening of the same question.
        if ((question.options || []).length > 1 && sameOrder(shuffled.optionIndexMap, previousOrder)) {
          const remixed = [...shuffled.optionIndexMap];
          [remixed[0], remixed[1]] = [remixed[1], remixed[0]];
          shuffled = {
            optionIndexMap: remixed,
            options: remixed.map((idx) => (question.options || [])[idx])
          };
        }

        lastOptionOrderRef.current[question.id] = shuffled.optionIndexMap;
        return {
          ...question,
          options: shuffled.options,
          optionIndexMap: shuffled.optionIndexMap
        };
      })
    );
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
          selectedOption: q.optionIndexMap?.[answers[q.id]] ?? answers[q.id]
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
      setReviewItems(Array.isArray(result.review) ? result.review : []);
      setShowReview(false);
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

      {shouldShowExamHeader ? (
        <div className="card mb-4 border-2 border-brand-200">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
            Ministere de l Education Nationale et de la Formation Professionnelle (MENFP)
          </p>
          <h2 className="mt-2 text-center text-lg font-black text-brand-900">
            Baccalaureat d Enseignement General - Simulation d examen
          </h2>
          <p className="mt-1 text-center text-sm text-brand-700">
            Examens de fin d etudes secondaires | Session d entrainement
          </p>
          <div className="mt-3 grid gap-2 text-sm text-brand-800 sm:grid-cols-2">
            <p><span className="font-semibold">Matiere:</span> {examMatterLabel}</p>
            <p><span className="font-semibold">Filiere:</span> {filiereLabel}</p>
            <p><span className="font-semibold">Type:</span> Annales et questions de cours des examens passes</p>
            <p><span className="font-semibold">Niveau:</span> NSIV</p>
          </div>
        </div>
      ) : null}

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
                setReviewItems([]);
                setShowReview(false);
                if (selectedSetKey) await startSet(selectedSetKey);
              }}
            >
              Refaire ce quiz
            </button>
            {reviewItems.length > 0 ? (
              <button className="btn-secondary" onClick={() => setShowReview((prev) => !prev)}>
                {showReview ? 'Masquer le corrige' : 'Afficher le corrige'}
              </button>
            ) : null}
          </div>
          {shareInfo ? <p className="text-xs text-brand-700">{shareInfo}</p> : null}
        </article>
      ) : null}

      {quizResult && reviewItems.length > 0 && showReview ? (
        <article className="card mt-4 space-y-3">
          <h2 className="text-xl font-semibold text-brand-900">Corrige detaille</h2>
          <p className="text-sm text-brand-700">
            Verifie tes reponses et compare-les avec les bonnes reponses.
          </p>
          <div className="space-y-4">
            {reviewItems.map((item, idx) => (
              <div key={`${item.questionId}_${idx}`} className="rounded-lg border border-brand-100 p-3">
                <p className="font-semibold text-brand-900">{idx + 1}. {item.prompt}</p>
                <p className={`mt-1 text-sm font-semibold ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {item.isCorrect ? 'Bonne reponse' : 'Reponse incorrecte'}
                </p>
                <div className="mt-3 space-y-2">
                  {(item.options || []).map((option, optionIndex) => {
                    const isSelected = item.selectedOption === optionIndex;
                    const isCorrectOption = item.correctOption === optionIndex;
                    const optionClass = isCorrectOption
                      ? 'border-green-400 bg-green-50'
                      : isSelected
                        ? 'border-red-300 bg-red-50'
                        : 'border-brand-100';

                    return (
                      <div key={optionIndex} className={`rounded border px-3 py-2 text-sm ${optionClass}`}>
                        <span>{option}</span>
                        {isSelected ? <span className="ml-2 text-xs font-semibold text-brand-700">(Ta reponse)</span> : null}
                        {isCorrectOption ? <span className="ml-2 text-xs font-semibold text-green-700">(Bonne reponse)</span> : null}
                      </div>
                    );
                  })}
                </div>
                {item.explanation ? (
                  <p className="mt-2 text-sm text-brand-700">Explication: {item.explanation}</p>
                ) : null}
              </div>
            ))}
          </div>
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
