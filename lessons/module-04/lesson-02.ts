import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Last lesson you awaited data inside a Server Component. But real trees call the same data source from multiple places: a layout needs the current user for a header, a page needs the same user for a permissions check, a deeply nested component needs it again for a personalization tweak. Calling identical fetches three times sounds like three network round trips — but inside a single render, Next.js makes sure it's only one. That's **request memoization**, and it's easy to confuse with a second, very different mechanism: the **data cache**.

## Why this exists — the problem

Without memoization, a component tree that independently fetches "the current user" in five places would issue five identical network requests for a single page load — pure waste, and a five-way trip through the waterfall problem from lesson 4.1. Developers historically solved this by hand: fetch once at the top, pass the value down as props through every intermediate layer, even components that don't otherwise need it ("prop drilling"). That works, but it re-couples components that should be independent.

React's \`fetch\` patching (which Next.js relies on) removes the need for that discipline: call the same fetch from anywhere in the tree, and the underlying network call only happens once *per render*.

## How it works internally

### Request memoization — one render, one call

During a single render pass, if two components call \`fetch()\` with the **same URL and options**, React deduplicates them — only the first call actually hits the network; every later identical call reuses that in-flight (or resolved) promise.

::diagram{cache-scopes}

\`\`\`tsx
// components/Header.tsx
const user = await fetch("https://api.example.com/user").then(r => r.json());

// components/Sidebar.tsx — same render, same URL
const user = await fetch("https://api.example.com/user").then(r => r.json());
// only ONE network request actually happens for this render
\`\`\`

This memoization is scoped to a **single render pass** — it exists purely to avoid redundant work while producing one response, and it's gone by the time the next request comes in. It doesn't persist data across users, across requests, or across time.

### The data cache — many requests, over time

The **data cache** is a completely different, persistent layer. When a \`fetch\` call opts in (the default for GET requests in Server Components), its result is stored *outside* any single render — available to the *next* request, the *next* deployment, even a *different user's* request for the same URL — until something invalidates it.

\`\`\`tsx
// Cached indefinitely by default (until manually revalidated):
const res = await fetch("https://api.example.com/products");

// Opt out entirely — always a fresh network call:
const res = await fetch("https://api.example.com/products", { cache: "no-store" });
\`\`\`

### Cache tags — labeling cached entries for later invalidation

A cached \`fetch\` can be tagged so that unrelated code can invalidate it later without knowing the URL:

\`\`\`tsx
const res = await fetch("https://api.example.com/products", {
  next: { tags: ["products"] },
});
// elsewhere, e.g. after an admin edits a product:
// revalidateTag("products") — covered in lesson 4.3
\`\`\`

Tags decouple *what gets cached* from *what invalidates it* — a mutation handler doesn't need to know every URL that touched a piece of data, only its tag.

### Why calling the same URL twice in one render is "free"

Because request memoization collapses duplicate calls automatically, you never need to manually cache-and-pass-down a value just to avoid redundant network calls within one render. Fetch what you need, where you need it, and trust the framework to dedupe identical requests. The data cache is what makes *repeat renders across time* cheap; memoization is what makes *one render with redundant calls* cheap.

## The sandbox in this lesson

\`db.ts\` (read-only) exposes a \`getUser()\` function and a hidden counter that increments every time the *underlying* function body actually executes — simulating a real network hit. A memoized wrapper (\`memoize()\`) reuses the in-flight/resolved promise for calls within the same render. You'll call \`getUser()\` from two different simulated components in the same render and prove, via the counter, that the underlying work only happens once.

## Common mistakes

- **Assuming memoization persists across requests** — it doesn't; it's scoped to one render pass only.
- **Assuming the data cache and request memoization are the same thing** — one is "don't repeat within this render," the other is "don't repeat across time."
- **Forgetting to tag cached fetches** — without a tag, invalidating one piece of data later means either guessing the exact URL or clearing the whole path with \`revalidatePath\`.

## Best practices

- Fetch data where it's needed, not just at the top of the tree — let memoization handle duplicate calls for you.
- Tag fetches whose results you'll need to invalidate independently later (e.g., \`{ next: { tags: ["products"] } }\`).
- Reach for \`cache: "no-store"\` only when a value must always be fresh (e.g., an authenticated per-user balance); default caching is right for most public/shared data.

## Performance considerations

Request memoization eliminates redundant network calls *within* a render for free — no code changes required. The data cache is the bigger performance lever: it can turn every subsequent request for cached data into a cache hit with zero network round trip, at the cost of needing an explicit revalidation strategy (lesson 4.3).
`;

const dbCode = `// db.ts — READ-ONLY. Simulates the memoization vs data-cache distinction.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// This counter tracks how many times the REAL underlying work has run —
// analogous to counting actual network requests.
export let realFetchCount = 0;

async function realGetUser() {
  realFetchCount += 1;
  await sleep(200);
  console.log(\`[db] real network call #\${realFetchCount}\`);
  return { id: "u1", name: "Priya Shah" };
}

// A tiny stand-in for React's per-render fetch memoization: within one
// "render pass" (one call to renderOnce below), repeated calls reuse the
// same in-flight promise instead of calling realGetUser() again.
let memoizedPromise: Promise<{ id: string; name: string }> | null = null;

export async function getUser() {
  if (!memoizedPromise) {
    memoizedPromise = realGetUser();
  }
  return memoizedPromise;
}

// Call this between "renders" in the sandbox to simulate a brand new
// request — memoization never survives across renders in real Next.js.
export function resetRenderScope() {
  memoizedPromise = null;
}
`;

const headerStarter = `// Exercise 1: call getUser() here, just like Sidebar.tsx does.
// Both components run in the SAME render — memoization should mean the
// underlying network call only happens once total, not once per component.
import { getUser } from "./db";

export default async function Header() {
  // TODO: const user = await getUser();
  return <header />;
}
`;

const headerSolution = `import { getUser } from "./db";

export default async function Header() {
  const user = await getUser();
  return <header className="site-header">Welcome, {user.name}</header>;
}
`;

const sidebarStarter = `import { getUser } from "./db";

export default async function Sidebar() {
  const user = await getUser();
  return <aside className="site-sidebar">Logged in as {user.name}</aside>;
}
`;

const counterStarter = `// Exercise 2 & 3: render the realFetchCount so you can prove memoization.
import { realFetchCount } from "./db";

export default function FetchCounter() {
  // TODO: render realFetchCount inside a <p className="fetch-count">
  return <div />;
}
`;

const counterSolution = `import { realFetchCount } from "./db";

export default function FetchCounter() {
  return <p className="fetch-count">Real network calls this render: {realFetchCount}</p>;
}
`;

const appCode = `import Header from "./Header";
import Sidebar from "./Sidebar";
import FetchCounter from "./FetchCounter";

// Both Header and Sidebar call getUser() during this one render —
// memoization should keep the underlying "network" work to a single call.
export default async function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Request memoization</h1>
      <Header />
      <Sidebar />
      <FetchCounter />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 4.2 sandbox
==================

db.ts simulates fetch memoization: getUser() reuses one in-flight
promise per "render pass" (App.tsx running once), tracked by
realFetchCount — a stand-in for counting actual network requests.

1. Call getUser() in Header.tsx, same as Sidebar.tsx already does.
2. Render FetchCounter and confirm realFetchCount stays at 1, even
   though two components both called getUser().
3. Read db.ts's resetRenderScope() comment to understand why this
   count would reset on the NEXT request in real Next.js.
`,
  },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/Header.tsx", code: headerStarter },
  { path: "/Sidebar.tsx", code: sidebarStarter },
  { path: "/FetchCounter.tsx", code: counterStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/Header.tsx", code: headerSolution },
  { path: "/Sidebar.tsx", code: sidebarStarter },
  { path: "/FetchCounter.tsx", code: counterSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m4-l2",
  title: "Request memoization & the data cache",
  description:
    "The difference between per-render fetch deduplication (memoization) and the persistent, cross-request data cache — plus cache tags for targeted invalidation.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Call the memoized fetch from a second component",
      difficulty: "easy",
      instructions: `In \`Header.tsx\`, await \`getUser()\` from \`db.ts\` and render \`<header className="site-header">\` with a welcome message including the user's name — the same pattern \`Sidebar.tsx\` already uses.`,
      validation: [
        { type: "code-includes", file: "/Header.tsx", pattern: "await getUser()", message: "Header awaits getUser()" },
        { type: "dom-exists", selector: "header.site-header", message: "A <header class=\"site-header\"> renders" },
      ],
      hint: `const user = await getUser(); return <header className="site-header">Welcome, {user.name}</header>;`,
    },
    {
      id: "ex2",
      title: "Prove the underlying call only happens once",
      difficulty: "medium",
      instructions: `In \`FetchCounter.tsx\`, render \`realFetchCount\` from \`db.ts\` inside a \`<p className="fetch-count">\`. Even though both \`Header\` and \`Sidebar\` call \`getUser()\` in this same render, the count should be exactly 1 — memoization collapsed the duplicate calls.`,
      validation: [
        { type: "code-includes", file: "/FetchCounter.tsx", pattern: "realFetchCount", message: "FetchCounter reads realFetchCount" },
        { type: "dom-exists", selector: "p.fetch-count", message: "A <p class=\"fetch-count\"> renders the count" },
        { type: "dom-text", selector: "p.fetch-count", includes: "1", message: "The count reads 1, proving the two calls were deduplicated" },
      ],
    },
    {
      id: "ex3",
      title: "Explain why this wouldn't carry over to the next request",
      difficulty: "hard",
      instructions: `Read the comment above \`resetRenderScope()\` in \`db.ts\`. In \`FetchCounter.tsx\`, add a \`console.log\` describing, in your own words, why this memoization is scoped to a single render pass and wouldn't reduce network calls across two separate page requests (that's the data cache's job instead).`,
      validation: [
        { type: "code-includes", file: "/FetchCounter.tsx", pattern: "console.log", message: "FetchCounter logs an explanation" },
      ],
      hint: `console.log("memoization only dedupes within one render; the data cache is what persists across requests");`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Two components in the same render both call fetch() with the identical URL and options. What happens?",
      options: [
        "Two separate network requests are made",
        "Only the first call actually hits the network; the second reuses the same result — this is request memoization",
        "The second call is blocked until the page reloads",
        "Next.js throws a duplicate-fetch error",
      ],
      answerIndex: 1,
      explanation: "Request memoization deduplicates identical fetch calls within a single render pass.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Request memoization persists across separate requests to the same route.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Memoization is scoped to one render pass only. Persisting a value across requests is the data cache's job, a separate mechanism.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "What's the main purpose of tagging a fetch with next: { tags: [...] }?",
      options: [
        "It speeds up the fetch itself",
        "It labels the cached entry so unrelated code can invalidate it later without knowing the exact URL",
        "It disables caching for that fetch",
        "It's required for request memoization to work",
      ],
      answerIndex: 1,
      explanation: "Tags decouple what gets cached from what invalidates it later — a mutation handler can call revalidateTag without knowing every URL that used that data.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "Given fetch('/api/products') is cached by default and fetch('/api/products', { cache: 'no-store' }) is used elsewhere for the same URL, what happens on the second call?",
      code: `await fetch("/api/products");\n// later, different component:\nawait fetch("/api/products", { cache: "no-store" });`,
      options: [
        "Both calls are memoized together regardless of options",
        "The second call always hits the network fresh, because its options differ from the first — memoization requires matching URL AND options",
        "The second call throws an error",
        "Next.js merges the two options objects",
      ],
      answerIndex: 1,
      explanation: "Memoization only collapses calls with the same URL and options. Differing cache options mean they're treated as distinct calls.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A team expects that caching a fetch once means it never has to be re-fetched for a different user's request weeks later, yet they're confused why an admin's product edit doesn't show up for other users. What's missing?",
      options: [
        "Nothing — the data cache should already reflect the edit automatically",
        "A revalidation strategy — a tag or time-based revalidate so the data cache is invalidated when the underlying data changes",
        "Request memoization needs to be disabled",
        "The fetch needs a different URL each time",
      ],
      answerIndex: 1,
      explanation: "The data cache persists until something invalidates it — a mutation elsewhere doesn't automatically clear it. That's what revalidateTag/revalidatePath/time-based revalidation are for (lesson 4.3).",
    },
  ],
  keyTakeaways: [
    "Request memoization deduplicates identical fetch() calls (same URL + options) within a single render pass — it's automatic and free.",
    "The data cache is a separate, persistent layer: it survives across requests, users, and deployments until explicitly invalidated.",
    "Cache tags (next: { tags: [...] }) label cached entries so they can be invalidated later without knowing every URL that used them.",
    "Fetch data wherever it's needed in the tree — memoization means you don't need to manually hoist and prop-drill to avoid duplicate calls.",
  ],
  cheatSheet: `
| | Request memoization | Data cache |
| --- | --- | --- |
| Scope | One render pass | Across requests, users, deployments |
| Lifetime | Gone after the render finishes | Persists until revalidated |
| Trigger | Identical URL + options in the same render | Any cacheable fetch (default GET) |
| Opt out | Different options per call | \`cache: "no-store"\` |
| Invalidate | N/A (already gone) | \`revalidateTag\` / \`revalidatePath\` / time-based |
`,
  interviewQuestions: [
    "What's the difference between request memoization and the data cache?",
    "If two components in the same render both fetch the same URL, how many network calls actually happen, and why?",
    "What are cache tags for, and how do they decouple invalidation from specific URLs?",
    "Why doesn't fetching data in multiple components force you to prop-drill it from a single top-level fetch?",
    "What would you check first if cached data isn't updating after a mutation?",
    "When would you use cache: 'no-store' instead of relying on the default cache behavior?",
  ],
};

export default lesson;
