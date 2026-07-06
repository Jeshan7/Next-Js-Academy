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
 * Local-first progress tracking. localStorage gives instant reads/writes
 * offline; every change is also persisted to data/progress.json on disk
 * (via /api/progress) so progress survives across browsers and is a real
 * file you can back up, not just per-browser storage.
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

function readStorage(): ProgressState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    // corrupted storage — start fresh
  }
  return null;
}

async function readFile(): Promise<ProgressState | null> {
  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    const data = await res.json();
    return data ? { ...EMPTY, ...data } : null;
  } catch {
    return null;
  }
}

function writeFile(state: ProgressState) {
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  }).catch(() => {
    // offline/server unavailable — localStorage still has it
  });
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage();
    if (stored) setState(stored);

    // The JSON file on disk is the durable source of truth once it's
    // reachable; it wins over localStorage if it has data (e.g. progress
    // synced from another browser), but localStorage still renders first
    // so the UI isn't blank while this request is in flight.
    readFile().then((fromFile) => {
      if (fromFile) {
        setState(fromFile);
        try {
          window.localStorage.setItem(KEY, JSON.stringify(fromFile));
        } catch {}
      } else if (stored) {
        writeFile(stored);
      }
      setHydrated(true);
    });
  }, []);

  // Child components (e.g. LessonClient) call progress-mutating callbacks
  // from their own mount effects, which React fires *before* this
  // provider's own hydration effect above. Merging against localStorage
  // directly (instead of trusting the in-memory `prev`) means those early
  // calls still land on top of whatever was actually saved, rather than
  // clobbering it with writes based on the not-yet-hydrated empty state.
  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const base = readStorage() ?? prev;
      const next = fn(base);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable — keep in-memory state
      }
      writeFile(next);
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

  const isUnlocked = useCallback((_lessonId: string) => true, []);

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
    writeFile(EMPTY);
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
