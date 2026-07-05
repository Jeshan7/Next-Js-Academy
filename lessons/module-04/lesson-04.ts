import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Three caches so far — request memoization, the data cache, and (from Module 3) the full route cache that stores pre-rendered HTML/RSC per route — all live **on the server**. There's a fourth cache, and it's the one that lives in the browser: the **Router Cache** (also called the client-side cache). It's why navigating *back* to a page you already visited can feel instant, and it's also the most common source of "why am I seeing old data after I clicked back?" bugs.

## Why this exists — the problem

Client-side navigation (lesson from Module 2) already avoids full page reloads by swapping only the changed route segment. But without a client-side cache, revisiting a page you'd already navigated to would mean re-fetching its RSC payload from the server every single time — even a second after you left it. The Router Cache exists to make **revisiting** a route, within the same session, avoid that round trip entirely.

## How it works internally

### What the Router Cache actually stores

As the user navigates, Next.js stores the rendered segments it has already fetched in an in-memory client-side cache, keyed by route. Navigating to a page you've visited before in this session can reuse that cached segment instead of asking the server again — this is why Back/Forward navigation in particular tends to feel instant: those routes were just visited moments ago.

This is **entirely separate** from the server-side data cache and full route cache. A route's *server-rendered output* can be perfectly fresh, but if the *browser* is still holding an older cached copy of that segment from a few moments ago, the user sees the older version until the Router Cache entry is invalidated.

### Why you sometimes see stale data after navigating

A common sequence: you edit something on page A, navigate to page B, then click Back to page A — and see the *pre-edit* version. The server-side data may already be correct (if you called \`revalidatePath\`/\`revalidateTag\`), but the Router Cache in the browser doesn't automatically know that; it can still be serving the segment it cached before your edit. \`router.refresh()\` (or navigating with tools that explicitly bust this cache) forces the client to discard its cached segment and re-request the current route from the server.

### Tying it all together — the full stack

::diagram{caching-layers-stack}

Reading top to bottom, each layer answers a different question:

1. **Request memoization** — "Within this one render, did I already ask for this exact thing?"
2. **Data cache** — "Across many requests and deployments, do I already have this fetched result?"
3. **Full route cache** — "Do I already have pre-rendered HTML/RSC for this whole route?"
4. **Router cache** — "Does the *browser* already have this segment from a recent visit, without asking the server at all?"

A request can sail through layers 1–3 perfectly (fresh data, fresh render) and still show a user something outdated if layer 4 — entirely client-side, entirely separate — hasn't been told to let go of what it's holding.

## The sandbox in this lesson

This sandbox reuses the navigation simulator pattern from Module 2 (\`next/link\`, \`usePathname\`) between two routes, \`/dashboard\` and \`/settings\`. A small \`routerCache.ts\` (read-only) tracks which routes have already been "visited" in this session. You'll build a badge component that reports **HIT** (this route was already cached from an earlier visit) or **MISS** (first visit, fetched fresh) every time you navigate — the client-side analogue of everything covered in this module so far.

## Common mistakes

- **Confusing the Router Cache with the data cache or full route cache** — they're independently invalidated, live in different places (browser vs server), and solve different problems.
- **Expecting \`revalidatePath\`/\`revalidateTag\` alone to update what a user is currently looking at** — those invalidate server-side caches; the client may still need \`router.refresh()\` (or a fresh navigation) to actually re-request the segment.
- **Assuming Back/Forward always reflects the latest server state** — by design, it often intentionally reuses the cached segment for a snappy experience.

## Best practices

- Think of these four layers as a pipeline, not one cache — debugging "stale data" means asking *which* layer is holding an old value.
- Use \`router.refresh()\` after mutations when you need the current page to reflect fresh server data immediately, without a full navigation.
- Don't fight the Router Cache for routes where a slightly-stale Back navigation is harmless (most read-only browsing) — it's a deliberate trade for speed.

## Performance considerations

The Router Cache is what makes an App Router site feel like a native app when moving between recently-visited screens — zero network round trip for a repeat visit. The cost is exactly the trade-off you'd expect from any cache: correctness requires you to reason about invalidation, and now there are four layers instead of one.
`;

const routerCacheCode = `// routerCache.ts — READ-ONLY. A tiny in-memory stand-in for the browser's
// Router Cache: tracks which routes have already been "visited" (and
// therefore cached client-side) during this session.
const visited = new Set<string>();

export function hasCacheEntry(path: string): boolean {
  return visited.has(path);
}

export function markVisited(path: string) {
  visited.add(path);
}

export function clearRouterCache() {
  visited.clear();
  console.log("[router-cache] cleared — next visit to any route will be a MISS");
}
`;

const badgeStarter = `// Exercise 1 & 2: report HIT (already visited this session) or MISS
// (first visit) every time the route changes.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasCacheEntry, markVisited } from "./routerCache";

export default function RouterCacheBadge() {
  const pathname = usePathname();
  const [status, setStatus] = useState<"hit" | "miss">("miss");

  useEffect(() => {
    // TODO: check hasCacheEntry(pathname), setStatus accordingly,
    // then markVisited(pathname) so the NEXT visit to this route is a hit.
  }, [pathname]);

  return (
    <p className="router-cache-badge" data-status={status}>
      Router cache: {status === "hit" ? "HIT" : "MISS"}
    </p>
  );
}
`;

const badgeSolution = `"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasCacheEntry, markVisited } from "./routerCache";

export default function RouterCacheBadge() {
  const pathname = usePathname();
  const [status, setStatus] = useState<"hit" | "miss">("miss");

  useEffect(() => {
    const hit = hasCacheEntry(pathname);
    setStatus(hit ? "hit" : "miss");
    markVisited(pathname);
  }, [pathname]);

  return (
    <p className="router-cache-badge" data-status={status}>
      Router cache: {status === "hit" ? "HIT — reused, no server round trip" : "MISS — fetched fresh"}
    </p>
  );
}
`;

const clearButtonStarter = `// Exercise 3: a button that clears the simulated Router Cache — the
// client-side equivalent of what a hard refresh (or router.refresh() on
// every segment) would force.
"use client";

import { clearRouterCache } from "./routerCache";

export default function ClearCacheButton() {
  return <div />;
}
`;

const clearButtonSolution = `"use client";

import { clearRouterCache } from "./routerCache";

export default function ClearCacheButton() {
  return (
    <button className="clear-cache-btn" onClick={() => clearRouterCache()}>
      Clear router cache
    </button>
  );
}
`;

const appCode = `import Link from "next/link";
import { usePathname } from "next/navigation";
import RouterCacheBadge from "./RouterCacheBadge";
import ClearCacheButton from "./ClearCacheButton";

function Dashboard() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Dashboard</h1></main>;
}
function Settings() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Settings</h1></main>;
}

const routes: Record<string, React.ComponentType> = {
  "/dashboard": Dashboard,
  "/settings": Settings,
};

function Router() {
  const pathname = usePathname();
  const Page = routes[pathname] ?? Dashboard;
  return <Page />;
}

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd" }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/settings">Settings</Link>
      </nav>
      <Router />
      <div style={{ padding: 24, display: "grid", gap: 12 }}>
        <RouterCacheBadge />
        <ClearCacheButton />
      </div>
    </div>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 4.4 sandbox
==================

Two routes, /dashboard and /settings, wired with real next/link and
next/navigation. routerCache.ts simulates the client-side Router Cache
with a visited-routes set.

1. Finish RouterCacheBadge.tsx: report HIT if this route was already
   visited this session, MISS on first visit, then mark it visited.
2. Navigate between /dashboard and /settings a few times and watch the
   badge flip between MISS (first visit) and HIT (revisit).
3. Wire ClearCacheButton.tsx to clearRouterCache() and confirm every
   route reports MISS again afterward — analogous to what forcing a
   fresh fetch of every segment would do in real Next.js.
`,
  },
  { path: "/routerCache.ts", readOnly: true, code: routerCacheCode },
  { path: "/RouterCacheBadge.tsx", code: badgeStarter },
  { path: "/ClearCacheButton.tsx", code: clearButtonStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/routerCache.ts", readOnly: true, code: routerCacheCode },
  { path: "/RouterCacheBadge.tsx", code: badgeSolution },
  { path: "/ClearCacheButton.tsx", code: clearButtonSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m4-l4",
  title: "The full router cache model",
  description:
    "The client-side Router Cache, how it differs from the three server-side caches, why Back navigation can show stale data, and how all four caching layers fit together.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Report the cache status on navigation",
      difficulty: "easy",
      instructions: `In \`RouterCacheBadge.tsx\`, inside the \`useEffect\`, check \`hasCacheEntry(pathname)\` and call \`setStatus\` with \`"hit"\` or \`"miss"\` accordingly.`,
      validation: [
        { type: "code-includes", file: "/RouterCacheBadge.tsx", pattern: "hasCacheEntry(pathname)", message: "The badge checks hasCacheEntry for the current pathname" },
        { type: "code-includes", file: "/RouterCacheBadge.tsx", pattern: "setStatus", message: "The badge updates its status state" },
      ],
      hint: `const hit = hasCacheEntry(pathname); setStatus(hit ? "hit" : "miss");`,
    },
    {
      id: "ex2",
      title: "Mark the route visited",
      difficulty: "medium",
      instructions: `Still in the \`useEffect\`, call \`markVisited(pathname)\` after computing the status, so that navigating away and back reports a HIT. Navigate between Dashboard and Settings a few times and watch the badge in the preview.`,
      validation: [
        { type: "code-includes", file: "/RouterCacheBadge.tsx", pattern: "markVisited(pathname)", message: "The badge marks the current route as visited" },
        { type: "dom-exists", selector: "p.router-cache-badge", message: "The badge renders" },
      ],
    },
    {
      id: "ex3",
      title: "Clear the simulated Router Cache",
      difficulty: "hard",
      instructions: `In \`ClearCacheButton.tsx\`, render a \`<button className="clear-cache-btn">\` that calls \`clearRouterCache()\` on click. Click it, then navigate — both routes should report MISS again, since the client no longer has anything cached.`,
      validation: [
        { type: "code-includes", file: "/ClearCacheButton.tsx", pattern: "clearRouterCache", message: "The button calls clearRouterCache" },
        { type: "dom-exists", selector: "button.clear-cache-btn", message: "A <button class=\"clear-cache-btn\"> renders" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Where does the Router Cache live?",
      options: [
        "On the server, alongside the data cache",
        "In the browser — it's the client-side cache of already-visited route segments",
        "In the database",
        "It's the same thing as the full route cache",
      ],
      answerIndex: 1,
      explanation: "The Router Cache is entirely client-side, separate from the three server-side layers covered earlier in this module.",
    },
    {
      id: "q2",
      type: "tf",
      question: "revalidatePath/revalidateTag on the server automatically clears a user's client-side Router Cache for the page they're currently viewing.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Server-side revalidation invalidates server-side caches. The client may still serve an already-cached segment until it's told to refresh (e.g., via router.refresh() or a fresh navigation).",
    },
    {
      id: "q3",
      type: "debugging",
      question: "A user edits their profile, navigates away, then clicks Back and sees the old profile data even though the server-side data cache was correctly revalidated. What's the likely cause?",
      options: [
        "The server-side data cache wasn't actually revalidated",
        "The Router Cache in the browser is still serving the segment it cached before the edit",
        "The database write failed silently",
        "This can't happen if revalidatePath was called",
      ],
      answerIndex: 1,
      explanation: "Server-side freshness doesn't guarantee client-side freshness — the Router Cache is a separate layer that needs its own invalidation path (like router.refresh()).",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "Given the four caching layers (memoization, data cache, full route cache, router cache), which one answers 'does the browser already have this segment without asking the server at all?'",
      options: [
        "Request memoization",
        "Data cache",
        "Full route cache",
        "Router cache",
      ],
      answerIndex: 3,
      explanation: "The Router Cache is the only one of the four that's client-side — the other three all live on the server.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why is 'stale after deploy/edit' often a multi-layer debugging problem?",
      options: [
        "Because there's only one cache and it's always the culprit",
        "Because a fix might require clearing the right server-side cache layer AND getting the client's Router Cache to let go of its own copy",
        "Because caching doesn't apply to the App Router",
        "Because the Router Cache never expires under any circumstances",
      ],
      answerIndex: 1,
      explanation: "Each layer is invalidated independently — a thorough fix usually means reasoning about which of the four layers is actually holding the old value.",
    },
  ],
  keyTakeaways: [
    "The Router Cache is the browser's own cache of recently-visited route segments — entirely separate from the three server-side layers.",
    "It's why revisiting a recently-viewed route (especially Back/Forward) can feel instant, with no server round trip at all.",
    "Server-side revalidation (revalidateTag/revalidatePath) doesn't automatically clear it — router.refresh() (or a fresh navigation) is the client-side lever.",
    "The four layers form a pipeline: request memoization → data cache → full route cache (all server-side) → router cache (client-side) — debugging staleness means asking which layer is holding the old value.",
  ],
  cheatSheet: `
| Layer | Where | Scope |
| --- | --- | --- |
| Request memoization | Server | One render pass |
| Data cache | Server | Across requests/deployments, until revalidated |
| Full route cache | Server | Per route, HTML + RSC payload |
| Router cache | **Browser** | Per session, per visited segment |
`,
  interviewQuestions: [
    "What is the Router Cache, and how is it different from the other three caching layers in Next.js?",
    "Why can a user see stale data after clicking Back even though the server's data was already revalidated?",
    "What does router.refresh() actually do, and when would you reach for it?",
    "Walk through all four caching layers, in order, and what question each one answers.",
    "Why does Back/Forward navigation often feel instant in an App Router site?",
    "If a page shows outdated data after a mutation, what's your debugging order across the four layers?",
  ],
};

export default lesson;
