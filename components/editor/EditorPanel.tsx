"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Eye, FileCode2, FileText, Lock, RotateCcw, WrapText } from "lucide-react";
import type { Lesson } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(
  () => import("@/components/editor/MonacoEditor").then((m) => m.MonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-mist-500">
        Loading editor…
      </div>
    ),
  }
);

export function EditorPanel({
  lesson,
  files,
  activePath,
  onSelectFile,
  onChangeFile,
  onReset,
  onApplySolution,
}: {
  lesson: Lesson;
  files: Record<string, string>;
  activePath: string;
  onSelectFile: (path: string) => void;
  onChangeFile: (path: string, code: string) => void;
  onReset: () => void;
  onApplySolution: () => void;
}) {
  const [formatSignal, setFormatSignal] = useState(0);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const visibleFiles = lesson.files.filter((f) => !f.hidden);
  const activeMeta = lesson.files.find((f) => f.path === activePath);

  return (
    <div className="flex h-full min-w-0">
      {/* File explorer */}
      <aside className="flex w-44 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-mist-500">
          Files
        </p>
        <nav className="min-h-0 flex-1 overflow-y-auto px-1.5">
          {visibleFiles.map((f) => {
            const name = f.path.slice(1);
            const isMd = f.path.endsWith(".md");
            return (
              <button
                key={f.path}
                onClick={() => onSelectFile(f.path)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-mono text-[11.5px] transition-colors",
                  activePath === f.path
                    ? "bg-ink-700 text-ember-300"
                    : "text-mist-300 hover:bg-ink-800"
                )}
              >
                {isMd ? <FileText size={12} /> : <FileCode2 size={12} />}
                <span className="truncate">{name}</span>
                {f.readOnly && <Lock size={10} className="ml-auto shrink-0 text-mist-500" />}
              </button>
            );
          })}
        </nav>
        <div className="space-y-1.5 border-t border-ink-700 p-2">
          <Button size="sm" variant="outline" className="w-full" onClick={() => setSolutionOpen(true)}>
            <Eye size={12} /> Solution
          </Button>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={12} /> Reset lesson
          </Button>
        </div>
      </aside>

      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center border-b border-ink-700 bg-ink-900">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
            {visibleFiles.map((f) => (
              <button
                key={f.path}
                onClick={() => onSelectFile(f.path)}
                className={cn(
                  "shrink-0 border-r border-ink-700 px-3 py-2 font-mono text-[11.5px] transition-colors",
                  activePath === f.path
                    ? "bg-ink-850 text-mist-100"
                    : "text-mist-400 hover:text-mist-200"
                )}
              >
                {f.path.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFormatSignal((s) => s + 1)}
            title="Format code"
            className="flex shrink-0 items-center gap-1 px-3 py-2 text-[11px] text-mist-400 hover:text-ember-300"
          >
            <WrapText size={12} /> Format
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <MonacoEditor
            path={activePath}
            value={files[activePath] ?? ""}
            readOnly={activeMeta?.readOnly}
            onChange={(code) => onChangeFile(activePath, code)}
            formatSignal={formatSignal}
          />
        </div>
        {activeMeta?.readOnly && (
          <p className="shrink-0 border-t border-ink-700 bg-ink-900 px-3 py-1.5 text-[11px] text-mist-500">
            This file is read-only — it&apos;s part of the lesson setup.
          </p>
        )}
      </div>

      {/* Solution dialog */}
      <Dialog open={solutionOpen} onClose={() => setSolutionOpen(false)} title="Solution" wide>
        <p className="mb-3 text-xs text-mist-400">
          Try the exercises yourself first — reading a solution teaches a fraction of what writing
          one does.
        </p>
        <div className="space-y-4">
          {lesson.solutionFiles
            .filter((f) => !f.readOnly)
            .map((f) => (
              <div key={f.path}>
                <p className="mb-1 font-mono text-[11px] text-ember-400">{f.path.slice(1)}</p>
                <pre className="overflow-x-auto rounded-lg border border-ink-600 bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-mist-200">
                  {f.code}
                </pre>
              </div>
            ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              onApplySolution();
              setSolutionOpen(false);
            }}
          >
            Apply solution to editor
          </Button>
          <Button variant="ghost" onClick={() => setSolutionOpen(false)}>
            Keep my code
          </Button>
        </div>
      </Dialog>

      {/* Reset confirm */}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset lesson code?">
        <p className="text-[13px] text-mist-300">
          This restores every file to its starter code. Your current edits will be lost.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="danger"
            onClick={() => {
              onReset();
              setConfirmReset(false);
            }}
          >
            Reset files
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
