import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every page you've built so far in this module either rendered static markup or read local component state. Real applications need data from somewhere else — a database, a CMS, a third-party API. In the pages router, that meant \`getServerSideProps\` or \`getStaticProps\`: special exported functions with their own signature, running in a separate lifecycle from your component. The App Router deletes that separation. **A Server Component can just \`await\` its data, inline, in the function body that also returns JSX.**

## Why this exists — the problem

\`getServerSideProps\`/\`getStaticProps\` forced an awkward split: data lived in one function, UI lived in another, and passing information between them meant serializing everything through a \`props\` object at a page's top level. Nested components that needed their own data had to either receive it drilled down from the page, or fetch client-side in a \`useEffect\` — with all the loading-state juggling that implies. There was no way for a *component three levels deep* to simply fetch what it needed, where it needed it.

Server Components remove the ceremony. Because the component itself runs on the server, it can be an \`async function\` and \`await\` a data source directly, at any depth in the tree — a product card can fetch its own reviews without the page ever knowing.

## How it works internally

### "Just await it"

\`\`\`tsx
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id); // real network/database call
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{'$'}{product.price}</p>
    </article>
  );
}
\`\`\`

There's no \`useEffect\`, no \`isLoading\` state, no \`useState\` for the fetched value. The function doesn't return until \`getProduct\` resolves, so by the time JSX is produced, the data already exists. This is possible *only* because Server Components render ahead of time on the server — a Client Component's function body can't be async, since React must call it synchronously to render and re-render it.

::diagram{fetch-waterfall}

### What "just await it" means for the render pipeline

When Next.js renders a route, it walks the Server Component tree top-down. Every \`await\` inside a Server Component **pauses that branch** until the promise resolves — the rest of the tree keeps progressing where it can (especially once you add \`<Suspense>\`, covered in Module 3's streaming lesson). Two \`await\`s written back-to-back in the *same* component are sequential by default: the second doesn't start until the first finishes. That's the "waterfall" in the diagram above — and it's the single most common accidental performance bug in Server Component data fetching. (Fixing it with \`Promise.all\` is the subject of lesson 4.5.)

### Errors: try/catch vs error.tsx

Two different failure modes need two different tools:

- **Expected, recoverable failures** (a 404 from an API, a missing record) — handle with a normal \`try/catch\` around the \`await\`, and render a fallback UI yourself:

\`\`\`tsx
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product;
  try {
    product = await getProduct(id);
  } catch {
    return <p>Couldn&apos;t load this product. Try again later.</p>;
  }
  return <h1>{product.name}</h1>;
}
\`\`\`

- **Unexpected, unhandled failures** (a thrown error nobody caught) — Next.js walks up the tree looking for the nearest \`error.tsx\` in that route segment and renders it instead of crashing the whole page. \`error.tsx\` is a Client Component (it needs a \`reset()\` function to retry), and it only catches errors thrown *during rendering* — not ones already caught by your own \`try/catch\`.

The rule of thumb: reach for \`try/catch\` when you know a failure is possible and want a specific fallback; let \`error.tsx\` catch everything else as a safety net.

## The sandbox in this lesson

\`db.ts\` (read-only) simulates a real data source: \`sleep(ms)\` plus a \`getUser\`/\`getPosts\` pair of async functions that behave like network calls, including an artificial delay. You'll build a component that awaits them directly — no \`useEffect\`, no loading state — the way a Server Component would.

## Common mistakes

- **Wrapping every fetch in a client-side \`useEffect\`** out of habit from the pages router — inside a Server Component, this is unnecessary and actively slower (it delays the fetch until after hydration).
- **Forgetting that two sequential \`await\`s block each other** — see lesson 4.5 for the fix.
- **Using \`error.tsx\` for failures you already know how to handle gracefully** — that's what \`try/catch\` is for; \`error.tsx\` is the fallback for the unexpected.

## Best practices

- Fetch data as close as possible to the component that renders it — don't fetch at the top and drill props down.
- Use \`try/catch\` for anticipated failure paths with a specific UI; leave \`error.tsx\` as the catch-all.
- Treat every \`await\` in a Server Component as adding to that branch's render time — group independent ones (lesson 4.5).

## Performance considerations

Because the component doesn't return until its data is ready, the *slowest* awaited call in a branch sets that branch's minimum render time. Understanding this is the foundation for everything else in this module: memoization, caching and revalidation all exist to make that unavoidable wait cheaper to repeat.
`;

const dbCode = `// db.ts — READ-ONLY. Simulates a real, slow data source without a network.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER = { id: "u1", name: "Priya Shah", role: "Staff Engineer" };
const POSTS = [
  { id: "p1", title: "Why we moved to the App Router" },
  { id: "p2", title: "Debugging a fetch waterfall" },
];

export async function getUser(): Promise<typeof USER> {
  await sleep(400); // pretend this is a database round trip
  console.log("[db] getUser resolved");
  return USER;
}

export async function getPosts(): Promise<typeof POSTS> {
  await sleep(300);
  console.log("[db] getPosts resolved");
  return POSTS;
}

export async function getFlakyStat(): Promise<{ views: number }> {
  await sleep(200);
  throw new Error("stats service unavailable");
}
`;

const profileStarter = `// Exercise 1 & 2: this simulates an async Server Component. Await getUser()
// and getPosts() directly in the function body — no useState, no useEffect.
import { getUser, getPosts } from "./db";

export default async function Profile() {
  // TODO: const user = await getUser();
  // TODO: const posts = await getPosts();
  return (
    <div>
      {/* render user.name, user.role, and a <ul> of post titles */}
    </div>
  );
}
`;

const profileSolution = `import { getUser, getPosts } from "./db";

export default async function Profile() {
  const user = await getUser();
  const posts = await getPosts();
  return (
    <div>
      <h2 className="user-name">{user.name}</h2>
      <p className="user-role">{user.role}</p>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
`;

const statStarter = `// Exercise 3: getFlakyStat() always throws. Await it inside a try/catch
// and render a fallback <p className="stat-error"> instead of crashing.
import { getFlakyStat } from "./db";

export default async function StatWidget() {
  // TODO: try/catch around await getFlakyStat()
  return <div className="stat-widget" />;
}
`;

const statSolution = `import { getFlakyStat } from "./db";

export default async function StatWidget() {
  try {
    const stat = await getFlakyStat();
    return <div className="stat-widget">{stat.views} views</div>;
  } catch {
    return (
      <div className="stat-widget">
        <p className="stat-error">Couldn&apos;t load this stat right now.</p>
      </div>
    );
  }
}
`;

const appCode = `import Profile from "./Profile";
import StatWidget from "./StatWidget";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Server Component data fetching</h1>
      <Profile />
      <StatWidget />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 4.1 sandbox
==================

db.ts simulates a slow data source with sleep(ms). Profile.tsx and
StatWidget.tsx simulate async Server Components: they can be async
functions and await directly in the render path.

1. Await getUser() and getPosts() in Profile.tsx and render the result.
2. Watch the console panel — each simulated call logs once it resolves.
3. StatWidget's getFlakyStat() always throws. Catch it with try/catch
   and render a fallback instead of crashing.
`,
  },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/Profile.tsx", code: profileStarter },
  { path: "/StatWidget.tsx", code: statStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/Profile.tsx", code: profileSolution },
  { path: "/StatWidget.tsx", code: statSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m4-l1",
  title: "Data fetching in Server Components",
  description:
    "Awaiting data directly inside async Server Components, why this replaces getServerSideProps/getStaticProps, and error handling with try/catch vs error.tsx.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Await getUser() directly",
      difficulty: "easy",
      instructions: `In \`Profile.tsx\`, \`await getUser()\` inside the async function body and render an \`<h2 className="user-name">\` with the user's name and a \`<p className="user-role">\` with their role.`,
      validation: [
        { type: "code-includes", file: "/Profile.tsx", pattern: "await getUser()", message: "Profile awaits getUser() directly" },
        { type: "dom-exists", selector: "h2.user-name", message: "The user's name renders in an <h2 class=\"user-name\">" },
        { type: "dom-exists", selector: "p.user-role", message: "The user's role renders in a <p class=\"user-role\">" },
      ],
      hint: `const user = await getUser(); return <h2 className="user-name">{user.name}</h2>;`,
    },
    {
      id: "ex2",
      title: "Add a second await for posts",
      difficulty: "medium",
      instructions: `Also \`await getPosts()\` in \`Profile.tsx\` and render a \`<ul className="post-list">\` with an \`<li>\` per post title. Open the console panel and confirm both "[db] getUser resolved" and "[db] getPosts resolved" appear before the component's output shows up.`,
      validation: [
        { type: "code-includes", file: "/Profile.tsx", pattern: "await getPosts()", message: "Profile also awaits getPosts()" },
        { type: "dom-exists", selector: "ul.post-list", message: "A <ul class=\"post-list\"> renders" },
        { type: "dom-count", selector: "ul.post-list li", min: 2, message: "At least two posts render as <li> items" },
      ],
    },
    {
      id: "ex3",
      title: "Handle a failing fetch with try/catch",
      difficulty: "hard",
      instructions: `\`getFlakyStat()\` in \`db.ts\` always throws. In \`StatWidget.tsx\`, wrap the \`await\` in a \`try/catch\` and render a \`<p className="stat-error">\` fallback message in the \`catch\` branch instead of letting the component crash.`,
      validation: [
        { type: "code-includes", file: "/StatWidget.tsx", pattern: "try", message: "StatWidget uses a try block around the await" },
        { type: "code-includes", file: "/StatWidget.tsx", pattern: "catch", message: "StatWidget has a catch branch" },
        { type: "dom-exists", selector: "p.stat-error", message: "The fallback error message renders" },
      ],
      hint: `try { const stat = await getFlakyStat(); ... } catch { return <p className="stat-error">...</p>; }`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What replaces getServerSideProps/getStaticProps in the App Router?",
      options: [
        "A new exported function called getData()",
        "Awaiting data directly inside an async Server Component",
        "A global fetch() call in next.config.mjs",
        "Nothing — the pages router functions still work in app/",
      ],
      answerIndex: 1,
      explanation: "The App Router lets any Server Component be async and await its own data, at any depth — no separate data-fetching function required.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A Client Component's function body can be declared async, just like a Server Component's.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "React must call Client Components synchronously to render them, so their function bodies can't be async — only Server Components can await directly in the render path.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "Two awaits are written back-to-back in the same Server Component: await getUser() then await getPosts(). What happens?",
      code: `async function Page() {\n  const user = await getUser();\n  const posts = await getPosts();\n  return <div>{user.name}</div>;\n}`,
      options: [
        "Both start at the same time automatically",
        "getPosts() doesn't start until getUser() resolves — they run sequentially",
        "Next.js parallelizes any two awaits automatically",
        "This throws a build error",
      ],
      answerIndex: 1,
      explanation: "Sequential awaits in the same function are exactly that — sequential. Nothing parallelizes them unless you use Promise.all (lesson 4.5).",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A component throws an unhandled error during rendering and the whole page crashes with a generic error screen. What's the idiomatic fix?",
      options: [
        "Wrap every component in the app in try/catch",
        "Add an error.tsx file in that route segment to catch and gracefully render the failure",
        "Disable server rendering for that route",
        "Move the fetch into a useEffect",
      ],
      answerIndex: 1,
      explanation: "error.tsx is Next.js's safety net for errors that occur during rendering and weren't already handled — it replaces the crashed segment with a recoverable UI.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "When should you use try/catch instead of relying on error.tsx?",
      options: [
        "Never — always let error.tsx handle everything",
        "When a failure is anticipated and you want a specific fallback rendered inline, rather than the whole segment replaced",
        "Only in Client Components",
        "try/catch doesn't work in Server Components",
      ],
      answerIndex: 1,
      explanation: "try/catch is for known, recoverable failure paths with a targeted fallback; error.tsx is the catch-all for the unexpected.",
    },
  ],
  keyTakeaways: [
    "Server Components can be async functions and await data directly in the render path — no useEffect, no loading state.",
    "This replaces getServerSideProps/getStaticProps entirely; data fetching happens wherever it's needed in the tree, not just at the page top level.",
    "Sequential awaits in one component block each other; that waterfall is the default unless you parallelize (lesson 4.5).",
    "Use try/catch for anticipated failures with a specific fallback; use error.tsx as the safety net for unhandled errors during rendering.",
  ],
  cheatSheet: `
| Pages router | App Router |
| --- | --- |
| \`getServerSideProps\` | \`await\` inside an async Server Component |
| \`getStaticProps\` | \`await\` inside an async Server Component (cached by default) |
| Data only at the page level | Any component at any depth can fetch its own data |
| Client-side \`useEffect\` fetch + loading state | Not needed — the server waits before responding |
| Uncaught render error → generic crash | \`error.tsx\` in the route segment |
`,
  interviewQuestions: [
    "How does data fetching in the App Router differ from getServerSideProps/getStaticProps?",
    "Why can a Server Component's function body be async when a Client Component's cannot?",
    "What happens to the render pipeline when a Server Component awaits a slow call — does the rest of the page wait too?",
    "When would you reach for try/catch versus error.tsx for a failed fetch?",
    "What's an accidental fetch waterfall, and where does it come from by default?",
    "Why does fetching data closer to the component that needs it (instead of drilling props) matter architecturally?",
  ],
};

export default lesson;
