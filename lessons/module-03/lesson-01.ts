import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every component you've written so far in this course rendered in the sandbox's browser, because the sandbox is a plain React app. In real Next.js, that's the exception, not the rule: **every component in the \`app\` directory is a Server Component by default.** It runs on the server, produces markup (and a description of the tree), and — unless something forces otherwise — never runs in the browser at all.

## Why this exists — the problem

Classic React ships one artifact to the browser: a JavaScript bundle containing every component, no matter what it does. A markdown renderer, a date-formatting library, a database client accidentally imported three files deep — all of it crosses the network, whether or not the user's screen ever needs it to *run* there.

Server Components attack this directly: a component that only ever produces static or server-fetched markup has **no reason to exist in the browser's JavaScript at all**. If it never runs client-side, it never ships client-side.

## How it works internally

### What runs where

- **Server Components** (the default) execute exclusively on the server — during the build for static routes, or per-request for dynamic ones. Their output is HTML plus a compact description of the component tree, not the component's source code.
- **Client Components** (opted into with \`"use client"\`, covered next lesson) execute on the server *once* for the initial HTML, then again in the browser during hydration, and from then on live entirely client-side.

::diagram{server-component-boundary}

### The RSC payload

Next.js doesn't just send HTML. Alongside it (and on every subsequent navigation) it sends the **React Server Component payload** — a serialized description of the rendered tree: which DOM nodes came from which components, and where Client Component "slots" go. The browser uses this payload to reconcile the tree instead of re-running your server logic. This is *why* client-side navigations feel instant even though new data was fetched: the server did the work, the payload just describes the result.

### Zero-JS-shipped, literally

Open your browser's Network tab on a page built entirely from Server Components: no JS bundle contains their code. Not minified, not lazy-loaded — **absent**. This isn't an optimization Next.js applies after the fact; it's a consequence of Server Components never being compiled for the client bundle at all.

### Async components

Because Server Components run on the server before any HTML is sent, they can be \`async function\` components and \`await\` directly inside the JSX-returning function — no \`useEffect\`, no loading state juggling:

\`\`\`tsx
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);   // real await, right in the component
  return <h1>{product.name}</h1>;
}
\`\`\`
There is no client-side equivalent of this — a Client Component's function body can't be \`async\`, because React needs to call it synchronously to render.

### Why console.log surprises everyone

A Server Component's code runs on the server process, not in the visitor's browser. So:

\`\`\`tsx
export default function Page() {
  console.log("rendering Page");   // appears in your terminal, never DevTools
  return <h1>Hi</h1>;
}
\`\`\`

This single fact trips up nearly every developer coming from client-only React, where \`console.log\` always meant "check DevTools."

## The sandbox in this lesson

This sandbox can't run a real Node server, so \`framework.tsx\` (read-only) simulates the contract with \`ServerBoundary\` and \`ClientBoundary\` wrapper components. \`ServerBoundary\` renders its content exactly once, up front — modeling "runs ahead of time, ships no re-render capability" — while \`ClientBoundary\` renders normal, stateful React. Watch the console panel: logs from inside the server boundary appear once and never again, no matter how much you interact with the client boundary below it.

## Common mistakes

- **Assuming Server Components re-render on interaction.** They render once per request/build. Only Client Components re-render from state changes.
- **Importing server-only code into a Client Component.** A database client or secret-reading module imported (even indirectly) into client code will either crash the build or leak into the bundle.
- **Expecting \`console.log\` in a Server Component to show up in DevTools.** Check your terminal.

## Best practices

- Default to Server Components everywhere; add \`"use client"\` only at the specific leaf that needs interactivity (next lesson).
- Keep data fetching and heavy dependencies (parsers, formatters, SDKs) in Server Components so they never enter the client bundle.
- Use \`async\`/\`await\` directly in Server Components instead of client-side fetch-in-\`useEffect\` patterns.

## Performance considerations

Every line of code that stays in a Server Component is JavaScript your users never download, parse, or execute. On a data-heavy dashboard, this can be the difference between shipping 30 KB and 300 KB of JS for the same rendered page.
`;

const frameworkCode = `// framework.tsx — READ-ONLY.
// This sandbox runs everything in the browser, so it can't demonstrate a
// real Node server. Instead it SIMULATES the contract Next.js enforces:
//
//   ServerBoundary — renders its content exactly once, synchronously,
//   before anything else happens. Nothing inside it ever re-renders from
//   state, because in real Next.js it never ships state-handling JS at all.
//
//   ClientBoundary — a plain, ordinary, always-interactive React subtree —
//   exactly what a "use client" component becomes after hydration.
import React from "react";

export function ServerBoundary({ render }: { render: () => React.ReactNode }) {
  const output = React.useMemo(() => render(), []); // run once, like a real request
  return (
    <div
      className="boundary boundary-server"
      data-boundary="server"
      style={{ border: "2px solid #16a34a", borderRadius: 8, padding: 16, margin: "12px 0" }}
    >
      <span
        className="boundary-badge"
        style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: 1 }}
      >
        SERVER — 0 KB shipped
      </span>
      <div style={{ marginTop: 8 }}>{output}</div>
    </div>
  );
}

export function ClientBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="boundary boundary-client"
      data-boundary="client"
      style={{ border: "2px solid #2563eb", borderRadius: 8, padding: 16, margin: "12px 0" }}
    >
      <span
        className="boundary-badge"
        style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", letterSpacing: 1 }}
      >
        CLIENT — hydrated, interactive
      </span>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}
`;

const serverHeaderStarter = `// This file simulates a Server Component: it takes no interactive state
// and is only ever called once by ServerBoundary, up front.
export default function ServerHeader() {
  return (
    <div>
      {/* Exercise 1: add an <h1 className="site-title"> and a
          <p className="build-time"> with a static string like "Built at 10:32 AM" */}
    </div>
  );
}
`;

const serverHeaderSolution = `export default function ServerHeader() {
  console.log("[server] ServerHeader rendering — runs once, ahead of time");
  return (
    <div>
      <h1 className="site-title">Next.js Academy Storefront</h1>
      <p className="build-time">Built at 10:32 AM</p>
    </div>
  );
}
`;

const counterStarter = `// Exercise 3: turn this into a Client Component — it needs to hold state,
// which only Client Components can do.

export default function Counter() {
  return <button className="counter-btn">Count: 0</button>;
}
`;

const counterSolution = `"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button className="counter-btn" onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
`;

const appCode = `import { ServerBoundary, ClientBoundary } from "./framework";
import ServerHeader from "./ServerHeader";
import Counter from "./Counter";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Server vs Client Components</h1>
      <ServerBoundary render={() => <ServerHeader />} />
      <ClientBoundary>
        <Counter />
      </ClientBoundary>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.1 sandbox
==================

framework.tsx simulates the Server/Client boundary: ServerBoundary
renders once, up front; ClientBoundary is ordinary interactive React.

1. Finish ServerHeader.tsx (a simulated Server Component).
2. Add a console.log inside it and watch the console panel as you
   click the counter — the server log never repeats.
3. Turn Counter.tsx into a real Client Component.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/ServerHeader.tsx", code: serverHeaderStarter },
  { path: "/Counter.tsx", code: counterStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/ServerHeader.tsx", code: serverHeaderSolution },
  { path: "/Counter.tsx", code: counterSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m3-l1",
  title: "Server Components in depth",
  description:
    "What runs where, the RSC payload, the zero-JS-shipped guarantee, async components, and why console.log shows up in your terminal.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Build the simulated Server Component",
      difficulty: "easy",
      instructions: `In \`ServerHeader.tsx\`, render an \`<h1 className="site-title">\` with any site name, and a \`<p className="build-time">\` with a static string like "Built at 10:32 AM". This component simulates a Server Component: it receives no props for interactivity and no state.`,
      validation: [
        { type: "dom-exists", selector: ".boundary-server h1.site-title", message: "The server boundary renders an <h1 class=\"site-title\">" },
        { type: "dom-exists", selector: ".boundary-server p.build-time", message: "The server boundary renders a <p class=\"build-time\">" },
      ],
      hint: `<h1 className="site-title">My Store</h1>`,
    },
    {
      id: "ex2",
      title: "Prove it only runs once",
      difficulty: "medium",
      instructions: `Add \`console.log("[server] ServerHeader rendering")\` inside \`ServerHeader\`, before the \`return\`. Run the sandbox, open the console panel, then click the counter in the Client boundary several times. Notice the server log appears exactly once — clicking the client component never re-runs it.`,
      validation: [
        { type: "code-includes", file: "/ServerHeader.tsx", pattern: "console.log", message: "ServerHeader logs when it renders" },
        { type: "code-includes", file: "/ServerHeader.tsx", pattern: "[server]", message: "The log is tagged so you can spot it in the console panel" },
      ],
    },
    {
      id: "ex3",
      title: "Make Counter a real Client Component",
      difficulty: "hard",
      instructions: `In \`Counter.tsx\`, add \`"use client"\` as the very first line, import \`useState\` from \`react\`, hold a \`count\` state variable starting at 0, and render a button showing \`Count: {count}\` that increments on click.`,
      validation: [
        { type: "code-includes", file: "/Counter.tsx", pattern: "use client", message: "The file starts with the \"use client\" directive" },
        { type: "code-includes", file: "/Counter.tsx", pattern: "useState", message: "Counter holds state with useState" },
        { type: "code-includes", file: "/Counter.tsx", pattern: "onClick", message: "The button has a click handler" },
        { type: "dom-exists", selector: ".boundary-client button.counter-btn", message: "The client boundary renders the counter button" },
      ],
      hint: `const [count, setCount] = useState(0);`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "In the App Router, what is every component by default?",
      options: [
        "A Client Component, unless marked otherwise",
        "A Server Component — it renders only on the server unless \"use client\" opts it into the browser",
        "Rendered both on the server and in the browser automatically",
        "Undefined until you configure a rendering mode",
      ],
      answerIndex: 1,
      explanation: "The App Router's default is server-first. Client Components are the opt-in, not the default.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A Server Component can use useState to hold interactive state.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Server Components never re-render from state changes in the browser, so hooks like useState (and useEffect) aren't available to them.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "What can this component do that a Client Component's function body cannot?",
      code: `export default async function ProductPage({ params }) {\n  const { id } = await params;\n  const product = await getProduct(id);\n  return <h1>{product.name}</h1>;\n}`,
      options: [
        "Use JSX",
        "Accept props",
        "Be declared as an async function and await directly inside it",
        "Render an <h1> tag",
      ],
      answerIndex: 2,
      explanation: "Server Components can be async functions with real awaits in the render path — React needs to call Client Components synchronously, so they can't.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A component using useState throws \"useState only works in a Client Component\" at build time. What's the fix?",
      options: [
        "Remove the component entirely",
        "Add the \"use client\" directive at the top of that file",
        "Rename the function",
        "Move the component into layout.tsx",
      ],
      answerIndex: 1,
      explanation: "Any component using state or effects needs \"use client\" at the top of its file to opt out of the server-only default.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "What does the RSC payload sent alongside (or instead of) HTML actually contain?",
      options: [
        "The full source code of every Server Component, minified",
        "A serialized description of the rendered tree, including where Client Component slots go",
        "A screenshot of the rendered page",
        "Nothing — Next.js only ever sends plain HTML",
      ],
      answerIndex: 1,
      explanation: "The payload lets the browser reconcile the tree using the server's already-computed result, instead of re-running server logic client-side.",
    },
  ],
  keyTakeaways: [
    "Every component under app/ is a Server Component by default — the browser is opt-in, not the default.",
    "Server Components run once per request/build, produce HTML + an RSC payload, and ship zero JS for their own code.",
    "Only Server Components can be async functions with direct await in the render path.",
    "console.log in a Server Component prints to your terminal, never to DevTools.",
  ],
  cheatSheet: `
| | Server Component | Client Component |
| --- | --- | --- |
| Runs | Server only | Server (first paint) + browser |
| Can use useState/useEffect | No | Yes |
| Can be async with await | Yes | No |
| JS shipped to browser | None | Its own bundle |
| console.log appears in | Terminal | DevTools |
`,
  interviewQuestions: [
    "Why is the App Router's default rendering location the server, not the browser?",
    "What is the RSC payload and why does it make client-side navigation feel instant?",
    "Why can a Server Component's function body be async, but a Client Component's cannot?",
    "Where would console.log output from a Server Component appear, and why does that surprise people?",
    "What class of bugs comes from importing server-only code into a Client Component?",
    "How does shipping zero JS for Server Components change how you'd architect a data-heavy page?",
  ],
};

export default lesson;
