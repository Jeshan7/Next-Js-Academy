import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Middleware (Lesson 6.2) can gate a route before it renders. But "is this user logged in" isn't answered by middleware alone — it depends on a broader question every backend has to answer: how does a stateless HTTP request know who's making it, and where in a Next.js app is it safe to trust that answer?

## Why this exists — the problem

HTTP requests carry no memory of each other. Without something attached to each request, a server can't tell the second request from the same browser apart from the first request from a stranger. Two common ways to carry that identity are **session cookies** (the browser automatically attaches a small opaque token on every request to the same origin; the server looks the token up against server-side session storage) and **bearer tokens** (the client explicitly attaches an \`Authorization: Bearer <token>\` header, common for APIs consumed by non-browser clients). Same-app Next.js UIs almost always use session cookies, because the browser sends them automatically — no client-side code has to remember to attach anything.

## How it works internally

### Where should auth state be checked?

There are three places a Next.js app could check "is this user allowed here," and they are not equally trustworthy:

1. **Middleware** — cheap, runs before routing, good for a fast first gate (redirect logged-out visitors away from \`/dashboard\` before it even starts rendering).
2. **Server Components** — the authoritative check. A Server Component runs on the server and can read the session directly; its output (and any data it fetches) never reaches the client unless the check passes.
3. **Client-side conditionals** — \`{isLoggedIn && <AdminPanel />}\` in a Client Component. This is **never** sufficient on its own.

::diagram{auth-session-flow}

### The common mistake: hiding UI without protecting the data

\`\`\`tsx
"use client";
function AdminPanel({ secretData }: { secretData: string }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return <p>{secretData}</p>;
}
\`\`\`

This looks safe — a logged-out user sees nothing. But look at what already happened: \`secretData\` was fetched on the server and passed down as a prop *before* this check ever ran. The check only controls whether the browser *displays* data it already received; anyone can open dev tools, inspect the page's initial payload, or just patch \`isLoggedIn\` in React DevTools, and the data is already there. **The mistake isn't "no check" — it's checking in the wrong place.** The data fetch itself needs to be gated, not just its rendering:

\`\`\`tsx
// Server Component — the fetch itself is gated
async function AdminPanel() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  const secretData = await db.secrets.find(); // never runs for non-admins
  return <p>{secretData}</p>;
}
\`\`\`

### A mental model: public, authenticated, or role-gated

For every route, ask one question before writing any code: is this page **public** (anyone, logged in or not), **authenticated** (any logged-in user), or **role-gated** (a specific role or permission)? That answer decides where the check belongs — middleware can handle the coarse "authenticated vs not" split cheaply; a role check almost always wants to live in the Server Component or the specific Server Action being called, since it depends on more than just "is there a cookie."

## The sandbox in this lesson

There's no real cookie store, session database, or network boundary inside this browser tab. \`session.ts\` (read-only) simulates a session with a single in-memory variable standing in for a cookie-backed session store — reading it is meant to feel like \`await getSession()\` would in a real Server Component, and clearing it is meant to feel like a logout clearing the session cookie. You'll read from this fake session in a mock "protected page" component and in a mock middleware-style check, gating a route and redirecting when the session is missing — the same shape as a real \`getSession()\` call, without a real cookie or database behind it.

## Common mistakes

- **Hiding a button instead of protecting the data fetch it triggers.** Client-side conditionals are UX polish; the fetch or mutation behind them needs its own check.
- **Checking auth only in middleware and assuming that's the whole story.** Middleware is a good first gate, not the only one — a Server Component or Server Action reached some other way still needs to check for itself.
- **Storing sensitive data in a client-readable place "because it's easier."** If a Client Component has it, the user's browser has it, checked or not.
- **Treating "role-gated" the same as "authenticated."** A logged-in user isn't automatically authorized for every logged-in-only page; role/permission checks are a separate, more specific gate.

## Best practices

- Default to checking auth in a Server Component or Server Action — that's the boundary nothing can bypass.
- Use middleware for a fast, coarse first pass (redirect anonymous visitors before a protected route even starts rendering).
- Never let a client-side check be the only thing standing between a request and sensitive data.
- Name each route's requirement explicitly (public / authenticated / role-gated) when you design it, not after a bug report.

## Performance considerations

Reading a session (from a cookie, then looking it up server-side) is a lookup you'll want cached per-request the way Module 4 covered — done once and reused across every Server Component in that request's tree, rather than re-fetched by every component that needs to know who's logged in.
`;

const sessionCode = `// session.ts — READ-ONLY. Simulates a session cookie + server-side lookup
// with a single in-memory variable. Treat reading it like an await getSession()
// call in a real Server Component; treat clearing it like a logout that
// invalidates the session cookie.
export type Session = { userId: string; role: "member" | "admin" } | null;

let CURRENT_SESSION: Session = null;

export function getSession(): Session {
  return CURRENT_SESSION;
}

export function login(role: "member" | "admin" = "member") {
  CURRENT_SESSION = { userId: "u1", role };
}

export function logout() {
  CURRENT_SESSION = null;
}
`;

const protectedPageStarter = `// ProtectedPage.tsx — the file you edit for every exercise.
// Stands in for a Server Component that reads the session directly.
import { getSession } from "./session";

export default function ProtectedPage() {
  // TODO Exercise 1: read the session. If there is none, render a
  // <p className="redirect-notice">Redirecting to /login…</p> instead of
  // the dashboard content below, and stop there (don't render secretData).

  const secretData = "Q3 revenue: $1.2M"; // TODO Exercise 2: only fetch/read
  // this once the session check above has passed — move this line so it
  // never runs for a logged-out visitor.

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="secret-data">{secretData}</p>
      {/* TODO Exercise 3: only render this admin section when
          session.role === "admin" */}
      <p className="admin-only">Admin: delete all accounts</p>
    </div>
  );
}
`;

const protectedPageSolution = `import { getSession } from "./session";

export default function ProtectedPage() {
  const session = getSession();

  if (!session) {
    return <p className="redirect-notice">Redirecting to /login…</p>;
  }

  const secretData = "Q3 revenue: $1.2M"; // only reached once session exists

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="secret-data">{secretData}</p>
      {session.role === "admin" && <p className="admin-only">Admin: delete all accounts</p>}
    </div>
  );
}
`;

const appCode = `import { useState } from "react";
import { login, logout, getSession } from "./session";
import ProtectedPage from "./ProtectedPage";

export default function App() {
  const [, forceRender] = useState(0);
  const session = getSession();

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => { login("member"); forceRender((n) => n + 1); }}>
          Log in as member
        </button>
        <button onClick={() => { login("admin"); forceRender((n) => n + 1); }}>
          Log in as admin
        </button>
        <button onClick={() => { logout(); forceRender((n) => n + 1); }}>
          Log out
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#888" }}>
        Session: {session ? \`\${session.userId} (\${session.role})\` : "none"}
      </p>
      <hr />
      <ProtectedPage />
    </div>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6.3 sandbox
==================

session.ts simulates a session cookie + server-side lookup with a single
in-memory variable. Treat getSession() like a real Server Component's
await getSession() call.

1. Gate ProtectedPage: render a redirect notice when there's no session.
2. Make sure secretData is only ever read once a session exists.
3. Only render the admin section for session.role === "admin".
`,
  },
  { path: "/session.ts", readOnly: true, code: sessionCode },
  { path: "/ProtectedPage.tsx", code: protectedPageStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/session.ts", readOnly: true, code: sessionCode },
  { path: "/ProtectedPage.tsx", code: protectedPageSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m6-l3",
  title: "Authentication patterns & sessions",
  description:
    "Session cookies vs bearer tokens, where auth checks actually belong (never client-only), and why hiding UI isn't the same as protecting the data behind it.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Gate the page on session presence",
      difficulty: "easy",
      instructions: `In \`ProtectedPage.tsx\`, call \`getSession()\` and render \`<p className="redirect-notice">Redirecting to /login…</p>\` (instead of the dashboard) when there's no session. Click **Log out** and confirm the redirect notice appears.`,
      validation: [
        { type: "code-includes", file: "/ProtectedPage.tsx", pattern: "getSession()", message: "ProtectedPage reads the session" },
        { type: "dom-exists", selector: "p.redirect-notice", message: "A redirect notice renders when logged out" },
      ],
      hint: `const session = getSession();\nif (!session) return <p className="redirect-notice">Redirecting to /login…</p>;`,
    },
    {
      id: "ex2",
      title: "Protect the data, not just the display",
      difficulty: "medium",
      instructions: `Move \`secretData\` so it's only ever reached after the session check passes — a logged-out visitor should never have it computed at all, not just hidden. Log in and confirm \`.secret-data\` still renders correctly.`,
      validation: [
        { type: "code-regex", file: "/ProtectedPage.tsx", regex: "if \\(!session\\)[\\s\\S]*secretData", message: "The session check happens before secretData is read" },
        { type: "dom-exists", selector: "p.secret-data", message: "secret-data renders once logged in" },
      ],
    },
    {
      id: "ex3",
      title: "Role-gate the admin section",
      difficulty: "hard",
      instructions: `Only render \`.admin-only\` when \`session.role === "admin"\`. Log in as a member and confirm it's absent; log in as an admin and confirm it appears.`,
      validation: [
        { type: "code-includes", file: "/ProtectedPage.tsx", pattern: "role === \"admin\"", message: "The admin section checks session.role" },
      ],
      hint: `{session.role === "admin" && <p className="admin-only">...</p>}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Why do same-app Next.js UIs typically use session cookies rather than manually-attached bearer tokens?",
      options: [
        "Cookies are faster over the network",
        "The browser attaches cookies to same-origin requests automatically, so no client code has to remember to attach anything",
        "Bearer tokens don't work with HTTPS",
        "Session cookies never expire",
      ],
      answerIndex: 1,
      explanation: "Automatic attachment is the main practical advantage for a same-origin app; bearer tokens are more common for APIs consumed by non-browser clients.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A client-side conditional that hides an admin panel is sufficient to protect the data that panel displays.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "If the data already reached the client before the check ran, hiding the UI doesn't undo that — the fetch itself needs to be gated on the server.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Where is the authoritative place to check whether a user is allowed to see a piece of data?",
      options: [
        "A Client Component's useEffect",
        "The Server Component (or Server Action) that fetches the data, before the fetch happens",
        "CSS that hides the element visually",
        "The browser's local storage",
      ],
      answerIndex: 1,
      explanation: "Gating the fetch itself on the server means the data never reaches the client for someone who shouldn't have it.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "What's the security problem with this component?",
      code: `"use client";\nfunction Panel({ secret }: { secret: string }) {\n  const { isAdmin } = useAuth();\n  if (!isAdmin) return null;\n  return <p>{secret}</p>;\n}`,
      options: [
        "None — the non-admin sees nothing rendered",
        "secret was already fetched on the server and passed down before this check runs; it's present in the page's payload regardless of isAdmin",
        "useAuth() is not a real hook",
        "Client Components can't return null",
      ],
      answerIndex: 1,
      explanation: "The prop already crossed the server/client boundary before the conditional runs — the check only controls whether it's displayed, not whether it was ever sent.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "middleware.ts redirects logged-out visitors away from /dashboard. A developer says that alone makes the route secure. What's missing?",
      options: [
        "Nothing is missing",
        "The Server Component or Server Action behind /dashboard should still check the session itself — middleware is a fast first gate, not the only boundary",
        "Middleware should fetch the dashboard data directly",
        "Redirects should be replaced with rewrites",
      ],
      answerIndex: 1,
      explanation: "Middleware only covers requests it actually matches and runs on; the authoritative check still belongs where the data is fetched.",
    },
  ],
  keyTakeaways: [
    "Session cookies are attached automatically by the browser to same-origin requests; bearer tokens must be attached explicitly by client code.",
    "Client-side conditionals are UX polish only — they can never be the sole gate on sensitive data.",
    "The authoritative check belongs where the data is fetched: a Server Component or Server Action, before the fetch runs.",
    "Classify every route as public, authenticated, or role-gated up front — it decides where the check belongs and how specific it needs to be.",
  ],
  cheatSheet: `
| Layer | Good for | Not sufficient alone for |
| --- | --- | --- |
| Middleware | Fast, coarse first gate (redirect anonymous visitors) | Role/permission checks, the only line of defense |
| Server Component / Action | Authoritative check, gates the data fetch itself | — (this is the real boundary) |
| Client-side conditional | Hiding UI for a nicer experience | Protecting any sensitive data or mutation |
| Session cookie | Same-app browser auth, attached automatically | Non-browser API clients |
| Bearer token | APIs consumed by non-browser clients | Same-app UI convenience |
`,
  interviewQuestions: [
    "What's the difference between a session cookie and a bearer token, and when would you use each?",
    "Why is a client-side conditional never sufficient to protect sensitive data on its own?",
    "Where should the authoritative auth check live in a Next.js app, and why?",
    "How would you decide whether a route is public, authenticated, or role-gated?",
    "What role does middleware play in an auth strategy, and what should it not be relied on for?",
    "Walk through what actually happens when an unauthenticated user requests a protected route with middleware in place.",
  ],
};

export default lesson;
