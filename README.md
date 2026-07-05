# Next.js Academy

An interactive, fully offline Next.js learning platform: theory panel, real Monaco
editor, live in-browser sandbox, deterministic exercise validation, and a quiz
engine — no AI APIs, no cloud services, no paid dependencies at runtime.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm install` also runs a `postinstall` script that copies the React UMD
builds into `public/vendor`. That's what the live-preview sandbox loads —
after the initial install, the whole app works with no network access.

## How it works

```
Sidebar | Theory Panel | Monaco Editor | Live Preview
```

- **Theory panel** (`components/learn/TheoryPanel.tsx`) renders lesson
  markdown (`components/learn/MarkdownView.tsx`), original animated SVG
  diagrams (`components/learn/diagrams`), an exercise list with deterministic
  validation, and a quiz engine.
- **Editor** (`components/editor`) is Monaco, configured to run its language
  workers locally via webpack 5's `new Worker(new URL(...))` syntax — no CDN
  loader, full IntelliSense offline.
- **Live preview** (`components/preview/PreviewPanel.tsx`) compiles the
  learner's TSX with `@babel/standalone` in the browser
  (`lib/sandbox/compile.ts`), then runs the result inside a same-origin
  `srcdoc` iframe with a small CommonJS module registry and Next.js client
  shims for `next/link`, `next/navigation`, and `next/image`
  (`lib/sandbox/runtime.ts`). Console output and runtime errors are
  forwarded to the parent via `postMessage`.
- **Validation** (`lib/sandbox/validate.ts`) is 100% deterministic: rules
  check the learner's source code (string/regex match) and the live preview's
  DOM (selector existence, text content, element counts). No AI involved.
- **Progress** (`lib/progress.tsx`) is a React context backed by
  `localStorage`: XP, streaks, quiz scores, exercise completion, and
  sequential lesson unlocking.

## Adding a lesson

Lessons are pure data — no application code changes needed.

1. Create `lessons/module-0X/lesson-0Y.ts` exporting a `Lesson` object
   (see `types/lesson.ts` for the shape, and any existing lesson file as a
   template).
2. Import it into `lessons/index.ts` and add it to the relevant module's
   `lessons` array (or create a new module entry).
3. If the lesson references `::diagram{your-key}` in its theory markdown,
   register a matching SVG component in
   `components/learn/diagrams/index.tsx`.

`generateStaticParams` in `app/learn/[moduleId]/[lessonId]/page.tsx` picks up
new lessons automatically at build time.

## Project structure

```
app/                      Routes (App Router)
  layout.tsx              Root layout, wraps everything in ProgressProvider
  page.tsx                Home dashboard / course map
  learn/[moduleId]/[lessonId]/page.tsx   Lesson page
components/
  ui/                      Button, Badge, ProgressBar, Dialog
  layout/                  AppShell, Sidebar, LessonWorkspace, LessonTopBar
  learn/                   TheoryPanel, MarkdownView, Quiz, ExerciseList,
                           diagrams/, LessonClient (wires state together)
  editor/                  MonacoEditor, EditorPanel (file explorer, tabs)
  preview/                 PreviewPanel (sandbox iframe + console)
lib/
  sandbox/                 compile.ts, runtime.ts, validate.ts
  progress.tsx             localStorage-backed progress context
  utils.ts                 cn() helper
lessons/
  module-01/, module-02/   Lesson data files
  index.ts                 Curriculum index, ordering, lookup
types/lesson.ts            Lesson/Module/Exercise/Quiz/Validation types
scripts/copy-vendor.mjs    Postinstall: copies React UMD into public/vendor
```

## Status

Phase 1 (architecture + 6 complete lessons across 2 modules) is done — see
`PROGRESS.md` for the detailed build log and what's next (Phase 2:
Rendering, Data & Caching, Mutations & Forms, Backend, Production).

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS ·
Monaco Editor · `@babel/standalone` · `react-resizable-panels` ·
`react-markdown` + `remark-gfm` · `lucide-react`
