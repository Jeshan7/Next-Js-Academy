import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

This lesson doesn't introduce anything new — it's the payoff of Module 6. A protected dashboard is the same request lifecycle every time: middleware checks the session before anything renders, a Server Component reads the session again and queries the database scoped to that specific user, and a Server Action handles a mutation the page triggers. You've built each piece separately in the last four lessons. Here they combine into one page.

## Why this exists — walking the request, not learning new concepts

Individually, middleware gating, session checks, and database queries are each simple. What trips people up in practice is the *ordering* and *ownership* of each step — which one runs first, which one is allowed to fail safely, and which one is the actual authority if two of them disagree. Building one page that uses all three, in the right order, is the exercise.

## How it works internally

### The full lifecycle, in order

::diagram{protected-dashboard-lifecycle}

1. **Request arrives for \`/dashboard\`.** Middleware (Lesson 6.2) runs first, matched by its \`config.matcher\`. It checks for a session cookie and, if missing, redirects to \`/login\` before anything else runs — this is the fast, coarse gate.
2. **If middleware passes it through**, the page's Server Component runs. It reads the session again with \`getSession()\` (Lesson 6.3) — not because middleware might be wrong, but because the Server Component is the authoritative boundary and shouldn't blindly trust that middleware always ran correctly for every possible way this component could be reached.
3. **The Server Component queries the simulated database** (Lesson 6.4), scoped specifically to \`session.userId\` — never fetching every user's data and filtering client-side, always filtering at the query itself.
4. **A Server Action is available on the page** for a mutation — updating a profile field — following Module 5's pattern: validate and authorize inside the action itself, then \`revalidate\` so the page reflects the change.

### Why the Server Component checks the session again

This is the detail that makes the lifecycle correct rather than merely "probably fine." Middleware's \`matcher\` could be misconfigured, a future refactor could add a new way to reach this component that middleware's matcher doesn't cover, or someone could call the underlying Server Action directly. None of those are hypothetical edge cases to a real backend — they're exactly the situations authoritative, defense-in-depth checks exist for. Middleware being present doesn't remove the need for the Server Component's own check; it just means the common case is already handled before the more expensive path is reached.

### Scoping the query to the session

\`\`\`tsx
// DashboardPage.tsx — Server Component
async function DashboardPage() {
  const session = await getSession();
  if (!session) return <Redirecting />;

  const profile = await db.profile.findFirst({ where: { userId: session.userId } });
  return <ProfileView profile={profile} />;
}
\`\`\`

Filtering \`where: { userId: session.userId }\` at the query is what makes this "user-scoped data," not "all data, coincidentally showing the right thing today." Fetching everything and filtering in JavaScript afterward would still leak every other user's data into this request's memory, even if the UI never displayed it.

### The mutation

\`\`\`tsx
"use server";
async function updateDisplayName(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const name = formData.get("displayName");
  if (typeof name !== "string" || !name.trim()) throw new Error("Invalid name");
  await db.profile.update({ where: { userId: session.userId }, data: { displayName: name.trim() } });
  revalidatePath("/dashboard");
}
\`\`\`

Same discipline as Module 5: the Server Action re-checks the session (never trusting that only the intended form could call it), validates its input, scopes its write to the current user, and revalidates afterward.

## The sandbox in this lesson

This combines the session simulation from Lesson 6.3 and the fake \`db\` from Lesson 6.4 into one mock dashboard, plus a local \`middleware.ts\`-shaped gate reused from Lesson 6.2's pattern. As in those lessons: there's no real cookie, database, or Edge Runtime here — the pipeline (\`framework.tsx\`, read-only) simulates the ordering (middleware check → page render → scoped query → mutation) so you can build against the same lifecycle you'd build against in a real deployed app.

## Common mistakes

- **Treating middleware's pass-through as proof the page is secure.** The Server Component still needs its own check — this lesson's whole point.
- **Fetching all users' data and filtering in the component.** Scope the query itself; don't rely on the render to hide what was already fetched.
- **Skipping re-authorization inside the Server Action** because "the form is only shown to the logged-in user." A Server Action is reachable independent of which UI called it (Module 5).
- **Forgetting to revalidate after the mutation**, so the profile update appears to silently fail even though the write succeeded (Module 4/5).

## Best practices

- Middleware for the fast first gate, Server Component/Action for the authoritative one — always both, never just one.
- Scope every query to the authenticated user at the query level, not after the fact.
- Re-validate and re-authorize inside every Server Action, regardless of what UI conditions gate its caller.
- Revalidate the exact path/tag affected by a mutation, immediately after it succeeds.

## Performance considerations

Reading the session and querying user-scoped data can both benefit from Module 4's request memoization if multiple components in the same render need the same session or profile — fetch it once per request, not once per component.
`;

const middlewareCode = `// middleware.ts — READ-ONLY, reused from Lesson 6.2's pattern.
export type FakeRequest = { path: string; hasSession: boolean };
export type MiddlewareResult = { action: "next" } | { action: "redirect"; path: string };

export function middleware(request: FakeRequest): MiddlewareResult {
  if (request.path.startsWith("/dashboard") && !request.hasSession) {
    return { action: "redirect", path: "/login" };
  }
  return { action: "next" };
}
`;

const sessionCode = `// session.ts — READ-ONLY, reused from Lesson 6.3's pattern.
export type Session = { userId: string; displayName: string } | null;

let CURRENT_SESSION: Session = { userId: "u1", displayName: "Ada" };

export function getSession(): Session {
  return CURRENT_SESSION;
}

export function logout() {
  CURRENT_SESSION = null;
}

export function login() {
  CURRENT_SESSION = { userId: "u1", displayName: "Ada" };
}
`;

const dbCode = `// db.ts — READ-ONLY, reused from Lesson 6.4's pattern. Profiles are keyed
// by userId so every query below can be scoped to "the current user only."
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Profile = { userId: string; displayName: string; bio: string };

let PROFILES: Profile[] = [
  { userId: "u1", displayName: "Ada", bio: "Building things." },
  { userId: "u2", displayName: "Grace", bio: "Someone else's profile — never fetched by this dashboard." },
];

export const db = {
  profile: {
    async findFirst(args: { where: { userId: string } }): Promise<Profile | null> {
      await sleep(150);
      return PROFILES.find((p) => p.userId === args.where.userId) ?? null;
    },
    async update(args: { where: { userId: string }; data: Partial<Profile> }): Promise<Profile> {
      await sleep(150);
      const profile = PROFILES.find((p) => p.userId === args.where.userId);
      if (!profile) throw new Error("Profile not found");
      Object.assign(profile, args.data);
      return profile;
    },
  },
};
`;

const frameworkCode = `// framework.tsx — READ-ONLY. Wires the middleware check in front of the
// dashboard page, mirroring the real lifecycle: middleware first, then the
// page's own session check, then the scoped query.
import React from "react";
import { middleware } from "./middleware";
import { getSession } from "./session";

export function useDashboardGate() {
  const session = getSession();
  const result = middleware({ path: "/dashboard", hasSession: !!session });

  if (result.action === "redirect") {
    return { blocked: true as const, redirectTo: result.path };
  }
  return { blocked: false as const, session };
}
`;

const dashboardStarter = `// DashboardPage.tsx — the file you edit for every exercise.
// Stands in for the protected page's Server Component + Server Action.
import { useEffect, useState } from "react";
import { useDashboardGate } from "./framework";
import { getSession } from "./session";
import { db } from "./db";

type Profile = { userId: string; displayName: string; bio: string };

// TODO Exercise 3: turn this into a Server-Action-style function that
// re-checks the session, validates the new bio, updates db.profile scoped
// to the session's userId, and returns the updated profile.
async function updateBio(newBio: string) {
  // TODO
}

export default function DashboardPage() {
  const gate = useDashboardGate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bioDraft, setBioDraft] = useState("");

  useEffect(() => {
    // TODO Exercise 2: only query db.profile.findFirst if the gate isn't
    // blocked, scoped to gate.session.userId. Never fetch every profile.
  }, [gate.blocked]);

  // TODO Exercise 1: if gate.blocked is true, render
  // <p className="redirect-notice">Redirecting to {gate.redirectTo}…</p>
  // instead of the dashboard below.

  return (
    <div>
      <h1>Dashboard</h1>
      {profile && (
        <>
          <p className="profile-name">{profile.displayName}</p>
          <p className="profile-bio">{profile.bio}</p>
        </>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const updated = await updateBio(bioDraft);
          if (updated) setProfile(updated);
        }}
      >
        <input value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} placeholder="New bio" />
        <button type="submit">Save bio</button>
      </form>
    </div>
  );
}
`;

const dashboardSolution = `import { useEffect, useState } from "react";
import { useDashboardGate } from "./framework";
import { getSession } from "./session";
import { db } from "./db";

type Profile = { userId: string; displayName: string; bio: string };

async function updateBio(newBio: string): Promise<Profile | null> {
  const session = getSession();
  if (!session) throw new Error("Unauthorized");
  const bio = newBio.trim();
  if (!bio) throw new Error("Bio cannot be empty");
  return db.profile.update({ where: { userId: session.userId }, data: { bio } });
}

export default function DashboardPage() {
  const gate = useDashboardGate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bioDraft, setBioDraft] = useState("");

  useEffect(() => {
    if (gate.blocked) return;
    db.profile.findFirst({ where: { userId: gate.session!.userId } }).then(setProfile);
  }, [gate.blocked]);

  if (gate.blocked) {
    return <p className="redirect-notice">Redirecting to {gate.redirectTo}…</p>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {profile && (
        <>
          <p className="profile-name">{profile.displayName}</p>
          <p className="profile-bio">{profile.bio}</p>
        </>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const updated = await updateBio(bioDraft);
          if (updated) setProfile(updated);
        }}
      >
        <input value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} placeholder="New bio" />
        <button type="submit">Save bio</button>
      </form>
    </div>
  );
}
`;

const appCode = `import { login, logout, getSession } from "./session";
import { useState } from "react";
import DashboardPage from "./DashboardPage";

export default function App() {
  const [, forceRender] = useState(0);
  const session = getSession();

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => { logout(); forceRender((n) => n + 1); }}>Log out</button>
        <button onClick={() => { login(); forceRender((n) => n + 1); }}>Log in as Ada</button>
      </div>
      <p style={{ fontSize: 13, color: "#888" }}>Session: {session ? session.displayName : "none"}</p>
      <hr />
      <DashboardPage key={session ? session.userId : "logged-out"} />
    </div>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6.5 sandbox — capstone
=============================

framework.tsx wires the same lifecycle a real deployed app would use:
middleware check → page's own session check → scoped database query →
a Server-Action-style mutation.

1. Render a redirect notice when the gate blocks the request.
2. Query the profile scoped to the current session's userId only.
3. Turn updateBio into a proper Server-Action-style function: re-check the
   session, validate the input, and write scoped to the session's userId.
`,
  },
  { path: "/middleware.ts", readOnly: true, code: middlewareCode },
  { path: "/session.ts", readOnly: true, code: sessionCode },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/DashboardPage.tsx", code: dashboardStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/middleware.ts", readOnly: true, code: middlewareCode },
  { path: "/session.ts", readOnly: true, code: sessionCode },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/DashboardPage.tsx", code: dashboardSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m6-l5",
  title: "Project: authenticated dashboard",
  description:
    "The capstone for Module 6 — middleware gating a route, a Server Component reading the session and querying user-scoped data, and a Server Action handling a validated mutation, all in one request lifecycle.",
  durationMin: 40,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Render the redirect when the gate blocks",
      difficulty: "easy",
      instructions: `In \`DashboardPage.tsx\`, when \`gate.blocked\` is true, render \`<p className="redirect-notice">Redirecting to {gate.redirectTo}…</p>\` instead of the dashboard. Click **Log out** and confirm the notice appears; log back in and confirm the dashboard returns.`,
      validation: [
        { type: "code-includes", file: "/DashboardPage.tsx", pattern: "gate.blocked", message: "DashboardPage checks gate.blocked" },
        { type: "dom-exists", selector: "p.redirect-notice", message: "The redirect notice renders when logged out" },
      ],
      hint: `if (gate.blocked) {\n  return <p className="redirect-notice">Redirecting to {gate.redirectTo}…</p>;\n}`,
    },
    {
      id: "ex2",
      title: "Query the profile scoped to the session",
      difficulty: "medium",
      instructions: `In the \`useEffect\`, when the gate isn't blocked, call \`db.profile.findFirst({ where: { userId: gate.session.userId } })\` and set the result into \`profile\` state. Confirm Ada's name and bio render (never Grace's — that's the other user's profile, and this query should never touch it).`,
      validation: [
        { type: "code-includes", file: "/DashboardPage.tsx", pattern: "db.profile.findFirst", message: "DashboardPage queries db.profile.findFirst" },
        { type: "code-includes", file: "/DashboardPage.tsx", pattern: "gate.session", message: "The query is scoped using the session from the gate" },
        { type: "dom-exists", selector: "p.profile-name", message: "The profile name renders" },
      ],
    },
    {
      id: "ex3",
      title: "Wire a validated, re-authorized mutation",
      difficulty: "hard",
      instructions: `Implement \`updateBio\`: call \`getSession()\` and throw if there's no session, trim and validate the new bio (throw if empty), then call \`db.profile.update\` scoped to \`session.userId\`, returning the updated profile. Submit a new bio in the form and confirm \`.profile-bio\` updates.`,
      validation: [
        { type: "code-includes", file: "/DashboardPage.tsx", pattern: "getSession()", message: "updateBio re-checks the session" },
        { type: "code-includes", file: "/DashboardPage.tsx", pattern: "db.profile.update", message: "updateBio calls db.profile.update" },
        { type: "dom-exists", selector: "p.profile-bio", message: "The updated bio renders" },
      ],
      hint: `async function updateBio(newBio: string) {\n  const session = getSession();\n  if (!session) throw new Error("Unauthorized");\n  const bio = newBio.trim();\n  if (!bio) throw new Error("Bio cannot be empty");\n  return db.profile.update({ where: { userId: session.userId }, data: { bio } });\n}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "In the protected dashboard lifecycle, what runs first?",
      options: [
        "The Server Component's own session check",
        "Middleware, matched by config.matcher, before the page is reached at all",
        "The Server Action",
        "The database query",
      ],
      answerIndex: 1,
      explanation: "Middleware intercepts the request before routing decides which page/component answers it — the fastest, coarsest gate in the pipeline.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Because middleware already redirects unauthenticated visitors away from /dashboard, the Server Component itself doesn't need to check the session again.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The Server Component is the authoritative boundary — it shouldn't assume middleware's matcher covers every possible way it could be reached.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why does the dashboard query use db.profile.findFirst({ where: { userId: session.userId } }) instead of fetching all profiles and filtering in the component?",
      options: [
        "Fetching all profiles is faster",
        "Scoping the query itself means other users' data is never fetched into this request at all — filtering after the fact would still have loaded it",
        "findFirst doesn't support a where clause without this pattern",
        "It has no real difference, just a style choice",
      ],
      answerIndex: 1,
      explanation: "A query-level scope is a real security boundary; filtering in JavaScript after an unscoped fetch still exposes the data to that request's memory.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "What's missing from this mutation, based on Module 5 and Lesson 6.3's patterns?",
      code: `async function updateBio(newBio: string) {\n  return db.profile.update({ where: { userId: "u1" }, data: { bio: newBio } });\n}`,
      options: [
        "Nothing — it correctly updates the profile",
        "It hardcodes userId instead of reading it from the current session, and never checks that a session exists or validates newBio",
        "db.profile.update doesn't accept a where clause",
        "It's missing a revalidatePath call, which is the only issue",
      ],
      answerIndex: 1,
      explanation: "A Server Action must re-derive the caller's identity from the session (never a hardcoded or client-supplied id) and validate/authorize before writing, exactly like Module 5's Server Actions.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A teammate removes middleware entirely, arguing 'the Server Component already checks the session, so middleware is redundant.' What do they lose?",
      options: [
        "Nothing — the page is equally secure either way",
        "The fast, coarse first gate: without it, every request to a protected route (even ones destined to be rejected) reaches the more expensive page-render path before being turned away",
        "The Server Action would stop working",
        "The database connection would fail",
      ],
      answerIndex: 1,
      explanation: "Middleware and the Server Component's check serve different purposes — one is a cheap early filter, the other is the authoritative boundary. Removing either loses something, even if the page remains technically secure without middleware.",
    },
  ],
  keyTakeaways: [
    "The protected-page lifecycle is: middleware gate → Server Component's own session check → query scoped to the session's user → Server Action for mutations.",
    "Middleware and the Server Component's check are not redundant — one is a fast coarse filter, the other is the authoritative boundary.",
    "Scope database queries to the current user at the query itself, never by fetching everything and filtering after the fact.",
    "A Server Action re-derives identity from the session and validates input every time, regardless of which UI called it.",
  ],
  cheatSheet: `
| Step | Responsibility |
| --- | --- |
| Middleware | Fast, coarse gate — redirect if no session, before routing |
| Server Component | Authoritative check — re-verify the session itself |
| Database query | Scope to session.userId at the query, not after fetching |
| Server Action | Re-check session, validate input, write scoped to the user, revalidate |
| revalidatePath/Tag | Called after the mutation so the UI reflects the change |
`,
  interviewQuestions: [
    "Walk through the full request lifecycle for a protected dashboard route, in order.",
    "Why does the Server Component check the session again even though middleware already gated the route?",
    "What does 'scoping a query to the current user' mean, and why is filtering after an unscoped fetch not equivalent?",
    "What does a Server Action need to re-verify, even when it's only reachable from one form in the UI?",
    "How do Modules 5 and 6 combine in this capstone — which pieces come from which lesson?",
    "If you had to add a new role-gated admin-only view to this dashboard, which layer(s) would you touch, and why?",
  ],
};

export default lesson;
