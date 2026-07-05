import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Static rendering serves the same HTML to everyone. Sometimes that's wrong: a dashboard showing *your* orders, a page reading a cookie to pick a locale, a search results page driven by \`?q=\`. These need to render **per request** — dynamic rendering. Done naively, dynamic pages make every visitor wait for the *slowest* piece of data before seeing anything. Suspense-based streaming fixes that.

## Why this exists — the problem

A dynamic page might fetch three things: fast (50ms), medium (400ms), slow (2s). Without streaming, the server can't send *anything* until all three resolve — the visitor stares at a blank tab for 2 full seconds, even though most of the page was ready in 400ms. Streaming lets the server send what's ready immediately and fill in the rest as it arrives, in the same connection, without extra round trips.

## How it works internally

### What forces dynamic rendering

A route becomes dynamic (opts out of static rendering) when it does any of:

- Reads \`cookies()\` or \`headers()\`
- Reads \`searchParams\`
- Fetches with \`{ cache: "no-store" }\`, or calls \`unstable_noStore()\` / \`connection()\`
- Depends on anything else only known at request time

None of these are mistakes — they're the signal Next.js uses to know "this can't be computed once at build time."

### Suspense boundaries

Wrap any part of the tree that depends on slow data in \`<Suspense fallback={...}>\`. React renders the fallback immediately and swaps in the real content the instant the wrapped subtree's data resolves — independently of every other Suspense boundary on the page:

\`\`\`tsx
export default function FeedPage() {
  return (
    <>
      <Header />                                        {/* renders immediately */}
      <Suspense fallback={<p>Loading your info…</p>}>
        <UserCard />                                     {/* resolves at ~800ms */}
      </Suspense>
      <Suspense fallback={<p>Loading recommendations…</p>}>
        <Recommendations />                               {/* resolves at ~2000ms */}
      </Suspense>
    </>
  );
}
\`\`\`

\`Header\` paints at 0ms. \`UserCard\` streams in around 800ms. \`Recommendations\` streams in around 2000ms — but crucially, it never blocks \`UserCard\` from appearing first.

::diagram{streaming-timeline}

### Streaming HTML in chunks

The server doesn't wait for the whole tree. It sends the initial HTML (the shell, with fallbacks in place of un-resolved Suspense children) over the same HTTP connection, then streams additional \`<script>\` chunks as each boundary resolves — each chunk tells the browser "replace this fallback with this real content," using the *same connection*, no polling, no extra requests.

### Why this improves perceived performance

Total data-fetch time is unchanged — the slow API call still takes 2 seconds. What changes is *what the user sees while waiting*: a fully painted shell and fast sections immediately, instead of a blank screen. Users perceive "fast" based on time-to-first-meaningful-content, not total load time, and streaming directly optimizes that.

## The sandbox in this lesson

This sandbox runs real React with real \`Suspense\` support. Since there's no server here, data fetching is simulated with \`createResource\` (read-only, in \`framework.tsx\`) — the classic "throw a pending promise, Suspense catches it" pattern (the same idea React uses internally, just written out by hand instead of hidden behind \`await\` in a Server Component).

## Common mistakes

- **One giant Suspense boundary around the whole page** — this just recreates the "wait for everything" problem at a smaller scale.
- **Forgetting a fallback** — Suspense throws if no ancestor \`fallback\` is provided for a component that suspends.
- **Re-creating the data-fetching resource on every render** instead of memoizing it — causes an infinite suspend loop.

## Best practices

- Give independent, differently-paced sections of a page their own Suspense boundary so slow ones never block fast ones.
- Put the shell (navigation, layout, anything static) *outside* any Suspense boundary so it always paints first.
- Design fallbacks that match the real content's layout (skeletons) to avoid layout shift when the real content arrives.

## Performance considerations

Streaming doesn't make your database faster — it makes waiting feel shorter, and it does so for free once boundaries are drawn correctly. The finer-grained your Suspense boundaries, the sooner each independent piece of the page can appear.
`;

const frameworkCode = `// framework.tsx — READ-ONLY.
// Real React Suspense runs in this sandbox. There's no server here, so
// data-fetching is simulated with the classic "throw a pending promise"
// resource pattern — the same idea React itself uses internally for
// Server Component data fetching, just written out by hand.
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
`;

const dataCode = `import { delay } from "./framework";

export interface User {
  name: string;
}

export interface RecommendedItem {
  id: string;
  title: string;
}

// Simulates a fast-ish API call.
export function getUser(): Promise<User> {
  return delay({ name: "Ada Lovelace" }, 800);
}

// Simulates a slow API call — much slower than getUser().
export function getRecommendations(): Promise<RecommendedItem[]> {
  return delay(
    [
      { id: "r1", title: "Streaming with Suspense" },
      { id: "r2", title: "generateStaticParams in depth" },
    ],
    2000
  );
}
`;

const userCardStarter = `import { useMemo } from "react";
import { createResource } from "./framework";
import { getUser } from "./data";

// Exercise 2: create the resource once with useMemo (an empty dependency
// array — creating a new one on every render would suspend forever),
// then call resource.read() to get the user and render user.name.
export default function UserCard() {
  return <div className="user-card">{/* TODO */}</div>;
}
`;

const userCardSolution = `import { useMemo } from "react";
import { createResource } from "./framework";
import { getUser } from "./data";

export default function UserCard() {
  const resource = useMemo(() => createResource(getUser()), []);
  const user = resource.read();
  return (
    <div className="user-card">
      <h2 className="user-name">{user.name}</h2>
    </div>
  );
}
`;

const recommendationsStarter = `import { useMemo } from "react";
import { createResource } from "./framework";
import { getRecommendations } from "./data";

// Exercise 3: same pattern as UserCard, but for getRecommendations().
export default function Recommendations() {
  return <div className="recommendations">{/* TODO */}</div>;
}
`;

const recommendationsSolution = `import { useMemo } from "react";
import { createResource } from "./framework";
import { getRecommendations } from "./data";

export default function Recommendations() {
  const resource = useMemo(() => createResource(getRecommendations()), []);
  const items = resource.read();
  return (
    <ul className="recommendations">
      {items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
`;

const appStarter = `import { Suspense } from "react";
import UserCard from "./UserCard";
import Recommendations from "./Recommendations";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      {/* Exercise 1: the always-visible shell — renders before any data
          loads. Add an <h1>My Feed</h1> and a <p className="shell-note">
          explaining that this text appears immediately. */}

      {/* Exercise 2: wrap <UserCard /> in its own <Suspense> with
          fallback={<p className="loading-user">Loading user…</p>} */}

      {/* Exercise 3: wrap <Recommendations /> in a SEPARATE <Suspense>
          with fallback={<p className="loading-recs">Loading recommendations…</p>} */}
    </main>
  );
}
`;

const appSolution = `import { Suspense } from "react";
import UserCard from "./UserCard";
import Recommendations from "./Recommendations";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>My Feed</h1>
      <p className="shell-note">This text appears immediately — it's outside every Suspense boundary.</p>

      <Suspense fallback={<p className="loading-user">Loading user…</p>}>
        <UserCard />
      </Suspense>

      <Suspense fallback={<p className="loading-recs">Loading recommendations…</p>}>
        <Recommendations />
      </Suspense>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.5 sandbox
==================

Real React Suspense runs here. framework.tsx (read-only) provides
createResource + delay to simulate slow data fetching.

1. Build the always-visible shell in App.tsx.
2. Complete UserCard.tsx (resolves at ~800ms) and give it its own
   Suspense boundary.
3. Complete Recommendations.tsx (resolves at ~2000ms) with a SEPARATE
   Suspense boundary — watch it stream in independently of UserCard.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/UserCard.tsx", code: userCardStarter },
  { path: "/Recommendations.tsx", code: recommendationsStarter },
  { path: "/App.tsx", code: appStarter },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/UserCard.tsx", code: userCardSolution },
  { path: "/Recommendations.tsx", code: recommendationsSolution },
  { path: "/App.tsx", code: appSolution },
];

const lesson: Lesson = {
  id: "m3-l5",
  title: "Dynamic rendering & streaming with Suspense",
  description:
    "What forces dynamic rendering, Suspense boundaries, streaming HTML in chunks, and why it improves perceived performance.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "The always-visible shell",
      difficulty: "easy",
      instructions: `In \`App.tsx\`, above the Suspense boundaries, add an \`<h1>My Feed</h1>\` and a \`<p className="shell-note">\` explaining that this text renders immediately, before any data loads.`,
      validation: [
        { type: "dom-exists", selector: "h1", message: "The shell renders an <h1>" },
        { type: "dom-exists", selector: "p.shell-note", message: "The shell includes a shell-note paragraph" },
      ],
    },
    {
      id: "ex2",
      title: "Stream in the user card",
      difficulty: "medium",
      instructions: `Complete \`UserCard.tsx\`: create the resource once with \`useMemo(() => createResource(getUser()), [])\`, call \`resource.read()\`, and render \`user.name\` in an \`<h2 className="user-name">\`. In \`App.tsx\`, wrap \`<UserCard />\` in \`<Suspense fallback={<p className="loading-user">Loading user…</p>}>\`.`,
      validation: [
        { type: "code-includes", file: "/UserCard.tsx", pattern: "createResource", message: "UserCard reads from a resource, not a plain await" },
        { type: "code-includes", file: "/UserCard.tsx", pattern: "useMemo", message: "The resource is memoized so it isn't recreated every render" },
        { type: "code-includes", file: "/App.tsx", pattern: "Suspense", message: "UserCard is wrapped in a Suspense boundary" },
        { type: "code-includes", file: "/App.tsx", pattern: "loading-user", message: "The fallback for UserCard is present" },
      ],
      hint: "const resource = useMemo(() => createResource(getUser()), []);",
    },
    {
      id: "ex3",
      title: "An independent, slower boundary",
      difficulty: "hard",
      instructions: `Complete \`Recommendations.tsx\` the same way using \`getRecommendations()\`, rendering each item's \`title\` in a \`<li>\`. In \`App.tsx\`, give it its OWN separate \`<Suspense fallback={<p className="loading-recs">Loading recommendations…</p>}>\` — not the same boundary as UserCard. Run the sandbox: the user card should appear well before recommendations, since each boundary resolves independently.`,
      validation: [
        { type: "code-includes", file: "/Recommendations.tsx", pattern: "createResource", message: "Recommendations reads from a resource" },
        { type: "code-includes", file: "/App.tsx", pattern: "loading-recs", message: "Recommendations has its own fallback" },
        { type: "code-regex", file: "/App.tsx", regex: "<Suspense[\\s\\S]*<Suspense", message: "Two separate Suspense boundaries exist" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Which of these forces a route into dynamic rendering?",
      options: [
        "Rendering a fixed array of strings",
        "Reading cookies() to personalize the response",
        "Importing a CSS file",
        "Having zero dynamic segments",
      ],
      answerIndex: 1,
      explanation: "Reading request-time-only data like cookies means the output can't be computed once at build time.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Without Suspense, a dynamic page can show its fast sections before its slow data has resolved.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Without Suspense boundaries, the page waits for all its data before sending anything. Suspense is what unlocks showing fast parts early.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "Given two separate Suspense boundaries — one resolving at 500ms, one at 3000ms — what does the user see at 600ms?",
      code: `<Suspense fallback={<Spinner />}><Fast /></Suspense>\n<Suspense fallback={<Spinner />}><Slow /></Suspense>`,
      options: [
        "Two spinners, since nothing is done yet",
        "Fast's real content, and a spinner for Slow — each boundary resolves independently",
        "A single combined spinner for both",
        "An error, because two Suspense boundaries can't coexist",
      ],
      answerIndex: 1,
      explanation: "Independent Suspense boundaries resolve independently — a slow one never blocks a faster sibling boundary from showing its content.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A component wrapped in Suspense re-suspends forever and never shows real content. The component creates its data promise directly in the function body, with no memoization. What's wrong?",
      options: [
        "Suspense doesn't support promises",
        "A brand-new pending promise is created on every render, so it never gets the chance to resolve before being replaced",
        "The fallback is missing",
        "The component needs 'use client'",
      ],
      answerIndex: 1,
      explanation: "The resource must be created once (e.g. via useMemo with an empty dependency array) so the same promise is read across renders until it resolves.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why does streaming improve perceived performance even when total data-fetch time is unchanged?",
      options: [
        "It makes the API calls run faster",
        "It changes what the user sees while waiting — a painted shell and fast sections immediately, instead of a blank screen until everything is ready",
        "It compresses the HTML response",
        "It skips slow data sources entirely",
      ],
      answerIndex: 1,
      explanation: "Perceived performance is about time-to-first-meaningful-content, not total load time — streaming directly targets that metric.",
    },
  ],
  keyTakeaways: [
    "Reading cookies/headers/searchParams, or opting out of caching, forces dynamic rendering.",
    "Suspense boundaries let independent, differently-paced sections of a page resolve without blocking each other.",
    "Streaming sends the shell immediately and fills in each resolved boundary over the same connection.",
    "Streaming improves perceived performance without changing total fetch time — time-to-first-meaningful-content is what users feel.",
  ],
  cheatSheet: `
| Concept | One-liner |
| --- | --- |
| Forces dynamic | cookies(), headers(), searchParams, no-store fetch |
| <Suspense fallback> | Shows fallback until the wrapped subtree's data resolves |
| One boundary per page | Recreates "wait for everything" — avoid |
| One boundary per independent section | Fast sections show without waiting on slow ones |
| Resource must be memoized | Avoid recreating a pending promise every render |
`,
  interviewQuestions: [
    "What conditions force a Next.js route into dynamic rendering?",
    "How does wrapping a component in Suspense change what the server sends and when?",
    "Why should you use multiple fine-grained Suspense boundaries instead of one for the whole page?",
    "What problem does the resource/memoization pattern solve for Suspense-based data fetching?",
    "Explain the difference between total load time and perceived performance, and how streaming affects each.",
    "How does streaming let the server send additional content over the same HTTP connection without new requests?",
  ],
};

export default lesson;
