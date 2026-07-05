"use client";

import { useState } from "react";
import type { Exercise, Lesson, ValidationResult } from "@/types/lesson";
import { MarkdownView } from "@/components/learn/MarkdownView";
import { Quiz } from "@/components/learn/Quiz";
import { ExerciseList } from "@/components/learn/ExerciseList";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

const tabs = ["Learn", "Exercises", "Quiz", "Summary"] as const;
type Tab = (typeof tabs)[number];

export function TheoryPanel({
  lesson,
  exerciseResults,
  onCheckExercise,
}: {
  lesson: Lesson;
  exerciseResults: Record<string, ValidationResult[]>;
  onCheckExercise: (exercise: Exercise) => void;
}) {
  const [tab, setTab] = useState<Tab>("Learn");
  const progress = useProgress();

  const exerciseCompleted: Record<string, boolean> = {};
  for (const ex of lesson.exercises) {
    exerciseCompleted[ex.id] = !!progress.exercisesDone[`${lesson.id}:${ex.id}`];
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-ink-700 bg-ink-900 px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t
                ? "border border-b-0 border-ink-600 bg-ink-850 text-ember-400"
                : "text-mist-400 hover:text-mist-200"
            )}
          >
            {t}
            {t === "Exercises" && (
              <span className="ml-1 text-[10px] text-mist-500">
                {Object.values(exerciseCompleted).filter(Boolean).length}/{lesson.exercises.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 pt-4">
        {tab === "Learn" && (
          <>
            <h1 className="text-lg font-bold tracking-tight text-mist-100">{lesson.title}</h1>
            <p className="mt-1 text-[13px] text-mist-400">{lesson.description}</p>
            <MarkdownView content={lesson.theory} />
            <div className="mt-8 rounded-xl border border-ember-500/30 bg-ember-500/5 p-4">
              <p className="text-[13px] text-mist-200">
                Ready to practice? Head to the <strong className="text-ember-400">Exercises</strong> tab
                and use the editor on the right.
              </p>
            </div>
          </>
        )}

        {tab === "Exercises" && (
          <>
            <h2 className="mb-4 text-base font-bold text-mist-100">Exercises</h2>
            <ExerciseList
              exercises={lesson.exercises}
              results={exerciseResults}
              completed={exerciseCompleted}
              onCheck={onCheckExercise}
            />
          </>
        )}

        {tab === "Quiz" && (
          <>
            <h2 className="mb-4 text-base font-bold text-mist-100">Quiz</h2>
            <Quiz
              questions={lesson.quiz}
              bestScore={progress.quizScores[lesson.id]}
              onSubmit={(correct, total) => {
                progress.recordQuiz(lesson.id, correct, total);
                if (correct / total >= 0.6) progress.completeLesson(lesson.id);
              }}
            />
            <p className="mt-4 text-xs text-mist-500">
              Score 60% or more to complete the lesson and unlock the next one.
            </p>
          </>
        )}

        {tab === "Summary" && (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-base font-bold text-mist-100">Key takeaways</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-mist-200">
                {lesson.keyTakeaways.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-base font-bold text-mist-100">Cheat sheet</h2>
              <MarkdownView content={lesson.cheatSheet} />
            </section>
            <section>
              <h2 className="mb-2 text-base font-bold text-mist-100">Interview questions</h2>
              <ol className="list-decimal space-y-2 pl-5 text-[13.5px] text-mist-200">
                {lesson.interviewQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
