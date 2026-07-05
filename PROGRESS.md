# Build Progress — Next.js Academy

Read this first when resuming in Claude Code. It's a snapshot of what exists,
what was verified, and exactly what's left, in priority order.

## Status: Phase 1 complete and verified

- `npm install` succeeds, `postinstall` copies React UMD to `public/vendor`.
- `npx tsc --noEmit` — clean, zero errors.
- `npx next build` — succeeds. All 6 lessons statically pre-render via
  `generateStaticParams`. Build output:
  - `/` — 2.34 kB (135 kB First Load JS)
  - `/learn/[moduleId]/[lessonId]` — 65 kB (197 kB First Load JS), 6 static paths
- `npm run lint` — clean, zero warnings/errors (added `eslint` +
  `eslint-config-next` as devDependencies; fixed one
  `react/no-unescaped-entities` error in `EditorPanel.tsx` along the way).
- Not yet run: `npm run dev` smoke test in an actual real browser (this
  build environment has no browser). **Do this first in Claude Code** —
  click through a lesson, run the sandbox, submit a quiz, check an exercise,
  resize panels. Typecheck/lint/build all passing is a good sign but is not
  a substitute for actually seeing the Monaco editor and sandbox iframe
  render.

## What's built

**Architecture (all working, per README.md):**
- App Router pages: `/` (dashboard) and `/learn/[moduleId]/[lessonId]`
- Sidebar with search, module/lesson tree, lock/unlock, progress bar, XP,
  streak, recently-viewed
- Resizable 3-pane workspace (theory / editor / preview) via
  `react-resizable-panels`
- Monaco editor wired for fully offline TS/TSX IntelliSense (local workers,
  no CDN), file explorer, tabs, format, reset-with-confirmation, solution
  viewer dialog
- Live sandbox: `@babel/standalone` compiles learner TSX in-browser →
  same-origin `srcdoc` iframe → custom CommonJS module registry → real React
  UMD + shims for `next/link`, `next/navigation` (`useRouter`, `usePathname`,
  `useParams`), `next/image`. Console/error capture via `postMessage`.
- Deterministic validation engine (`lib/sandbox/validate.ts`): code-includes,
  code-regex, dom-exists, dom-text, dom-count rules. Zero AI involved.
- Quiz engine: MCQ, true/false, code-prediction, debugging types; scored,
  retryable, feeds XP and lesson completion.
- Progress tracking: `lib/progress.tsx`, localStorage-backed, XP/streak/
  quiz-scores/exercise-completion/sequential-unlock/completion-percent.
- 6 original animated SVG diagrams (`components/learn/diagrams/index.tsx`),
  referenced from lesson markdown via `::diagram{key}` syntax.
- "Night terminal" design system in `tailwind.config.ts` (ink-*/mist-*/
  ember-*/signal-* tokens) — see `frontend-design` skill notes below if you
  extend the UI.

**Curriculum — 6 complete lessons across 2 modules** (all with theory, a
diagram, 3 exercises with validation + hints, a 5-question quiz, key
takeaways, cheat sheet, 5-6 interview questions):

- `lessons/module-01/lesson-01.ts` — What is Next.js & why it exists
- `lessons/module-01/lesson-02.ts` — React essentials (components/props/state)
- `lessons/module-01/lesson-03.ts` — Project structure & App Router mental model
- `lessons/module-02/lesson-01.ts` — Navigation: Link, prefetching, useRouter
- `lessons/module-02/lesson-02.ts` — Layouts & nested layouts
- `lessons/module-02/lesson-03.ts` — Dynamic routes: [slug], params, not-found

Modules 3–7 (Rendering, Data & Caching, Mutations & Forms, Backend, Production)
exist in `lessons/index.ts` as `comingSoon: true` roadmap entries with
`plannedLessons` title lists — this drives the sidebar's "Phase 2" display.
No lesson content written yet for these.

## Immediate next steps (in priority order)

1. **Smoke-test in a real browser.** Run `npm run dev`, click through all 6
   lessons, verify: Monaco loads with IntelliSense, the sandbox iframe
   renders and updates on edit, console/error panel works, exercise checks
   pass/fail correctly, quiz submission awards XP and unlocks the next
   lesson, sidebar lock/unlock/search/recent all behave, panel resizing
   works, reset/solution dialogs work.
2. **Fix whatever the browser smoke test finds.** Likely candidates given
   what wasn't testable here:
   - Monaco worker URLs (`components/editor/MonacoEditor.tsx`) — webpack 5
     `new Worker(new URL(...))` syntax can be finicky; verify workers
     actually load (check DevTools Network/Console for worker 404s).
   - The `srcdoc` iframe's `sandbox="allow-scripts allow-same-origin"` —
     confirm same-origin `postMessage` and `contentDocument` access actually
     work as expected in a real Chromium/Firefox, not just in theory.
   - `EditorPanel`'s solution-merge logic (`mergeSolution` in
     `components/learn/LessonClient.tsx`) — verify it correctly overlays
     solution files onto starter files without breaking read-only files.
3. **Phase 2 curriculum**, one module at a time, matching the existing
   lesson shape exactly (see any `lessons/module-0X/lesson-0Y.ts` as the
   template — theory with `## sections` and `::diagram{key}` directives,
   starter + solution files, 3 exercises with validation + hint, 5-question
   quiz, keyTakeaways, cheatSheet, interviewQuestions):
   - Module 3 — Rendering: Server Components in depth, Client Components &
     the `"use client"` boundary, composition patterns across the boundary,
     static rendering & `generateStaticParams`, dynamic rendering &
     streaming with Suspense, `loading.tsx`/`error.tsx`
   - Module 4 — Data & Caching: data fetching in Server Components, request
     memoization & the data cache, revalidation (time-based + on-demand),
     the router cache model, parallel vs sequential fetching
   - Module 5 — Mutations & Forms: Server Actions, `useActionState` forms,
     `useOptimistic`, validation/error handling, a CRUD project
   - Module 6 — Backend in Next.js: Route Handlers, middleware, auth
     patterns, Prisma + PostgreSQL, an authenticated-dashboard project
   - Module 7 — Production: Metadata API & SEO, image/font/script
     optimization, testing, deployment, production architecture patterns

   New diagrams for these lessons go in
   `components/learn/diagrams/index.tsx` — add to `diagramRegistry` with a
   new key and reference it from theory markdown as `::diagram{key}`.

4. **Nice-to-haves, not blocking:** dark/light theme toggle (currently dark
   only, by design), lesson search ranking/fuzzy match, exporting progress
   as JSON, a "real project challenge" lesson type (mentioned in the
   original spec, not yet built as a distinct structure — currently folded
   into regular lessons' hardest exercise).

## Known trade-offs / decisions made

- **React 18, Next.js 14.2.35** (patched — was originally scaffolded on
  14.2.21, which npm flagged as vulnerable per Next's Dec 11 2025 security
  advisory; bumped before first successful build). If resuming much later,
  check `npm outdated` and re-verify no new advisories before shipping.
- **No Sandpack/WebContainers** — the original brief allowed either; this
  build uses a hand-rolled Babel-standalone + srcdoc-iframe sandbox instead,
  because it's the only approach that's fully offline with zero CDN calls
  and no WASM/service-worker complexity. Trade-off: the sandbox only
  supports a simulated Next.js runtime (see `framework.tsx` read-only files
  per-lesson), not a real Next.js dev server. This is called out explicitly
  in lesson theory ("The sandbox in this lesson...") so it doesn't read as
  a bug.
- **No shadcn/ui, Sandpack, Framer Motion, MDX** despite being mentioned in
  the original brief — dropped to keep the dependency surface small and
  fully offline-installable from npm registry only (see
  `network_configuration` — only npm/pypi/github domains are reachable in
  this build environment). All were replaceable with hand-rolled
  equivalents (Tailwind components instead of shadcn, plain markdown via
  `react-markdown` instead of MDX, CSS transitions instead of Framer
  Motion). Revisit if Claude Code's environment has broader network access
  and these are wanted for polish.
- **Quiz passing threshold is 60%** (`components/learn/TheoryPanel.tsx`) to
  mark a lesson complete and unlock the next one — arbitrary but
  reasonable; easy to tune in one place if it feels wrong once real users
  hit it.

## File index (for orientation)

See `README.md` "Project structure" section — kept in sync with this file.
