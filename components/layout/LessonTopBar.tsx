"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { OrderedLesson } from "@/lessons";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";

export function LessonTopBar({
  moduleTitle,
  lessonTitle,
  lessonId,
  prev,
  next,
}: {
  moduleTitle: string;
  lessonTitle: string;
  lessonId: string;
  prev: OrderedLesson | null;
  next: OrderedLesson | null;
}) {
  const progress = useProgress();
  const done = !!progress.completedLessons[lessonId];

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-mist-500">{moduleTitle}</p>
        <h1 className="truncate text-sm font-semibold text-mist-100">{lessonTitle}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {done && (
          <span className="flex items-center gap-1 text-[11px] text-signal-green">
            <CheckCircle2 size={13} /> Completed
          </span>
        )}
        {prev && (
          <Link href={`/learn/${prev.module.id}/${prev.lesson.id}`}>
            <Button size="sm" variant="ghost">
              <ChevronLeft size={13} /> Prev
            </Button>
          </Link>
        )}
        {next && (
          <Link href={`/learn/${next.module.id}/${next.lesson.id}`}>
            <Button size="sm" variant="outline">
              Next <ChevronRight size={13} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
