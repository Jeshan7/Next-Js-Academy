"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Lock,
  Search,
  Sparkles,
} from "lucide-react";
import { curriculum } from "@/lessons";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const progress = useProgress();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [progressOpen, setProgressOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!query.trim()) return curriculum;
    const q = query.toLowerCase();
    return curriculum
      .map((mod) => ({
        ...mod,
        lessons: mod.lessons.filter((l) => l.title.toLowerCase().includes(q)),
      }))
      .filter((mod) => mod.lessons.length > 0 || mod.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
      <div className="shrink-0 border-b border-ink-700 p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-500 font-mono text-sm font-bold text-ink-950">
            λ
          </span>
          <span className="text-sm font-bold tracking-tight text-mist-100">Next.js Academy</span>
        </Link>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => setProgressOpen((o) => !o)}
            className="flex w-full items-center justify-between text-[11px] text-mist-400 hover:text-mist-200"
            aria-expanded={progressOpen}
          >
            <span className="flex items-center gap-1">
              <ChevronDown
                size={12}
                className={cn("shrink-0 transition-transform", !progressOpen && "-rotate-90")}
              />
              Course progress
            </span>
            <span className="font-mono text-ember-400">{progress.completionPercent}%</span>
          </button>
          {progressOpen && <ProgressBar value={progress.completionPercent} />}
        </div>

        {progressOpen && (
          <div className="mt-3 flex items-center gap-3 text-[11px] text-mist-400">
            <span className="flex items-center gap-1">
              <Sparkles size={12} className="text-ember-400" /> {progress.xp} XP
            </span>
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-ember-400" /> {progress.streak}-day streak
            </span>
          </div>
        )}

        <div className="relative mt-3">
          <Search size={13} className="absolute left-2.5 top-2.5 text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons"
            className="w-full rounded-lg border border-ink-600 bg-ink-850 py-1.5 pl-8 pr-2 text-[12.5px] text-mist-100 placeholder:text-mist-500 focus:border-ember-500/60 focus:outline-none"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {progress.recent.length > 0 && !query && (
          <div className="mb-4 px-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mist-500">
              Recently viewed
            </p>
            <div className="space-y-0.5">
              {progress.recent.slice(0, 3).map((lessonId) => {
                const found = curriculum
                  .flatMap((m) => m.lessons.map((l) => ({ mod: m, lesson: l })))
                  .find((x) => x.lesson.id === lessonId);
                if (!found) return null;
                return (
                  <Link
                    key={lessonId}
                    href={`/learn/${found.mod.id}/${found.lesson.id}`}
                    className="flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-[12px] text-mist-400 hover:bg-ink-800 hover:text-mist-200"
                  >
                    <Clock size={11} className="shrink-0" />
                    <span className="truncate">{found.lesson.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {filtered.map((mod) => {
          const isCollapsed = collapsed[mod.id];
          const doneCount = mod.lessons.filter((l) => progress.completedLessons[l.id]).length;
          return (
            <div key={mod.id} className="mb-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [mod.id]: !c[mod.id] }))}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-ink-800"
              >
                <ChevronDown
                  size={13}
                  className={cn("shrink-0 text-mist-500 transition-transform", isCollapsed && "-rotate-90")}
                />
                <span className="flex-1 truncate text-[12.5px] font-semibold text-mist-200">
                  {mod.title}
                </span>
                {mod.comingSoon ? (
                  <Badge tone="neutral">Soon</Badge>
                ) : (
                  <span className="font-mono text-[10px] text-mist-500">
                    {doneCount}/{mod.lessons.length}
                  </span>
                )}
              </button>

              {!isCollapsed && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-ink-700 pl-2.5">
                  {mod.comingSoon
                    ? mod.plannedLessons?.map((title) => (
                        <div
                          key={title}
                          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-mist-500"
                        >
                          <Lock size={11} className="shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                      ))
                    : mod.lessons.map((lesson) => {
                        const href = `/learn/${mod.id}/${lesson.id}`;
                        const active = pathname === href;
                        const done = progress.completedLessons[lesson.id];
                        const unlocked = progress.isUnlocked(lesson.id);
                        const content = (
                          <>
                            {done ? (
                              <CheckCircle2 size={13} className="shrink-0 text-signal-green" />
                            ) : unlocked ? (
                              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-mist-500" />
                            ) : (
                              <Lock size={12} className="shrink-0 text-mist-600" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </>
                        );
                        return unlocked ? (
                          <Link
                            key={lesson.id}
                            href={href}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors",
                              active
                                ? "bg-ember-500/10 text-ember-300"
                                : "text-mist-300 hover:bg-ink-800 hover:text-mist-100"
                            )}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            key={lesson.id}
                            className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-mist-600"
                            title="Complete the previous lesson to unlock"
                          >
                            {content}
                          </div>
                        );
                      })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
