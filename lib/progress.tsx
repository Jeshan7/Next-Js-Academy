"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { curriculum, orderedLessons } from "@/lessons";

/**
 * Local-first progress tracking. Everything lives in localStorage so the
 * platform works fully offline and per-machine.
 */

export interface ProgressState {
  completedLessons: Record<string, true>;
  quizScores: Record<string, { correct: number; total: number }>;
  exercisesDone: Record<string, true>; // key: `${lessonId}:${exerciseId}`
  xp: number;
  streak: number;
  lastActiveDay: string | null;
  recent: string[]; // lesson ids, most recent first
  currentLesson: string | null;
}

const EMPTY: ProgressState = {
  completedLessons: {},
  quizScores: {},
  exercisesDone: {},
  xp: 0,
  streak: 0,
  lastActiveDay: null,
  recent: [],
  currentLesson: null,
};

const KEY = "njsa-progress-v1";

interface ProgressApi extends ProgressState {
  hydrated: boolean;
  completeLesson: (lessonId: string) => void;
  recordQuiz: (lessonId: string, correct: number, total: number) => void;
  completeExercise: (lessonId: string, exerciseId: string) => void;
  visitLesson: (lessonId: string) => void;
  isUnlocked: (lessonId: string) => boolean;
  completionPercent: number;
  resetAll: () => void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      // corrupted storage — start fresh
    }
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable — keep in-memory state
      }
      return next;
    });
  }, []);

  const touchStreak = (prev: ProgressState): ProgressState => {
    const today = todayKey();
    if (prev.lastActiveDay === today) return prev;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = prev.lastActiveDay === yesterday ? prev.streak + 1 : 1;
    return { ...prev, streak, lastActiveDay: today };
  };

  const completeLesson = useCallback(
    (lessonId: string) =>
      update((prev) => {
        if (prev.completedLessons[lessonId]) return touchStreak(prev);
        return touchStreak({
          ...prev,
          completedLessons: { ...prev.completedLessons, [lessonId]: true },
          xp: prev.xp + 100,
        });
      }),
    [update]
  );

  const recordQuiz = useCallback(
    (lessonId: string, correct: number, total: number) =>
      update((prev) => {
        const previous = prev.quizScores[lessonId];
        const improved = !previous || correct > previous.correct;
        return touchStreak({
          ...prev,
          quizScores: improved
            ? { ...prev.quizScores, [lessonId]: { correct, total } }
            : prev.quizScores,
          xp: prev.xp + correct * 10,
        });
      }),
    [update]
  );

  const completeExercise = useCallback(
    (lessonId: string, exerciseId: string) =>
      update((prev) => {
        const key = `${lessonId}:${exerciseId}`;
        if (prev.exercisesDone[key]) return prev;
        return touchStreak({
          ...prev,
          exercisesDone: { ...prev.exercisesDone, [key]: true },
          xp: prev.xp + 25,
        });
      }),
    [update]
  );

  const visitLesson = useCallback(
    (lessonId: string) =>
      update((prev) =>
        touchStreak({
          ...prev,
          currentLesson: lessonId,
          recent: [lessonId, ...prev.recent.filter((id) => id !== lessonId)].slice(0, 5),
        })
      ),
    [update]
  );

  const isUnlocked = useCallback(
    (lessonId: string) => {
      const index = orderedLessons.findIndex((l) => l.lesson.id === lessonId);
      if (index <= 0) return true;
      const previous = orderedLessons[index - 1];
      return !!state.completedLessons[previous.lesson.id];
    },
    [state.completedLessons]
  );

  const completionPercent = useMemo(() => {
    const total = orderedLessons.length;
    if (total === 0) return 0;
    const done = orderedLessons.filter((l) => state.completedLessons[l.lesson.id]).length;
    return Math.round((done / total) * 100);
  }, [state.completedLessons]);

  const resetAll = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
    setState(EMPTY);
  }, []);

  const value: ProgressApi = {
    ...state,
    hydrated,
    completeLesson,
    recordQuiz,
    completeExercise,
    visitLesson,
    isUnlocked,
    completionPercent,
    resetAll,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}

export { curriculum };
