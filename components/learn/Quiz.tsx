"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const typeLabels: Record<QuizQuestion["type"], string> = {
  mcq: "Multiple choice",
  tf: "True or false",
  "code-prediction": "Predict the output",
  debugging: "Find the bug",
};

export function Quiz({
  questions,
  onSubmit,
  bestScore,
}: {
  questions: QuizQuestion[];
  onSubmit: (correct: number, total: number) => void;
  bestScore?: { correct: number; total: number };
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const correct = questions.filter((q) => answers[q.id] === q.answerIndex).length;

  function submit() {
    setSubmitted(true);
    onSubmit(correct, questions.length);
  }

  function retry() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-5">
      {bestScore && !submitted && (
        <p className="text-xs text-mist-400">
          Best score so far: {bestScore.correct}/{bestScore.total}
        </p>
      )}
      {questions.map((q, qi) => {
        const chosen = answers[q.id];
        return (
          <div key={q.id} className="rounded-xl border border-ink-600 bg-ink-850 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="ember">{typeLabels[q.type]}</Badge>
              <span className="text-xs text-mist-500">
                Question {qi + 1} of {questions.length}
              </span>
            </div>
            <p className="mb-3 text-[13.5px] font-medium text-mist-100">{q.question}</p>
            {q.code && (
              <pre className="mb-3 overflow-x-auto rounded-lg border border-ink-600 bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-mist-200">
                {q.code}
              </pre>
            )}
            <div className="space-y-1.5" role="radiogroup" aria-label={q.question}>
              {q.options.map((opt, oi) => {
                const isChosen = chosen === oi;
                const isCorrect = q.answerIndex === oi;
                return (
                  <button
                    key={oi}
                    role="radio"
                    aria-checked={isChosen}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                      submitted && isCorrect
                        ? "border-signal-green/60 bg-signal-green/10 text-mist-100"
                        : submitted && isChosen && !isCorrect
                          ? "border-signal-red/60 bg-signal-red/10 text-mist-200"
                          : isChosen
                            ? "border-ember-500/70 bg-ember-500/10 text-mist-100"
                            : "border-ink-600 text-mist-300 hover:border-ink-600 hover:bg-ink-800"
                    )}
                  >
                    {submitted && isCorrect && (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-signal-green" />
                    )}
                    {submitted && isChosen && !isCorrect && (
                      <XCircle size={15} className="mt-0.5 shrink-0 text-signal-red" />
                    )}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-3 rounded-lg bg-ink-800 p-3 text-[12.5px] leading-relaxed text-mist-300">
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <Button onClick={submit} disabled={!allAnswered}>
          Submit answers
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Badge tone={correct === questions.length ? "green" : correct >= questions.length / 2 ? "ember" : "red"}>
            Score: {correct}/{questions.length}
          </Badge>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
