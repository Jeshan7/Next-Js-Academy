import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Lesson 3.5 showed \`<Suspense>\` and manual error boundaries. Next.js gives every route segment two special files that wire both of those up **automatically**: drop a \`loading.tsx\` next to a \`page.tsx\` and Next.js wraps that segment in a Suspense boundary for you; drop an \`error.tsx\` and it wraps the segment in an error boundary. No import, no JSX nesting required.

## Why this exists — the problem

Manually wrapping every route segment in \`<Suspense>\` and a custom error boundary component is repetitive, and easy to forget on some routes but not others. Next.js's file-system router already knows every segment's boundary — it can wire the Suspense/error-boundary plumbing itself, as long as you provide two conventionally-named files.

## How it works internally

### The file-to-boundary mapping

\`\`\`
app/dashboard/
├── layout.tsx     ← persists across navigations within /dashboard
├── error.tsx      ← becomes an error boundary around page.tsx (+ loading.tsx)
├── loading.tsx    ← becomes the <Suspense fallback> for page.tsx
└── page.tsx       ← the actual route content
\`\`\`

Conceptually, Next.js turns this into:

\`\`\`tsx
<Layout>
  <ErrorBoundary fallback={Error}>
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  </ErrorBoundary>
</Layout>
\`\`\`

::diagram{loading-error-boundaries}

### Granularity of loading states

Because this wiring is **per segment**, nested routes get nested boundaries automatically. \`/dashboard/settings\` can have its own \`loading.tsx\` that only covers the \`settings\` segment — navigating there shows \`dashboard/layout.tsx\`'s chrome immediately (already mounted) with just the \`settings\` content swapped for its fallback, not a blank page.

### error.tsx must be a Client Component

Error boundaries need interactivity — specifically the \`reset()\` function your fallback calls to attempt re-rendering the segment. That means \`error.tsx\` **always needs \`"use client"\`** at the top, even though most of your other route files stay server-only. This is one of the few files in the App Router that's a Client Component by convention, not by choice.

\`\`\`tsx
"use client"; // required

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
\`\`\`

### Error recovery with reset()

Calling \`reset()\` doesn't reload the page — it tells Next.js to try rendering the segment again, as if the error never happened. If the underlying cause is fixed (a flaky network blip, since-corrected data), the segment renders normally on the retry. If it fails again, \`error.tsx\` catches it again.

## Real-world example

A dashboard with three segments — \`overview\`, \`reports\`, \`settings\` — each gets its own \`loading.tsx\` (a skeleton matching that segment's layout) and can share or override \`error.tsx\`. A slow \`reports\` query shows its own skeleton while \`overview\`'s already-loaded content stays visible; a failed \`reports\` fetch shows a "Try again" button scoped to just that segment, without taking down the rest of the dashboard.

## The sandbox in this lesson

Since there's no real file-system router here, \`framework.tsx\`'s \`SegmentBoundary\` (read-only) simulates the wiring: it takes a \`page\`, a \`loading\` fallback, and an \`error\` fallback, and nests a real Suspense boundary and a real error boundary around \`page\` — the same shape Next.js builds from your three files.

## Common mistakes

- **Forgetting \`"use client"\` on error.tsx** — it needs interactivity for \`reset()\` and will fail to compile as a Server Component.
- **One \`loading.tsx\` at the root covering everything** — loses the granularity that makes nested segments feel responsive.
- **Treating \`reset()\` as a page reload** — it only re-attempts rendering the segment; it won't fix an error whose root cause is still present.

## Best practices

- Add a \`loading.tsx\` to any segment whose data fetch is slow enough to notice.
- Scope \`error.tsx\` to the segment where failures are likely (a flaky third-party API call), rather than only at the root.
- Design loading skeletons that roughly match the real content's shape, to avoid layout shift when it arrives.

## Performance considerations

This costs nothing extra at runtime beyond what manual Suspense/error boundaries would — the benefit is purely developer ergonomics and consistency: every segment gets the same automatic wiring, so none are accidentally left without a loading or error state.
`;

const frameworkCode = `// framework.tsx — READ-ONLY.
// Simulates the automatic file-to-boundary wiring Next.js builds from
// page.tsx + loading.tsx + error.tsx in a real route segment.
import React from "react";

export function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

interface Resource<T> {
  read(): T;
}

export function createResource<T>(promise: Promise<T>): Resource<T> {
  let status: "pending" | "success" | "error" = "pending";
  let result: T;
  let err: unknown;
  const suspender = promise.then(
    (r) => {
      status = "success";
      result = r;
    },
    (e) => {
      status = "error";
      err = e;
    }
  );
  return {
    read(): T {
      if (status === "pending") throw suspender;
      if (status === "error") throw err;
      return result as T;
    },
  };
}

type ErrorFallback = (props: { error: Error; reset: () => void }) => React.ReactNode;

class RouteErrorBoundary extends React.Component<
  { fallback: ErrorFallback; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) return this.props.fallback({ error: this.state.error, reset: this.reset });
    return this.props.children;
  }
}

export function SegmentBoundary({
  page: Page,
  loading: Loading,
  error: ErrorFallbackComp,
}: {
  page: React.ComponentType;
  loading: React.ComponentType;
  error: ErrorFallback;
}) {
  const withSuspense = (
    <React.Suspense fallback={<Loading />}>
      <Page />
    </React.Suspense>
  );
  return <RouteErrorBoundary fallback={ErrorFallbackComp}>{withSuspense}</RouteErrorBoundary>;
}
`;

const dataCode = `import { delay } from "./framework";

export interface Dashboard {
  userName: string;
}

let shouldFail = false;
export function setShouldFail(value: boolean) {
  shouldFail = value;
}

// Simulates the segment's data fetch — slow either way, and fails when
// the "Reload (simulate failure)" button was clicked most recently.
export function getDashboardData(): Promise<Dashboard> {
  if (shouldFail) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Failed to load dashboard")), 500);
    });
  }
  return delay({ userName: "Grace" }, 500);
}
`;

const loadingStarter = `// Exercise 1: this file plays the role of loading.tsx — the fallback
// Next.js shows automatically while page.tsx's data is still loading.
export default function Loading() {
  return <div>{/* TODO */}</div>;
}
`;

const loadingSolution = `export default function Loading() {
  return <p className="loading-fallback">Loading dashboard…</p>;
}
`;

const errorStarter = `// Exercise 2: this file plays the role of error.tsx. Note the directive
// below — error.tsx is ALWAYS a Client Component in real Next.js, because
// it needs reset() to be interactive.
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <div>{/* TODO */}</div>;
}
`;

const errorSolution = `"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-panel">
      <p className="error-message">{error.message}</p>
      <button className="retry-btn" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
`;

const pageStarter = `// Exercise 3: this file plays the role of page.tsx — the segment's real
// content. Use useMemo + createResource (same pattern as the streaming
// lesson) to read the dashboard data.
export default function DashboardPage() {
  return <div>{/* TODO */}</div>;
}
`;

const pageSolution = `import { useMemo } from "react";
import { createResource } from "./framework";
import { getDashboardData } from "./data";

export default function DashboardPage() {
  const resource = useMemo(() => createResource(getDashboardData()), []);
  const data = resource.read();
  return <h2 className="dashboard-title">Welcome, {data.userName}</h2>;
}
`;

const appCode = `import { useState } from "react";
import { SegmentBoundary } from "./framework";
import DashboardPage from "./page";
import Loading from "./loading";
import Error from "./error";
import { setShouldFail } from "./data";

export default function App() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>app/dashboard/ segment</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          onClick={() => {
            setShouldFail(false);
            setReloadKey((k) => k + 1);
          }}
        >
          Reload (success)
        </button>
        <button
          onClick={() => {
            setShouldFail(true);
            setReloadKey((k) => k + 1);
          }}
        >
          Reload (simulate failure)
        </button>
      </div>
      <SegmentBoundary key={reloadKey} page={DashboardPage} loading={Loading} error={Error} />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.6 sandbox
==================

loading.tsx, error.tsx and page.tsx simulate the three conventional
files Next.js auto-wires per route segment. framework.tsx's
SegmentBoundary nests a real Suspense + error boundary around them.

1. Build loading.tsx.
2. Build error.tsx (note it's a Client Component by convention).
3. Build page.tsx, then click both reload buttons to see each
   boundary trigger.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/loading.tsx", code: loadingStarter },
  { path: "/error.tsx", code: errorStarter },
  { path: "/page.tsx", code: pageStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/loading.tsx", code: loadingSolution },
  { path: "/error.tsx", code: errorSolution },
  { path: "/page.tsx", code: pageSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m3-l6",
  title: "loading.tsx and error.tsx",
  description:
    "Automatic Suspense/error-boundary wiring per route segment, the granularity of loading states, and error recovery with reset().",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Build the loading fallback",
      difficulty: "easy",
      instructions: `In \`loading.tsx\`, render \`<p className="loading-fallback">Loading dashboard…</p>\`. Next.js would use this automatically as the Suspense fallback for the matching page.tsx.`,
      validation: [
        { type: "code-includes", file: "/loading.tsx", pattern: "loading-fallback", message: "Loading renders the loading-fallback element" },
        { type: "code-includes", file: "/loading.tsx", pattern: "export default function", message: "Loading is a default-exported component" },
      ],
    },
    {
      id: "ex2",
      title: "Build the error boundary fallback",
      difficulty: "medium",
      instructions: `In \`error.tsx\`, render \`error.message\` in a \`<p className="error-message">\` and a \`<button className="retry-btn" onClick={reset}>Try again</button>\`. The \`"use client"\` directive is already there — this is one of the few files that's always a Client Component.`,
      validation: [
        { type: "code-includes", file: "/error.tsx", pattern: "use client", message: "error.tsx keeps its required \"use client\" directive" },
        { type: "code-includes", file: "/error.tsx", pattern: "error.message", message: "The caught error's message is shown" },
        { type: "code-includes", file: "/error.tsx", pattern: "retry-btn", message: "A retry button is present" },
        { type: "code-includes", file: "/error.tsx", pattern: "reset", message: "The retry button calls reset()" },
      ],
    },
    {
      id: "ex3",
      title: "Build the segment's real content",
      difficulty: "hard",
      instructions: `In \`page.tsx\`, use \`useMemo(() => createResource(getDashboardData()), [])\` and \`resource.read()\`, rendering \`Welcome, {data.userName}\` in an \`<h2 className="dashboard-title">\`. Click "Reload (success)" to see your loading fallback briefly, then the dashboard. Click "Reload (simulate failure)" to see your error fallback, then click "Try again" — it calls reset() and retries the segment.`,
      validation: [
        { type: "code-includes", file: "/page.tsx", pattern: "createResource", message: "page.tsx reads data through a resource, not a plain await" },
        { type: "code-includes", file: "/page.tsx", pattern: "useMemo", message: "The resource is memoized so it isn't recreated every render" },
        { type: "code-includes", file: "/page.tsx", pattern: "dashboard-title", message: "The dashboard content renders when data resolves" },
      ],
      hint: "const resource = useMemo(() => createResource(getDashboardData()), []);",
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does adding a loading.tsx next to page.tsx do?",
      options: [
        "Nothing unless manually imported",
        "Next.js automatically wraps that segment's page.tsx in a Suspense boundary using loading.tsx as the fallback",
        "It disables Suspense for the segment",
        "It only works for the root route",
      ],
      answerIndex: 1,
      explanation: "The file convention removes the need to manually import and nest a Suspense boundary yourself.",
    },
    {
      id: "q2",
      type: "tf",
      question: "error.tsx can be a Server Component, since it just renders a message.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "error.tsx always needs \"use client\" — it must call reset(), which requires interactivity.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A user clicks the retry button in an error.tsx fallback, calling reset(). What happens?",
      code: `<button onClick={() => reset()}>Try again</button>`,
      options: [
        "The whole browser tab reloads",
        "Next.js attempts to render the segment again, as if the error hadn't happened",
        "The button does nothing without a page refresh",
        "It navigates to the homepage",
      ],
      answerIndex: 1,
      explanation: "reset() re-attempts rendering the segment. If the underlying cause is fixed, it renders normally; if not, error.tsx catches it again.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A dashboard has one loading.tsx at the app root. Navigating between its fast overview segment and slow reports segment always blanks the entire page during the reports fetch. What's the fix?",
      options: [
        "Remove loading.tsx entirely",
        "Add a loading.tsx scoped to the reports segment specifically, so only that segment shows a fallback while overview stays mounted",
        "Convert reports to a Client Component",
        "Increase the fetch timeout",
      ],
      answerIndex: 1,
      explanation: "Loading states are per-segment. A loading.tsx scoped to the slow segment keeps sibling/parent content mounted and visible.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "In the boundary nesting Next.js builds from layout.tsx, error.tsx, loading.tsx and page.tsx, what's the order (outermost to innermost)?",
      options: [
        "page.tsx > loading.tsx > error.tsx > layout.tsx",
        "layout.tsx > error boundary (error.tsx) > Suspense (loading.tsx) > page.tsx",
        "error.tsx > layout.tsx > page.tsx > loading.tsx",
        "They all wrap each other in no particular order",
      ],
      answerIndex: 1,
      explanation: "Layout persists outermost; the error boundary sits inside it so layout survives a segment error; Suspense sits innermost, wrapping just the page content.",
    },
  ],
  keyTakeaways: [
    "loading.tsx automatically becomes the Suspense fallback for its segment's page.tsx.",
    "error.tsx automatically becomes an error boundary around its segment, and is always a Client Component.",
    "reset() re-attempts rendering the segment — it's not a page reload.",
    "Loading and error boundaries are scoped per segment, so nested routes get independent, granular states.",
  ],
  cheatSheet: `
| File | Becomes |
| --- | --- |
| \`loading.tsx\` | \`<Suspense fallback={<Loading />}>\` around page.tsx |
| \`error.tsx\` | Error boundary around the segment; always "use client" |
| \`reset()\` | Re-attempts rendering the segment, not a reload |
| Nesting order | layout > error boundary > Suspense > page |
`,
  interviewQuestions: [
    "What automatic wiring does Next.js perform when you add loading.tsx and error.tsx to a route segment?",
    "Why must error.tsx always be a Client Component?",
    "What exactly does calling reset() do, and what does it not do?",
    "How does per-segment granularity of loading.tsx improve navigation between a fast and a slow route?",
    "What's the nesting order of layout, error boundary, and Suspense for a given segment, and why does that order matter?",
    "How would you scope an error boundary to just one flaky part of a dashboard instead of the whole app?",
  ],
};

export default lesson;
