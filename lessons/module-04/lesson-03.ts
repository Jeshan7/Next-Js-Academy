import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

The data cache from the last lesson persists — but persists *forever* isn't useful for data that changes. A product's price updates, an article gets edited, a dashboard number ticks up. Next.js gives you two ways to keep cached data fresh: **time-based revalidation** (accept staleness up to a limit) and **on-demand revalidation** (invalidate the instant something changes). Understanding both — and the "serve stale, then refresh" behavior in between — is what makes the data cache usable for real, changing data.

## Why this exists — the problem

Two extremes are both bad. Never caching means every request re-fetches from the source — slow, and hammers whatever's behind the fetch. Caching forever means users see outdated content indefinitely, with no way to fix it short of a full redeploy. Real applications need a middle ground: cache aggressively, but define *when* and *how* staleness gets resolved.

## How it works internally

### Time-based revalidation: the \`revalidate\` option

\`\`\`tsx
const res = await fetch("https://api.example.com/products", {
  next: { revalidate: 60 }, // seconds
});
\`\`\`

This tells the data cache: "this result is good for 60 seconds." After that window, the *next* request doesn't wait for a fresh fetch — it gets the **stale** cached value immediately, while Next.js kicks off a background refetch. Once that refetch resolves, the cache updates, and *every request after that* gets the fresh value. This is the **stale-while-revalidate** pattern: nobody ever waits on the network for this data, but nobody sees data older than roughly one revalidation window either.

::diagram{revalidation-timeline}

### On-demand revalidation: \`revalidatePath\` and \`revalidateTag\`

Time-based revalidation is a schedule — good for data that changes on its own cadence. But some changes are *events*: an admin edits a product, and stale data for up to 60 seconds isn't acceptable. On-demand revalidation clears a cache entry the instant you know something changed:

\`\`\`tsx
"use server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function updateProduct(id: string, data: ProductInput) {
  await db.products.update(id, data);
  revalidateTag("products");       // clears every fetch tagged "products"
  // or: revalidatePath("/products/" + id); // clears one specific route's cache
}
\`\`\`

\`revalidateTag\` targets everything tagged with a given string, regardless of URL — the natural fit when one mutation should invalidate several different fetches that all touched the same underlying data. \`revalidatePath\` targets a specific route's cached output directly — simpler when you know exactly which page needs to be fresh.

### The stale-while-revalidate mental model

Neither form of revalidation makes a *user's own request* wait for fresh data. The pattern is always: serve what you have (even if it's stale), and update the cache in the background for whoever asks next. This is why time-based revalidation is described in *seconds until eligible for a refresh*, not *seconds until deleted* — the old value doesn't vanish at the deadline, it just becomes a candidate for replacement on the next request.

### Trade-offs: freshness vs server load

Shorter \`revalidate\` windows mean fresher data but more background refetches — more load on whatever's behind the fetch (a database, a third-party API with rate limits). On-demand revalidation avoids that trade-off for event-driven changes: you only pay the cost of a refetch when something *actually* changed, not on a fixed schedule. Most real applications mix both: a generous time-based window as a safety net, plus on-demand revalidation for the mutations you control directly.

## The sandbox in this lesson

\`cache.ts\` (read-only) simulates a cached value with a fake timestamp and a configurable revalidation window. You'll trigger a simulated revalidation (both time-based, by advancing a fake clock, and on-demand, by calling a \`revalidate()\` function directly) and observe the served value update.

## Common mistakes

- **Treating \`revalidate: N\` as "delete after N seconds"** — it isn't a TTL that empties the cache; it's a staleness threshold that triggers a background refresh on the next request.
- **Forgetting to tag fetches, then being stuck using \`revalidatePath\` for data that spans multiple pages.**
- **Setting \`revalidate\` too low "to be safe"** — this just recreates the never-cache problem, hammering the data source on every near-simultaneous request.

## Best practices

- Use time-based revalidation for data that changes on its own schedule (a homepage feed, an inventory count that updates periodically).
- Use \`revalidateTag\`/\`revalidatePath\` from inside the Server Action or Route Handler that performs the mutation — invalidate at the source of the change, not somewhere else.
- Tag fetches by the *data* they represent, not the page they happen to render on, so one mutation can invalidate every place that data appears.

## Performance considerations

Stale-while-revalidate means the *worst case* latency for cached data is always "instant, but maybe up to one window old" — never "wait for a slow upstream call." That's a meaningfully better user experience than no caching, at the cost of a bounded amount of staleness you get to choose.
`;

const cacheCode = `// cache.ts — READ-ONLY. Simulates a cached value with time-based and
// on-demand revalidation, mirroring next: { revalidate } and revalidateTag.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedValue = { price: 42, cachedAt: 0 };
let clock = 0; // a fake clock, in seconds, advanced manually in the sandbox
const REVALIDATE_WINDOW = 5; // seconds — analogous to next: { revalidate: 5 }

async function fetchFreshPrice(): Promise<number> {
  await sleep(150);
  // pretend the "real" price ticks up slightly each time it's fetched
  return cachedValue.price + 1;
}

export function advanceClock(seconds: number) {
  clock += seconds;
}

export function getClock() {
  return clock;
}

/** Mirrors fetch(url, { next: { revalidate: 5 } }) */
export async function getCachedPrice(): Promise<{ price: number; stale: boolean }> {
  const age = clock - cachedValue.cachedAt;
  const stale = age >= REVALIDATE_WINDOW;
  if (stale) {
    // stale-while-revalidate: return the OLD value now, refresh in the background
    fetchFreshPrice().then((fresh) => {
      cachedValue = { price: fresh, cachedAt: clock };
      console.log(\`[cache] background revalidation complete, new price: \${fresh}\`);
    });
  }
  return { price: cachedValue.price, stale };
}

/** Mirrors revalidateTag("price") / revalidatePath("/price") */
export async function revalidatePriceNow() {
  const fresh = await fetchFreshPrice();
  cachedValue = { price: fresh, cachedAt: clock };
  console.log(\`[cache] on-demand revalidation complete, new price: \${fresh}\`);
}
`;

const priceDisplayStarter = `// Exercise 1: read the cached price and show whether it's stale.
import { getCachedPrice } from "./cache";

export default async function PriceDisplay() {
  // TODO: const { price, stale } = await getCachedPrice();
  return <div className="price-display" />;
}
`;

const priceDisplaySolution = `import { getCachedPrice } from "./cache";

export default async function PriceDisplay() {
  const { price, stale } = await getCachedPrice();
  return (
    <div className="price-display">
      <span className="price-value">{'$'}{price}</span>
      <span className="price-stale">{stale ? "stale — refreshing in background" : "fresh"}</span>
    </div>
  );
}
`;

const controlsStarter = `// Exercise 2 & 3: buttons that advance the fake clock and trigger
// on-demand revalidation. Wire onClick handlers to prove both paths.
"use client";

import { advanceClock, revalidatePriceNow } from "./cache";

export default function CacheControls() {
  return (
    <div className="cache-controls">
      {/* TODO: button that calls advanceClock(6) */}
      {/* TODO: button that calls revalidatePriceNow() */}
    </div>
  );
}
`;

const controlsSolution = `"use client";

import { advanceClock, revalidatePriceNow } from "./cache";

export default function CacheControls() {
  return (
    <div className="cache-controls">
      <button className="advance-clock-btn" onClick={() => advanceClock(6)}>
        Advance clock 6s (past revalidate window)
      </button>
      <button className="revalidate-now-btn" onClick={() => revalidatePriceNow()}>
        Trigger on-demand revalidation
      </button>
    </div>
  );
}
`;

const appCode = `import PriceDisplay from "./PriceDisplay";
import CacheControls from "./CacheControls";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Time-based & on-demand revalidation</h1>
      <PriceDisplay />
      <CacheControls />
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Re-run the sandbox after clicking a control to re-render PriceDisplay
        with the updated cache state.
      </p>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 4.3 sandbox
==================

cache.ts simulates a cached value with a fake clock and a 5-second
revalidate window, mirroring next: { revalidate: 5 } and revalidateTag.

1. Render the cached price and whether it's stale in PriceDisplay.tsx.
2. Wire a button in CacheControls.tsx that advances the clock past the
   revalidate window, then re-run the sandbox to see it flagged stale
   and a background refresh log appear in the console.
3. Wire a second button that triggers revalidatePriceNow() directly —
   on-demand revalidation, independent of the clock.
`,
  },
  { path: "/cache.ts", readOnly: true, code: cacheCode },
  { path: "/PriceDisplay.tsx", code: priceDisplayStarter },
  { path: "/CacheControls.tsx", code: controlsStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/cache.ts", readOnly: true, code: cacheCode },
  { path: "/PriceDisplay.tsx", code: priceDisplaySolution },
  { path: "/CacheControls.tsx", code: controlsSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m4-l3",
  title: "Time-based and on-demand revalidation",
  description:
    "The revalidate option, revalidatePath/revalidateTag, and the stale-while-revalidate model that lets the data cache handle changing data.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Display the cached value and its staleness",
      difficulty: "easy",
      instructions: `In \`PriceDisplay.tsx\`, await \`getCachedPrice()\` from \`cache.ts\` and render the price in a \`<span className="price-value">\` and a staleness message in a \`<span className="price-stale">\`.`,
      validation: [
        { type: "code-includes", file: "/PriceDisplay.tsx", pattern: "await getCachedPrice()", message: "PriceDisplay awaits getCachedPrice()" },
        { type: "dom-exists", selector: "span.price-value", message: "The price renders in a <span class=\"price-value\">" },
        { type: "dom-exists", selector: "span.price-stale", message: "The staleness status renders in a <span class=\"price-stale\">" },
      ],
      hint: `const { price, stale } = await getCachedPrice();`,
    },
    {
      id: "ex2",
      title: "Trigger time-based revalidation",
      difficulty: "medium",
      instructions: `In \`CacheControls.tsx\`, add a \`<button className="advance-clock-btn">\` that calls \`advanceClock(6)\` on click — pushing the fake clock past the 5-second revalidate window so the next \`getCachedPrice()\` call reports stale and kicks off a background refresh.`,
      validation: [
        { type: "code-includes", file: "/CacheControls.tsx", pattern: "advanceClock", message: "CacheControls calls advanceClock" },
        { type: "dom-exists", selector: "button.advance-clock-btn", message: "A <button class=\"advance-clock-btn\"> renders" },
      ],
    },
    {
      id: "ex3",
      title: "Trigger on-demand revalidation",
      difficulty: "hard",
      instructions: `Add a second \`<button className="revalidate-now-btn">\` that calls \`revalidatePriceNow()\` — this mirrors calling \`revalidateTag\`/\`revalidatePath\` from a Server Action right after a mutation, independent of the time-based window.`,
      validation: [
        { type: "code-includes", file: "/CacheControls.tsx", pattern: "revalidatePriceNow", message: "CacheControls calls revalidatePriceNow" },
        { type: "dom-exists", selector: "button.revalidate-now-btn", message: "A <button class=\"revalidate-now-btn\"> renders" },
      ],
      hint: `<button className="revalidate-now-btn" onClick={() => revalidatePriceNow()}>...</button>`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does next: { revalidate: 60 } actually do?",
      options: [
        "Deletes the cached value after 60 seconds",
        "Marks the cached value eligible for a background refresh once it's 60+ seconds old — the stale value is still served immediately in the meantime",
        "Refetches the data every 60 seconds regardless of traffic",
        "Prevents caching entirely after 60 seconds",
      ],
      answerIndex: 1,
      explanation: "revalidate is a staleness threshold, not a deletion timer — stale-while-revalidate serves the old value while refreshing in the background.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A request that triggers a background revalidation waits for that revalidation to finish before responding.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The stale value is served immediately; the refresh happens in the background and benefits only later requests.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "An admin edits a product and the change must be visible immediately, not after a cache window elapses. What's the right tool?",
      options: [
        "Lower revalidate to 1 second globally",
        "Call revalidateTag or revalidatePath from the Server Action that performs the update",
        "Disable caching for the entire route",
        "Ask the user to hard-refresh their browser",
      ],
      answerIndex: 1,
      explanation: "On-demand revalidation invalidates the cache exactly when the underlying data changes, rather than waiting for or shortening a time-based window.",
    },
    {
      id: "q4",
      type: "mcq",
      question: "When would revalidateTag be preferable to revalidatePath?",
      options: [
        "When a single mutation should invalidate several different fetches (possibly across multiple routes) that all touched the same underlying data",
        "revalidateTag is always strictly better",
        "When you don't want anything to be invalidated",
        "revalidatePath doesn't exist in Next.js",
      ],
      answerIndex: 0,
      explanation: "Tags label data by what it represents, not by URL, so one revalidateTag call can clear every place that data was cached, regardless of route.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A team sets revalidate: 1 everywhere \"to be safe\" and now their upstream API is rate-limiting them. What's the underlying mistake?",
      options: [
        "revalidate should always be 0",
        "A very short revalidate window approximates never caching, re-creating the load problem caching was meant to solve",
        "They should switch to on-demand revalidation exclusively and remove all time-based revalidation",
        "revalidate doesn't affect request volume",
      ],
      answerIndex: 1,
      explanation: "Revalidation windows trade freshness for load; setting them too aggressively low means near-constant background refetches, hammering the data source.",
    },
  ],
  keyTakeaways: [
    "next: { revalidate: N } marks cached data stale after N seconds — the stale value is still served instantly while a background refresh happens.",
    "revalidateTag and revalidatePath perform on-demand invalidation, ideal for event-driven changes like a mutation.",
    "Stale-while-revalidate means requests never wait on the network for cached data — they get the current value now, fresh or not.",
    "Shorter revalidate windows trade server/API load for freshness; choose the window based on how often data actually changes.",
  ],
  cheatSheet: `
| Mechanism | Trigger | Use for |
| --- | --- | --- |
| \`next: { revalidate: N }\` | Time elapsed since caching | Data that changes on its own schedule |
| \`revalidateTag(tag)\` | Called manually, anywhere | Invalidating all fetches sharing a tag after a mutation |
| \`revalidatePath(path)\` | Called manually, anywhere | Invalidating one specific route's cached output |
| stale-while-revalidate | Automatic, on any stale hit | Never blocking a request on a refetch |
`,
  interviewQuestions: [
    "What actually happens when a fetch's revalidate window elapses and a new request comes in?",
    "What's the difference between revalidateTag and revalidatePath, and when would you pick one over the other?",
    "Why doesn't stale-while-revalidate ever make a user's request wait on a slow upstream call?",
    "What's the risk of setting a revalidate window too short?",
    "Where in your code should you call revalidateTag after a mutation, and why there specifically?",
    "How would you decide between time-based revalidation and on-demand revalidation for a given piece of data?",
  ],
};

export default lesson;
