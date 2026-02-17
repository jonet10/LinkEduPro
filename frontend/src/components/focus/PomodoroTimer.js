"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

function formatTime(totalSeconds) {
  const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const sec = String(totalSeconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

export default function PomodoroTimer() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [cycleType, setCycleType] = useState('WORK');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const intervalRef = useRef(null);

  const totalSeconds = useMemo(
    () => (cycleType === 'WORK' ? workDuration : breakDuration) * 60,
    [workDuration, breakDuration, cycleType]
  );

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  useEffect(() => {
    if (!running) return undefined;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (running) return;
    setSecondsLeft(totalSeconds);
  }, [totalSeconds, running]);

  async function startSession() {
    setError('');
    setInfo('');
    try {
      const token = getToken();
      if (!token) return;

      const data = await apiClient('/pomodoro/start', {
        method: 'POST',
        token,
        body: JSON.stringify({ workDuration, breakDuration, cycleType })
      });

      setSessionId(data.session.id);
      setRunning(true);
      setInfo(cycleType === 'WORK' ? 'Session de travail démarrée.' : 'Pause démarrée.');
    } catch (e) {
      setError(e.message || 'Impossible de démarrer la session.');
    }
  }

  async function stopSession() {
    setError('');
    setInfo('');
    try {
      const token = getToken();
      if (!token) return;

      const data = await apiClient('/pomodoro/stop', {
        method: 'POST',
        token,
        body: JSON.stringify({ sessionId })
      });

      setRunning(false);
      setSessionId(null);

      if (data.session.cycleType === 'WORK') {
        setCycleType('BREAK');
        setSecondsLeft(breakDuration * 60);
      } else {
        setCycleType('WORK');
        setSecondsLeft(workDuration * 60);
      }

      setInfo('Session enregistrée avec succès.');
    } catch (e) {
      setError(e.message || 'Impossible d’arrêter la session.');
    }
  }

  function resetSession() {
    setRunning(false);
    setSessionId(null);
    clearInterval(intervalRef.current);
    setSecondsLeft(totalSeconds);
  }

  return (
    <article className="card space-y-4">
      <h2 className="text-xl font-semibold text-brand-900">Pomodoro Timer</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-brand-700">
          Travail (minutes)
          <input
            type="number"
            min="5"
            max="180"
            className="input mt-1"
            value={workDuration}
            disabled={running}
            onChange={(e) => setWorkDuration(Number(e.target.value || 25))}
          />
        </label>
        <label className="text-sm text-brand-700">
          Pause (minutes)
          <input
            type="number"
            min="1"
            max="60"
            className="input mt-1"
            value={breakDuration}
            disabled={running}
            onChange={(e) => setBreakDuration(Number(e.target.value || 5))}
          />
        </label>
      </div>

      <div className="rounded-xl border border-brand-100 p-4">
        <p className="text-sm text-brand-700">Cycle actuel: {cycleType === 'WORK' ? 'Travail' : 'Pause'}</p>
        <p className="mt-1 text-4xl font-black text-brand-900">{formatTime(secondsLeft)}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-brand-100">
          <div className="h-full bg-brand-500" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <button type="button" className="btn-primary" onClick={startSession}>Start</button>
        ) : (
          <button type="button" className="btn-secondary" onClick={stopSession}>Stop</button>
        )}
        <button type="button" className="btn-secondary" onClick={resetSession}>Reset</button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}
    </article>
  );
}
