"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lightbulb, XCircle } from "lucide-react";
import type { Exercise, ValidationResult } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/learn/MarkdownView";
import { cn } from "@/lib/utils";

const difficultyTone = { easy: "green", medium: "ember", hard: "red" } as const;

export function ExerciseList({
  exercises,
  results,
  completed,
  onCheck,
}: {
  exercises: Exercise[];
  results: Record<string, ValidationResult[]>;
  completed: Record<string, boolean>;
  onCheck: (exercise: Exercise) => void;
}) {
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {exercises.map((ex, i) => {
        const res = results[ex.id];
        const allPassed = res && res.length > 0 && res.every((r) => r.passed);
        const done = completed[ex.id] || allPassed;
        return (
          <div key={ex.id} className="rounded-xl border border-ink-600 bg-ink-850 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {done ? (
                <CheckCircle2 size={16} className="text-signal-green" />
              ) : (
                <Circle size={16} className="text-mist-500" />
              )}
              <h3 className="text-sm font-semibold text-mist-100">
                Exercise {i + 1}: {ex.title}
              </h3>
              <Badge tone={difficultyTone[ex.difficulty]}>{ex.difficulty}</Badge>
            </div>
            <MarkdownView content={ex.instructions} />
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={() => onCheck(ex)}>
                Check my solution
              </Button>
              {ex.hint && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpenHints((h) => ({ ...h, [ex.id]: !h[ex.id] }))}
                >
                  <Lightbulb size={13} /> Hint
                </Button>
              )}
            </div>
            {openHints[ex.id] && ex.hint && (
              <p className="mt-2 rounded-lg bg-ink-800 p-3 font-mono text-[12px] text-ember-300">
                {ex.hint}
              </p>
            )}
            {res && (
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {res.map((r, ri) => (
                  <li
                    key={ri}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-1.5 text-[12.5px]",
                      r.passed ? "bg-signal-green/10 text-signal-green" : "bg-signal-red/10 text-signal-red"
                    )}
                  >
                    {r.passed ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="mt-0.5 shrink-0" />
                    )}
                    <span>
                      {r.rule.message}
                      {!r.passed && " — not yet"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
