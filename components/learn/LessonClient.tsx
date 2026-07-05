"use client";

import { useEffect, useMemo, useState } from "react";
import type { Exercise, Lesson, ValidationResult } from "@/types/lesson";
import type { OrderedLesson } from "@/lessons";
import { LessonWorkspace } from "@/components/layout/LessonWorkspace";
import { LessonTopBar } from "@/components/layout/LessonTopBar";
import { TheoryPanel } from "@/components/learn/TheoryPanel";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { runValidation } from "@/lib/sandbox/validate";
import { useProgress } from "@/lib/progress";

function filesToRecord(files: Lesson["files"]) {
  return Object.fromEntries(files.map((f) => [f.path, f.code]));
}

export function LessonClient({
  moduleId,
  moduleTitle,
  lesson,
  prev,
  next,
}: {
  moduleId: string;
  moduleTitle: string;
  lesson: Lesson;
  prev: OrderedLesson | null;
  next: OrderedLesson | null;
}) {
  const progress = useProgress();
  const [files, setFiles] = useState(() => filesToRecord(lesson.files));
  const [activePath, setActivePath] = useState(lesson.files[0]?.path ?? "/App.tsx");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [results, setResults] = useState<Record<string, ValidationResult[]>>({});

  // Reset editor state whenever the lesson changes.
  useEffect(() => {
    setFiles(filesToRecord(lesson.files));
    setActivePath(lesson.files[0]?.path ?? "/App.tsx");
    setResults({});
    progress.visitLesson(lesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const entry = useMemo(() => {
    const appFile = lesson.files.find((f) => f.path === "/App.tsx");
    return appFile ? appFile.path : lesson.files[0]?.path ?? "/App.tsx";
  }, [lesson.files]);

  function handleCheckExercise(exercise: Exercise) {
    const res = runValidation(exercise.validation, files, previewDoc);
    setResults((prev) => ({ ...prev, [exercise.id]: res }));
    if (res.every((r) => r.passed)) {
      progress.completeExercise(lesson.id, exercise.id);
    }
  }

  return (
    <>
      <LessonTopBar
        moduleTitle={moduleTitle}
        lessonTitle={lesson.title}
        lessonId={lesson.id}
        prev={prev}
        next={next}
      />
      <LessonWorkspace
        theory={
          <TheoryPanel lesson={lesson} exerciseResults={results} onCheckExercise={handleCheckExercise} />
        }
        editor={
          <EditorPanel
            lesson={lesson}
            files={files}
            activePath={activePath}
            onSelectFile={setActivePath}
            onChangeFile={(path, code) => setFiles((f) => ({ ...f, [path]: code }))}
            onReset={() => setFiles(filesToRecord(lesson.files))}
            onApplySolution={() => setFiles(filesToRecord(mergeSolution(lesson)))}
          />
        }
        preview={<PreviewPanel files={files} entry={entry} onDocumentReady={setPreviewDoc} />}
      />
    </>
  );
}

/** Solutions may only list the files that changed; merge them over the starter set. */
function mergeSolution(lesson: Lesson) {
  const starter = filesToRecord(lesson.files);
  for (const f of lesson.solutionFiles) starter[f.path] = f.code;
  return lesson.files.map((f) => ({ ...f, code: starter[f.path] }));
}
