import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every lesson so far has run inside a sandbox that never leaves the browser tab. A real Next.js app eventually has to run somewhere else — a host that builds it, serves it, and keeps it configured correctly across multiple environments. This lesson covers what \`next build\` actually produces, how environment variables work (and how they can leak secrets if you're not careful), and what tends to go wrong when an app moves from a developer's machine toward production.

## Why this exists — the problem

Code that "works on my machine" and code that works in production are not automatically the same thing. Configuration differs (a local database vs. a production one), secrets exist that should never reach a browser, and multiple environments (preview, staging, production) need to run the *same* code with *different* settings. Hard-coding any of that into source files means every environment either shares config it shouldn't, or requires a code change just to point at a different database — the same problem dependency injection solves for code, applied to configuration.

## How it works internally

### What next build actually produces

Running \`next build\` produces:

- **Prerendered pages** — static HTML for routes that can be fully generated ahead of time (Module 3's static rendering).
- **A server bundle** — the code that runs per-request for dynamic routes, Server Actions, and Route Handlers.
- **Static assets** — optimized images, self-hosted fonts (\`next/font\`, previous lesson), and the client-side JavaScript needed for Client Components.

A host (Vercel, a Node server, a container platform) runs this output: it serves the static assets directly, runs the server bundle for anything dynamic, and serves prerendered HTML for anything static — the same split between build-time and request-time work covered in Module 3, now happening on real infrastructure instead of inside this sandbox.

### Environment variables: NEXT_PUBLIC_* vs server-only

\`\`\`
# .env.local
DATABASE_URL=postgres://user:pass@db.internal:5432/acme   # server-only
STRIPE_SECRET_KEY=sk_live_...                              # server-only
NEXT_PUBLIC_API_URL=https://api.example.com                # bundled into client code
NEXT_PUBLIC_SITE_NAME=Acme Store                            # bundled into client code
\`\`\`

This is the single most important distinction in this lesson: any environment variable prefixed \`NEXT_PUBLIC_\` is **inlined directly into the JavaScript bundle sent to every browser** at build time. Anyone who opens dev tools can read it. Everything else is **server-only** — available in Server Components, Server Actions, and Route Handlers, but never sent to the client.

\`\`\`ts
// Server Component, Server Action, or Route Handler — server-only var, safe
const db = connect(process.env.DATABASE_URL);

// Anywhere, including a Client Component — public var, visible to everyone
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
\`\`\`

The rule that follows directly from this: **never put a secret behind a \`NEXT_PUBLIC_\` prefix.** There's no runtime check stopping you — it's purely a naming convention Next.js treats specially, which means a typo or a copy-paste mistake is the entire distance between "safe" and "shipped to every visitor's browser."

::diagram{environment-pipeline}

### Separating environments

A typical pipeline has (at least) four environments, each running the *same* build with *different* configuration injected at that stage: **local** (a developer's machine, \`.env.local\`), **preview** (a deploy per pull request, often pointing at a staging database), **staging** (a pre-production environment for final checks), and **production** (live traffic). The build artifact itself doesn't change between stages — only the environment variables supplied to it do. Config living in environment variables (not hard-coded in source) is what makes this possible: the same code, promoted forward, behaves correctly in each stage because each stage supplies its own values.

## The sandbox in this lesson

There's no real hosting platform or deployment pipeline to exercise inside this browser tab. Instead, this sandbox simulates reading environment variables from a plain object shaped like \`process.env\`, with both public and server-only keys present — including a deliberately dangerous one, \`STRIPE_SECRET_KEY\`, that a buggy debug panel leaks into client-visible output. Fixing that leak and confirming the validation catches it is the point of the exercises below.

## Common mistakes

- **Prefixing a secret with \`NEXT_PUBLIC_\` by mistake.** The moment that happens, the value is baked into every client bundle — rotating the secret afterward is the only fix; removing the prefix in a later deploy doesn't un-ship what already went out.
- **Forgetting to set an environment variable in one environment.** A var present in \`.env.local\` and production but missing in preview produces a bug that "works everywhere except this one deploy" — confusing precisely because the code is identical.
- **Assuming local behavior matches production exactly.** Local development often runs with different data, no caching, and permissive CORS; a feature that works locally can behave differently once real caching layers (Module 4) and a real database are involved.
- **Logging a full \`process.env\` object "for debugging."** Even server-side, this risks a secret ending up in log output that a less-trusted party can read.

## Best practices

- Treat any environment variable without \`NEXT_PUBLIC_\` as a secret by default — require a deliberate, reviewed decision to make something public, never a shortcut.
- Keep configuration entirely out of source code; every environment supplies its own values to the same build.
- Set every required environment variable in every environment before deploying — a missing var should fail loudly at build/boot time, not silently at request time.
- Test against staging (with production-like data and caching) before trusting that local behavior will hold in production.

## Performance considerations

Environment variables themselves have no runtime performance cost — the cost that matters here is entirely about correctness and security. A leaked secret or a misconfigured environment doesn't show up as a slow request; it shows up as a security incident or a confusing "works everywhere but here" bug, which is why this lesson treats configuration discipline as seriously as any of the performance topics earlier in this module.
`;

const envCode = `// env.ts — READ-ONLY. Simulates process.env: a mix of public (safe to ship
// to the browser) and server-only (must never reach the client) values.
export const env = {
  NEXT_PUBLIC_API_URL: "https://api.example.com",
  NEXT_PUBLIC_SITE_NAME: "Acme Store",
  DATABASE_URL: "postgres://user:pass@db.internal:5432/acme",
  STRIPE_SECRET_KEY: "sk_live_abc123",
};
`;

const publicConfigStarter = `// publicConfig.ts
// The functions here decide what's safe to expose to client-visible code —
// conceptually the same decision Next.js makes when it inlines NEXT_PUBLIC_*
// vars into the client bundle at build time.
import { env } from "./env";

export function getPublicConfig() {
  return {
    // TODO Exercise 1: return env.NEXT_PUBLIC_API_URL and
    // env.NEXT_PUBLIC_SITE_NAME here — nothing else.
    apiUrl: "",
    siteName: "",
  };
}

export function getAllPublicEnv(): Record<string, string> {
  // TODO Exercise 2: return only the keys from \`env\` that start with
  // "NEXT_PUBLIC_" — a general-purpose filter, not just the two known keys.
  return {};
}
`;

const publicConfigSolution = `import { env } from "./env";

export function getPublicConfig() {
  return {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    siteName: env.NEXT_PUBLIC_SITE_NAME,
  };
}

export function getAllPublicEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      result[key] = value;
    }
  }
  return result;
}
`;

const debugPanelStarter = `// DebugPanel.tsx
// This panel is meant to show only public, client-safe configuration.
import { env } from "./env";
import { getPublicConfig } from "./publicConfig";

export default function DebugPanel() {
  const config = getPublicConfig();
  return (
    <div className="debug-panel">
      <p className="panel-public">{config.siteName} — {config.apiUrl}</p>
      {/* TODO Exercise 3: this line leaks a server-only secret into
          client-visible output. Remove it entirely. */}
      <p className="panel-secret">{env.STRIPE_SECRET_KEY}</p>
    </div>
  );
}
`;

const debugPanelSolution = `import { getPublicConfig } from "./publicConfig";

export default function DebugPanel() {
  const config = getPublicConfig();
  return (
    <div className="debug-panel">
      <p className="panel-public">{config.siteName} — {config.apiUrl}</p>
    </div>
  );
}
`;

const appCode = `import DebugPanel from "./DebugPanel";
import { getAllPublicEnv } from "./publicConfig";

export default function App() {
  const publicEnv = getAllPublicEnv();
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Environment configuration (simulated)</h1>
      <DebugPanel />
      <h2>All public env vars</h2>
      <ul className="public-env-list">
        {Object.entries(publicEnv).map(([key, value]) => (
          <li key={key}>{key} = {value}</li>
        ))}
      </ul>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 7.4 sandbox
==================

env.ts (read-only) simulates process.env with both public (NEXT_PUBLIC_*)
and server-only values, including a fake secret, STRIPE_SECRET_KEY.

1. In publicConfig.ts, return only the two public values from
   getPublicConfig().
2. Implement getAllPublicEnv() as a general filter for any key starting
   with "NEXT_PUBLIC_".
3. Fix DebugPanel.tsx, which currently leaks env.STRIPE_SECRET_KEY into
   client-visible output — remove that line entirely.
`,
  },
  { path: "/env.ts", readOnly: true, code: envCode },
  { path: "/publicConfig.ts", code: publicConfigStarter },
  { path: "/DebugPanel.tsx", code: debugPanelStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/env.ts", readOnly: true, code: envCode },
  { path: "/publicConfig.ts", code: publicConfigSolution },
  { path: "/DebugPanel.tsx", code: debugPanelSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m7-l4",
  title: "Deployment & environments",
  description:
    "What next build produces, NEXT_PUBLIC_* vs server-only environment variables, separating preview/staging/production, and the common mistakes that leak secrets or drift between environments.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Return only public config",
      difficulty: "easy",
      instructions: `In \`publicConfig.ts\`, make \`getPublicConfig()\` return \`{ apiUrl: env.NEXT_PUBLIC_API_URL, siteName: env.NEXT_PUBLIC_SITE_NAME }\`. Confirm the debug panel renders the site name and API URL.`,
      validation: [
        { type: "code-includes", file: "/publicConfig.ts", pattern: "env.NEXT_PUBLIC_API_URL", message: "getPublicConfig reads the public API URL" },
        { type: "code-includes", file: "/publicConfig.ts", pattern: "env.NEXT_PUBLIC_SITE_NAME", message: "getPublicConfig reads the public site name" },
        { type: "dom-text", selector: "p.panel-public", includes: "Acme Store", message: "The panel renders the public site name" },
      ],
      hint: `return {\n  apiUrl: env.NEXT_PUBLIC_API_URL,\n  siteName: env.NEXT_PUBLIC_SITE_NAME,\n};`,
    },
    {
      id: "ex2",
      title: "Filter env down to public keys generically",
      difficulty: "medium",
      instructions: `Implement \`getAllPublicEnv()\` to loop over \`Object.entries(env)\` and return only the entries whose key starts with \`"NEXT_PUBLIC_"\` — this should work for any number of public keys, not just the two you know about by name.`,
      validation: [
        { type: "code-includes", file: "/publicConfig.ts", pattern: 'startsWith("NEXT_PUBLIC_")', message: "The filter checks the NEXT_PUBLIC_ prefix generically" },
        { type: "dom-count", selector: "ul.public-env-list li", min: 2, message: "Both public env vars render in the list" },
      ],
      hint: `for (const [key, value] of Object.entries(env)) {\n  if (key.startsWith("NEXT_PUBLIC_")) result[key] = value;\n}`,
    },
    {
      id: "ex3",
      title: "Fix the secret leak",
      difficulty: "hard",
      instructions: `\`DebugPanel.tsx\` renders \`env.STRIPE_SECRET_KEY\` directly — a server-only secret leaking into client-visible output. Delete the \`<p className="panel-secret">\` line entirely, leaving only the public config rendered.`,
      validation: [
        { type: "code-regex", file: "/DebugPanel.tsx", regex: "^(?:(?!STRIPE_SECRET_KEY).)*$", flags: "s", message: "DebugPanel no longer references the secret key at all" },
        { type: "dom-exists", selector: "p.panel-public", message: "The public config still renders correctly" },
      ],
      hint: `Remove the entire <p className="panel-secret">{env.STRIPE_SECRET_KEY}</p> line.`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What happens to an environment variable prefixed NEXT_PUBLIC_?",
      options: [
        "Nothing different from any other variable — the prefix is cosmetic",
        "It's inlined directly into the JavaScript bundle sent to every browser at build time",
        "It's encrypted before being sent to the client",
        "It's only available in Route Handlers",
      ],
      answerIndex: 1,
      explanation: "The NEXT_PUBLIC_ prefix tells Next.js to bundle that value into client-side code — visible to anyone who opens dev tools.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Removing the NEXT_PUBLIC_ prefix from a variable in a later deploy retroactively removes it from bundles that already shipped to users.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Once a value has been inlined into a shipped bundle, it's already out — the only real fix for a leaked secret is rotating it, not just removing the prefix going forward.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A Server Component reads process.env.DATABASE_URL (no NEXT_PUBLIC_ prefix) and uses it to connect to a database. Is this safe?",
      code: `const db = connect(process.env.DATABASE_URL);`,
      options: [
        "No — any process.env access is automatically sent to the client",
        "Yes — server-only variables (no NEXT_PUBLIC_ prefix) stay on the server and are never bundled into client code",
        "Only safe if wrapped in a try/catch",
        "Only safe in a Route Handler, not a Server Component",
      ],
      answerIndex: 1,
      explanation: "Variables without the NEXT_PUBLIC_ prefix are server-only by default — accessing them in server-side code never exposes them to the browser.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A feature works in every environment except preview deploys, with identical code everywhere. What's the most likely cause?",
      options: [
        "Preview deploys always run older Next.js versions",
        "An environment variable required by the feature was never set for the preview environment specifically",
        "Preview deploys can't access any environment variables",
        "The build artifact differs between preview and production"
      ],
      answerIndex: 1,
      explanation: "The same build artifact is promoted through every stage — a bug isolated to one environment with identical code almost always traces back to a missing or different environment variable for that stage.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "What does next build actually produce?",
      options: [
        "Only a single HTML file",
        "Prerendered static pages, a server bundle for dynamic routes/Server Actions/Route Handlers, and optimized static assets",
        "A Docker image, always",
        "Only the client-side JavaScript bundle"
      ],
      answerIndex: 1,
      explanation: "The build output splits along the same static/dynamic line from Module 3: prerendered HTML for static routes, a server bundle for everything dynamic, plus static assets.",
    },
  ],
  keyTakeaways: [
    "next build produces prerendered static pages, a server bundle for dynamic work, and static assets — the same static/dynamic split from Module 3, now on real infrastructure.",
    "NEXT_PUBLIC_* variables are inlined into every client bundle at build time; everything else is server-only.",
    "Never put a secret behind a NEXT_PUBLIC_ prefix — there's no runtime safeguard, only convention.",
    "The same build artifact is promoted through local/preview/staging/production; only the injected environment variables differ per stage.",
    "A bug isolated to one environment with identical code usually traces back to a missing or mismatched environment variable.",
  ],
  cheatSheet: `
| Concept | Detail |
| --- | --- |
| \`next build\` output | Prerendered pages + server bundle + static assets |
| \`NEXT_PUBLIC_*\` vars | Bundled into client code at build time — never put secrets here |
| Server-only vars | No prefix — available server-side only (Server Components, Actions, Route Handlers) |
| Environments | local → preview → staging → production, same build, different config |
| Common bug | Missing env var in one environment only |
| Leaked secret fix | Rotate the secret — removing the prefix doesn't undo a shipped bundle |
`,
  interviewQuestions: [
    "What's the difference between a NEXT_PUBLIC_ variable and a server-only variable, mechanically?",
    "Why can't removing a NEXT_PUBLIC_ prefix undo a leaked secret after a deploy has already shipped?",
    "What does next build actually produce, and how does a host use each piece?",
    "Why should the same build artifact be promoted through every environment rather than rebuilt per stage?",
    "A feature works locally but breaks in production — what environment-related causes would you check first?",
    "What's the risk of logging process.env directly, even in server-side code?",
  ],
};

export default lesson;
