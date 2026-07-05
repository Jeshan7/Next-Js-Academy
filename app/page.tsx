"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { curriculum, orderedLessons } from "@/lessons";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const progress = useProgress();

  const continueTarget =
    orderedLessons.find((l) => l.lesson.id === progress.currentLesson && !progress.completedLessons[l.lesson.id]) ??
    orderedLessons.find((l) => !progress.completedLessons[l.lesson.id]) ??
    orderedLessons[0];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-400">
          Foundations → Production
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-mist-100">
          Learn Next.js the way a senior engineer would explain it.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist-400">
          Every lesson pairs deep, first-principles theory with a real code editor and a live
          sandbox — no accounts, no cloud, works fully offline once installed.
        </p>

        {continueTarget && (
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-ember-500/30 bg-ember-500/5 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-ember-400">
                {progress.completedLessons[continueTarget.lesson.id] ? "Review" : "Continue learning"}
              </p>
              <p className="mt-1 text-base font-semibold text-mist-100">
                {continueTarget.lesson.title}
              </p>
              <p className="text-[12.5px] text-mist-400">{continueTarget.module.title}</p>
            </div>
            <Link href={`/learn/${continueTarget.module.id}/${continueTarget.lesson.id}`}>
              <Button>
                {progress.completionPercent === 0 ? "Start course" : "Continue"} <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 text-[12.5px] text-mist-400">
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-ember-400" /> {progress.xp} XP earned
          </span>
          <span>·</span>
          <span>{progress.completionPercent}% of the course complete</span>
        </div>

        <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-widest text-mist-400">
          Course map
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {curriculum.map((mod) => {
            const doneCount = mod.lessons.filter((l) => progress.completedLessons[l.id]).length;
            const pct = mod.lessons.length ? Math.round((doneCount / mod.lessons.length) * 100) : 0;
            const firstLesson = mod.lessons[0];
            const card = (
              <div className="flex h-full flex-col rounded-xl border border-ink-600 bg-ink-850 p-4 transition-colors hover:border-ember-500/40">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-mist-100">{mod.title}</h3>
                  {mod.comingSoon ? (
                    <Badge tone="neutral">Phase 2</Badge>
                  ) : (
                    <Badge tone="ember">
                      {doneCount}/{mod.lessons.length}
                    </Badge>
                  )}
                </div>
                <p className="flex-1 text-[12.5px] leading-relaxed text-mist-400">{mod.description}</p>
                {!mod.comingSoon && (
                  <div className="mt-3">
                    <ProgressBar value={pct} />
                  </div>
                )}
                {mod.comingSoon && (
                  <ul className="mt-2 space-y-1 text-[11.5px] text-mist-500">
                    {mod.plannedLessons?.slice(0, 3).map((t) => (
                      <li key={t} className="flex items-center gap-1.5">
                        <BookOpen size={11} /> {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
            return mod.comingSoon || !firstLesson ? (
              <div key={mod.id}>{card}</div>
            ) : (
              <Link key={mod.id} href={`/learn/${mod.id}/${firstLesson.id}`}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
