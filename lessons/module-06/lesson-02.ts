import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

A Route Handler or page only runs once Next.js has already decided which file answers a request. **Middleware** runs *before* that decision — a single function, defined once at the project root, that sees every matching request first and can redirect it, rewrite it, or let it continue completely unchanged.

## Why this exists — the problem

Some logic needs to apply across many routes at once, before any of them render: "if there's no session cookie, send the user to /login," "if this URL is a legacy path, serve the new one without changing what's in the address bar," "bucket this visitor into an A/B test." Doing that inside every individual page or Route Handler means repeating the same check dozens of times and hoping nobody forgets it on a new route. Middleware puts that check in exactly one place, in front of everything it applies to.

## How it works internally

### One file, a matcher, and the Edge Runtime

\`\`\`ts
// middleware.ts — project root (same level as app/)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("session");
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
\`\`\`

\`config.matcher\` limits which requests run through \`middleware\` at all — here, only paths under \`/dashboard\`. Without a matcher, middleware runs on every request, including static assets, which is usually wasteful.

Middleware runs on the **Edge Runtime**, a lighter, faster-starting JavaScript environment than the full Node.js runtime your pages and Route Handlers can use. It gives you the Fetch API, \`Request\`/\`Response\`, and a subset of Web APIs — but not full Node.js (no filesystem access, no arbitrary npm packages that depend on Node internals). This isn't an arbitrary restriction: middleware sits on the hot path of *every matched request* your app serves, so it needs to start and finish fast enough that it's not a noticeable tax on every navigation.

::diagram{middleware-pipeline}

### The three outcomes

Every middleware function resolves to one of three things:

- **Pass through** — \`NextResponse.next()\` — the request continues to the router exactly as if middleware didn't exist.
- **Redirect** — \`NextResponse.redirect(url)\` — the browser is told to navigate somewhere else; the URL bar changes.
- **Rewrite** — \`NextResponse.rewrite(url)\` — the router serves a *different* path's content, but the URL bar stays what the user requested. Useful for A/B tests (serve \`/experiments/b\` while the visible URL stays \`/\`) or masking internal structure.

### Reading and writing headers and cookies

\`\`\`ts
export function middleware(request: NextRequest) {
  const bucket = request.cookies.get("ab-bucket")?.value ?? (Math.random() < 0.5 ? "a" : "b");
  const response = NextResponse.next();
  response.cookies.set("ab-bucket", bucket);
  response.headers.set("x-ab-bucket", bucket);
  return response;
}
\`\`\`

Middleware can read incoming cookies/headers and set outgoing ones on whichever response it returns — this is how A/B bucketing, feature flags, and lightweight auth gates are usually implemented.

## The sandbox in this lesson

Real middleware runs in the actual Edge Runtime, on a real request, before an actual router dispatches anything — none of that exists inside a browser tab. \`framework.tsx\` (read-only) simulates the *shape* of the pipeline only: a fake request object (\`{ path, cookies }\`) is passed to your \`middleware\` function first; based on what it returns, the simulator either short-circuits (redirect), swaps which page component renders while keeping the visible path (rewrite), or hands off to the page router exactly as Module 2's router simulator did. \`NextResponse\`-shaped helpers (\`next()\`, \`redirect()\`, \`rewrite()\`) are recreated locally as plain objects — the real ones come from \`next/server\`, which isn't available in this browser sandbox.

## Common mistakes

- **No matcher, so middleware runs on every request** — including static assets and files it never needed to inspect, adding latency across the board.
- **Doing heavy work in middleware** — a database call or a slow computation here taxes every matched request, not just the one page that needed it. Keep middleware to cheap checks (cookies, headers, simple redirects).
- **Confusing redirect and rewrite** — a redirect changes the URL the user sees; a rewrite doesn't. Using the wrong one either exposes internal routes or breaks user-facing navigation expectations (e.g. bookmarking).
- **Treating middleware as a full replacement for page-level auth** — it's a good place for a *first* gate (Lesson 6.3), but the page/Server Component should still verify the session itself rather than trusting that middleware always ran correctly for every possible request path.

## Best practices

- Scope \`matcher\` as narrowly as the behavior actually needs.
- Keep the function itself fast: simple cookie/header checks, not data fetching.
- Use redirect when the user should see a different URL; use rewrite when they shouldn't.
- Treat middleware as the first line of defense, not the only one — pair it with the checks in Lesson 6.3.

## Performance considerations

Because middleware runs on the Edge Runtime, deployed at the network edge closest to the user, a redirect or rewrite decision can happen with very low latency compared to routing all the way to an origin server first. That benefit only holds if the middleware function itself stays lightweight — an expensive computation here erases the latency advantage the Edge Runtime was chosen for.
`;

const middlewareStarter = `// middleware.ts — the file you edit for every exercise.
// Real middleware imports NextResponse from "next/server"; this sandbox
// recreates the same three outcomes as plain local objects (see framework.tsx).

export type FakeRequest = {
  path: string;
  cookies: Record<string, string>;
};

export type MiddlewareResult =
  | { action: "next" }
  | { action: "redirect"; path: string }
  | { action: "rewrite"; path: string };

export function middleware(request: FakeRequest): MiddlewareResult {
  // TODO Exercise 1: if request.path starts with "/dashboard" and there is
  // no "session" cookie, redirect to "/login".

  // TODO Exercise 2: if request.path is exactly "/old-page", rewrite it to
  // "/new-page" (the visible path should stay "/old-page").

  // TODO Exercise 3: for "/", bucket the visitor with the "ab-bucket" cookie
  // (defaulting to "a" when missing) and rewrite to "/variant-a" or
  // "/variant-b" accordingly.

  return { action: "next" };
}

export const matcher = ["/dashboard/:path*", "/old-page", "/"];
`;

const middlewareSolution = `export type FakeRequest = {
  path: string;
  cookies: Record<string, string>;
};

export type MiddlewareResult =
  | { action: "next" }
  | { action: "redirect"; path: string }
  | { action: "rewrite"; path: string };

export function middleware(request: FakeRequest): MiddlewareResult {
  if (request.path.startsWith("/dashboard") && !request.cookies.session) {
    return { action: "redirect", path: "/login" };
  }

  if (request.path === "/old-page") {
    return { action: "rewrite", path: "/new-page" };
  }

  if (request.path === "/") {
    const bucket = request.cookies["ab-bucket"] ?? "a";
    return { action: "rewrite", path: bucket === "a" ? "/variant-a" : "/variant-b" };
  }

  return { action: "next" };
}

export const matcher = ["/dashboard/:path*", "/old-page", "/"];
`;

const frameworkCode = `// framework.tsx — READ-ONLY. Simulates the request pipeline: middleware
// runs first; its result decides whether the router ever sees the request.
import React, { useState } from "react";
import { middleware, type FakeRequest } from "./middleware";

type RouteTable = Record<string, React.ComponentType>;

export function usePipeline(routes: RouteTable, initialCookies: Record<string, string>) {
  const [path, setPath] = useState("/dashboard");
  const [cookies, setCookies] = useState(initialCookies);
  const [log, setLog] = useState<string[]>([]);

  function navigate(target: string) {
    const request: FakeRequest = { path: target, cookies };
    const result = middleware(request);

    if (result.action === "redirect") {
      setLog((l) => [...l, \`middleware redirected \${target} → \${result.path}\`]);
      setPath(result.path);
      return;
    }
    if (result.action === "rewrite") {
      setLog((l) => [...l, \`middleware rewrote \${target} → \${result.path} (URL stays \${target})\`]);
      setPath(target); // visible path unchanged
      renderPath.current = result.path;
      return;
    }
    setLog((l) => [...l, \`middleware passed \${target} through unchanged\`]);
    setPath(target);
    renderPath.current = target;
  }

  const renderPath = React.useRef(path);
  const Page = routes[renderPath.current] ?? (() => <p>404 — Not Found</p>);

  return { path, navigate, log, Page, setCookies, cookies };
}
`;

const appCode = `import { usePipeline } from "./framework";

function Dashboard() {
  return <main style={{ padding: 24 }}><h1>Dashboard</h1><p>Protected content.</p></main>;
}
function Login() {
  return <main style={{ padding: 24 }}><h1>Login</h1></main>;
}
function NewPage() {
  return <main style={{ padding: 24 }}><h1>New Page</h1><p>Served for /old-page too.</p></main>;
}
function VariantA() {
  return <main style={{ padding: 24 }}><h1>Home — Variant A</h1></main>;
}
function VariantB() {
  return <main style={{ padding: 24 }}><h1>Home — Variant B</h1></main>;
}

const routes = {
  "/dashboard": Dashboard,
  "/login": Login,
  "/new-page": NewPage,
  "/variant-a": VariantA,
  "/variant-b": VariantB,
};

export default function App() {
  const { path, navigate, log, Page, cookies, setCookies } = usePipeline(routes, {});

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate("/dashboard")}>Go to /dashboard</button>
        <button onClick={() => navigate("/old-page")}>Go to /old-page</button>
        <button onClick={() => navigate("/")}>Go to /</button>
        <button
          onClick={() =>
            setCookies((c: Record<string, string>) => ({ ...c, session: c.session ? "" : "abc123" }))
          }
        >
          Toggle session cookie ({cookies.session ? "logged in" : "logged out"})
        </button>
      </div>
      <p>Visible path: <code className="visible-path">{path}</code></p>
      <div className="pipeline-log">
        {log.map((entry, i) => (
          <p key={i} style={{ fontSize: 12, color: "#888" }}>{entry}</p>
        ))}
      </div>
      <hr />
      <Page />
    </div>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6.2 sandbox
==================

framework.tsx runs your middleware function before deciding what to render,
the same order a real Next.js server applies middleware before routing.

1. Redirect unauthenticated visits to /dashboard to /login.
2. Rewrite /old-page to /new-page while keeping the visible URL.
3. Bucket "/" into a variant using the ab-bucket cookie.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/middleware.ts", code: middlewareStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/middleware.ts", code: middlewareSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m6-l2",
  title: "Middleware & the edge",
  description:
    "middleware.ts and matcher config, why middleware runs before routing on the Edge Runtime, and the three outcomes — pass through, redirect, and rewrite.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Gate /dashboard behind a session cookie",
      difficulty: "easy",
      instructions: `In \`middleware.ts\`, redirect to \`/login\` when \`request.path\` starts with \`"/dashboard"\` and there's no \`session\` cookie. Click **Go to /dashboard** while logged out and confirm you land on the Login page; toggle the session cookie on and confirm you now reach the Dashboard.`,
      validation: [
        { type: "code-includes", file: "/middleware.ts", pattern: "startsWith(\"/dashboard\")", message: "middleware checks for the /dashboard path" },
        { type: "code-includes", file: "/middleware.ts", pattern: "\"redirect\"", message: "middleware returns a redirect action" },
      ],
      hint: `if (request.path.startsWith("/dashboard") && !request.cookies.session) {\n  return { action: "redirect", path: "/login" };\n}`,
    },
    {
      id: "ex2",
      title: "Rewrite /old-page to /new-page",
      difficulty: "medium",
      instructions: `Rewrite requests for \`"/old-page"\` to \`"/new-page"\`. Click **Go to /old-page** and confirm the New Page content renders while \`visible-path\` still reads \`/old-page\`.`,
      validation: [
        { type: "code-includes", file: "/middleware.ts", pattern: "\"rewrite\"", message: "middleware returns a rewrite action" },
        { type: "code-includes", file: "/middleware.ts", pattern: "/new-page", message: "middleware rewrites to /new-page" },
      ],
    },
    {
      id: "ex3",
      title: "A/B bucket the home page",
      difficulty: "hard",
      instructions: `For path \`"/"\`, read the \`ab-bucket\` cookie (default to \`"a"\` when missing) and rewrite to \`"/variant-a"\` or \`"/variant-b"\` accordingly. Click **Go to /** and confirm one of the variant pages renders.`,
      validation: [
        { type: "code-includes", file: "/middleware.ts", pattern: "ab-bucket", message: "middleware reads the ab-bucket cookie" },
        { type: "code-regex", file: "/middleware.ts", regex: "variant-a|variant-b", message: "middleware rewrites to a variant path" },
      ],
      hint: `const bucket = request.cookies["ab-bucket"] ?? "a";\nreturn { action: "rewrite", path: bucket === "a" ? "/variant-a" : "/variant-b" };`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "When does middleware run relative to Next.js's router matching a page or Route Handler?",
      options: [
        "After the route has already rendered",
        "Before routing — it sees the request first and can redirect, rewrite, or pass it through",
        "Only for static assets",
        "Only on the client, after hydration",
      ],
      answerIndex: 1,
      explanation: "Middleware intercepts every matched request before the router decides which file answers it.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Middleware runs on the Edge Runtime, which supports the full Node.js API surface.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The Edge Runtime is deliberately lighter than Node.js — no filesystem access, no arbitrary Node-dependent packages — so it can start and finish fast on every matched request.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "A visitor requests /old-page. Middleware rewrites it to /new-page. What does the visitor's address bar show?",
      options: [
        "/new-page",
        "/old-page — a rewrite serves different content without changing the visible URL",
        "A 404 page",
        "Both URLs alternately",
      ],
      answerIndex: 1,
      explanation: "Rewrite swaps what's served while keeping the URL the user requested; redirect is what changes the visible URL.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "What's wrong with this middleware.ts?",
      code: `export function middleware(request: NextRequest) {\n  const stats = await db.analytics.record(request.url); // heavy DB write\n  return NextResponse.next();\n}\n\nexport const config = {}; // no matcher`,
      options: [
        "Nothing — middleware can do any work it wants",
        "It has no matcher (runs on every request, including assets) and does a slow database write on the hot path of every request",
        "NextResponse.next() is invalid",
        "middleware must be async only if it returns a Promise",
      ],
      answerIndex: 1,
      explanation: "Missing matcher means middleware runs on far more requests than intended, and a database call here taxes every one of them — the opposite of the fast, lightweight design middleware needs.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "In this sandbox, why does framework.tsx recreate NextResponse-style actions as plain local objects instead of importing next/server?",
      options: [
        "Because next/server doesn't exist in real Next.js",
        "Because next/server isn't available in this browser-only sandbox — the simulation reproduces the same next()/redirect()/rewrite() shape locally so the pipeline is learnable without a real server",
        "Because plain objects are faster at runtime",
        "Because middleware.ts can't import anything",
      ],
      answerIndex: 1,
      explanation: "Only project files, react, and the next/* shims listed in this platform's sandbox runtime are importable — next/server isn't one of them, so the three outcomes are modeled locally instead.",
    },
  ],
  keyTakeaways: [
    "middleware.ts runs once at the project root, before routing, on every request matched by config.matcher.",
    "It runs on the Edge Runtime — fast to start, but without full Node.js APIs — because it sits on the hot path of every matched request.",
    "Every middleware function resolves to pass-through (next()), redirect (URL changes), or rewrite (URL stays, content changes).",
    "Middleware is a good first gate for auth, but page-level checks (Lesson 6.3) are still the authoritative boundary.",
  ],
  cheatSheet: `
| Outcome | API | Visible URL |
| --- | --- | --- |
| Pass through | \`NextResponse.next()\` | unchanged |
| Redirect | \`NextResponse.redirect(url)\` | changes |
| Rewrite | \`NextResponse.rewrite(url)\` | unchanged |
| Limit which requests run | \`export const config = { matcher: [...] }\` | — |
| Read a cookie | \`request.cookies.get("x")?.value\` | — |
| Set a cookie on the response | \`response.cookies.set("x", value)\` | — |
| Runtime | Edge Runtime — fast, restricted API surface | — |
`,
  interviewQuestions: [
    "Where does middleware run relative to page/Route Handler routing?",
    "What is the Edge Runtime, and why does middleware use it instead of full Node.js?",
    "What's the difference between a redirect and a rewrite, and when would you use each?",
    "Why does an overly broad matcher (or no matcher) hurt performance?",
    "Give an example of a good use for middleware, and an example of logic that shouldn't live there.",
    "Is middleware alone sufficient for protecting a route? Why or why not?",
  ],
};

export default lesson;
