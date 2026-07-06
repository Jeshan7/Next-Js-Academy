import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

This is the capstone lesson. Every concept up to this point — routing and layouts (Modules 1–2), rendering strategies (Module 3), caching (Module 4), mutations (Module 5), and the backend primitives (Module 6) — is a piece of one larger decision: *for this route, in this app, which combination of choices actually fits?* Almost nothing here is new; this lesson is about **how the pieces you already know fit into one real app**.

## Why this exists

A tutorial teaches each concept in isolation, one at a time. A real, large app doesn't present its routes that way — a single dashboard might have a static marketing shell, a streamed data table, a form with optimistic updates, and a public webhook endpoint, all in the same codebase, each needing a *different* answer to "how should this render, cache and mutate?" Treating every route identically (all dynamic, all no caching, all Server Actions) is simpler to reason about but wastes the platform's actual capabilities. The skill this lesson builds is choosing deliberately, route by route.

## How it works internally

### The decision framework, per route

::diagram{production-architecture-overview}

For any given route, four questions, each answered by an earlier module:

1. **Rendering strategy (Module 3).** How often does this route's content change, and does it need to be interactive immediately? Rarely-changing content is a static-rendering candidate; content that must reflect live state on every request is dynamic; a page combining fast and slow data benefits from streaming with Suspense boundaries around the slow parts.
2. **Caching strategy (Module 4).** Given the rendering choice, what should be cached, for how long, and how does it get invalidated? A static page with rarely-changing data wants a long \`revalidate\` window (or on-demand \`revalidateTag\`/\`revalidatePath\` after a mutation); a page whose data changes on every request wants no caching at that layer at all — but request memoization and the router cache (Module 4) still apply regardless.
3. **Where mutations live (Modules 5–6).** Is the caller your own app's form/button, or something external — a third-party webhook, a public API consumer? Same-app mutations belong in a Server Action; external callers need a Route Handler with its own URL contract.
4. **Folder structure (Module 1, revisited at scale).** As an app grows past a handful of routes, does a feature's code live colocated next to its route, or in a central shared folder? Colocation keeps a feature's page, components and Server Actions together and easy to delete as a unit; central folders (\`components/\`, \`lib/\`) suit code genuinely shared across many features. Most real apps use both — colocate what's feature-specific, centralize what's truly shared.

### Why these decisions interact, not stack independently

Choosing dynamic rendering for a route doesn't mean caching is irrelevant — the data cache and request memoization (Module 4) still apply *within* that dynamic render. Choosing a Server Action for a mutation doesn't mean validation is optional — the same client-then-server validation layering (Module 5) applies regardless of whether the trigger was a button or a webhook. None of these four questions is answered in isolation from the other three; a route's final architecture is the combination.

## The sandbox in this lesson

There's no real infrastructure to provision here — this capstone sandbox gives you a small set of hypothetical route specs (a marketing homepage, a live inventory dashboard, a blog post with comments, a public payment webhook) and has you implement the decision functions that choose a rendering strategy, a caching strategy, and a mutation path for each one, using the same simulated primitives and vocabulary from Modules 3, 4, 5 and 6.

## Common mistakes

- **Applying one rendering/caching strategy to the whole app uniformly.** A dashboard's live-inventory page and its marketing homepage almost never want the same answer.
- **Choosing a Route Handler for a same-app mutation "to be safe."** That's unnecessary ceremony (a URL to design, manual fetch/JSON handling) when a Server Action does the same job with less code, for the same-app case.
- **Treating folder structure as a one-time decision made on day one.** As features are added, colocation vs. centralization should be revisited per feature, not fixed permanently by whatever the first few routes happened to need.
- **Forgetting that a caching decision only pays off if invalidation is wired correctly.** A long \`revalidate\` window with no \`revalidateTag\`/\`revalidatePath\` call after the relevant mutation just serves stale data confidently.

## Best practices

- Answer the four questions (rendering, caching, mutations, structure) per route, not once for the whole app.
- Let a route's actual data-change frequency and mutation origin (internal vs external) drive the decision — not habit or whatever the last route used.
- Revisit folder structure as the app grows; colocate feature-specific code, centralize genuinely shared code.
- Pair every caching decision with its invalidation path before considering the route done.

## Performance considerations

The entire point of choosing deliberately per route is that the *aggregate* performance of a real app is the sum of many individually-reasoned decisions, not one global setting. A dashboard with a static marketing shell, a streamed data table, and no caching on its live-inventory route performs better as a whole than the same app rendered dynamically and uncached everywhere "to be consistent" — consistency of process (always ask the four questions), not consistency of answer, is the goal.
`;

const architectureSpecsCode = `// architectureSpecs.ts — READ-ONLY. Four hypothetical routes spanning the
// range of decisions a real app has to make, one per route.

export type RouteSpec = {
  name: string;
  path: string;
  changesFrequency: "rarely" | "hourly" | "every-request";
  hasMutation: boolean;
  isPublic: boolean; // true if the mutation's caller is outside this app (a webhook, a public API consumer)
};

export const ROUTE_SPECS: RouteSpec[] = [
  {
    name: "Marketing homepage",
    path: "/",
    changesFrequency: "rarely",
    hasMutation: false,
    isPublic: false,
  },
  {
    name: "Live inventory dashboard",
    path: "/dashboard/inventory",
    changesFrequency: "every-request",
    hasMutation: false,
    isPublic: false,
  },
  {
    name: "Blog post with comments",
    path: "/blog/[slug]",
    changesFrequency: "hourly",
    hasMutation: true,
    isPublic: false,
  },
  {
    name: "Payment webhook receiver",
    path: "/api/webhooks/stripe",
    changesFrequency: "every-request",
    hasMutation: true,
    isPublic: true,
  },
];
`;

const decisionEngineStarter = `// decisionEngine.ts
// Three decision functions, one per earlier module's concept, applied
// across every route spec.
import { ROUTE_SPECS, type RouteSpec } from "./architectureSpecs";

export type RenderingStrategy = "static" | "dynamic" | "streaming";
export type CachingStrategy = "long-revalidate" | "short-revalidate" | "no-store";
export type MutationPath = "server-action" | "route-handler" | "none";

export function chooseRendering(spec: RouteSpec): RenderingStrategy {
  // TODO Exercise 1 (Module 3 — Rendering):
  // "rarely" -> "static", "hourly" -> "dynamic", "every-request" -> "streaming"
  return "static";
}

export function chooseCaching(spec: RouteSpec): CachingStrategy {
  // TODO Exercise 2 (Module 4 — Data & Caching):
  // "rarely" -> "long-revalidate", "hourly" -> "short-revalidate",
  // "every-request" -> "no-store"
  return "no-store";
}

export function chooseMutationPath(spec: RouteSpec): MutationPath {
  // TODO Exercise 3 (Modules 5–6 — Mutations & Backend):
  // !hasMutation -> "none"
  // hasMutation && isPublic -> "route-handler" (an external caller needs a stable URL)
  // hasMutation && !isPublic -> "server-action" (a same-app form/button)
  return "none";
}

export function planArchitecture(spec: RouteSpec) {
  return {
    name: spec.name,
    rendering: chooseRendering(spec),
    caching: chooseCaching(spec),
    mutation: chooseMutationPath(spec),
  };
}

export const architecturePlan = ROUTE_SPECS.map(planArchitecture);
`;

const decisionEngineSolution = `import { ROUTE_SPECS, type RouteSpec } from "./architectureSpecs";

export type RenderingStrategy = "static" | "dynamic" | "streaming";
export type CachingStrategy = "long-revalidate" | "short-revalidate" | "no-store";
export type MutationPath = "server-action" | "route-handler" | "none";

export function chooseRendering(spec: RouteSpec): RenderingStrategy {
  if (spec.changesFrequency === "rarely") return "static";
  if (spec.changesFrequency === "hourly") return "dynamic";
  return "streaming";
}

export function chooseCaching(spec: RouteSpec): CachingStrategy {
  if (spec.changesFrequency === "rarely") return "long-revalidate";
  if (spec.changesFrequency === "hourly") return "short-revalidate";
  return "no-store";
}

export function chooseMutationPath(spec: RouteSpec): MutationPath {
  if (!spec.hasMutation) return "none";
  if (spec.isPublic) return "route-handler";
  return "server-action";
}

export function planArchitecture(spec: RouteSpec) {
  return {
    name: spec.name,
    rendering: chooseRendering(spec),
    caching: chooseCaching(spec),
    mutation: chooseMutationPath(spec),
  };
}

export const architecturePlan = ROUTE_SPECS.map(planArchitecture);
`;

const appCode = `import { architecturePlan } from "./decisionEngine";

export default function App() {
  const homepage = architecturePlan.find((p) => p.name === "Marketing homepage")!;
  const dashboard = architecturePlan.find((p) => p.name === "Live inventory dashboard")!;
  const blogPost = architecturePlan.find((p) => p.name === "Blog post with comments")!;
  const webhook = architecturePlan.find((p) => p.name === "Payment webhook receiver")!;

  function describe(p: (typeof architecturePlan)[number]) {
    return \`\${p.rendering} / \${p.caching} / \${p.mutation}\`;
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Production architecture plan (capstone)</h1>
      <p className="plan-homepage">Marketing homepage: {describe(homepage)}</p>
      <p className="plan-dashboard">Live inventory dashboard: {describe(dashboard)}</p>
      <p className="plan-blog">Blog post with comments: {describe(blogPost)}</p>
      <p className="plan-webhook">Payment webhook receiver: {describe(webhook)}</p>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 7.5 sandbox — capstone
=============================

architectureSpecs.ts (read-only) defines four hypothetical routes. Each
exercise implements one decision function in decisionEngine.ts, drawing on
a different earlier module's concepts, and every route reflects the result
in the preview.

1. chooseRendering — Module 3 (Rendering).
2. chooseCaching — Module 4 (Data & Caching).
3. chooseMutationPath — Modules 5–6 (Mutations & Backend).
`,
  },
  { path: "/architectureSpecs.ts", readOnly: true, code: architectureSpecsCode },
  { path: "/decisionEngine.ts", code: decisionEngineStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/architectureSpecs.ts", readOnly: true, code: architectureSpecsCode },
  { path: "/decisionEngine.ts", code: decisionEngineSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m7-l5",
  title: "Production architecture patterns",
  description:
    "The capstone lesson: a decision framework tying together rendering strategy (Module 3), caching (Module 4), mutation paths (Modules 5–6), and folder structure at scale (Module 1) into one coherent way to architect a real production app.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Choose a rendering strategy per route",
      difficulty: "easy",
      instructions: `In \`decisionEngine.ts\`, implement \`chooseRendering\`: \`"rarely"\` → \`"static"\`, \`"hourly"\` → \`"dynamic"\`, \`"every-request"\` → \`"streaming"\`. This is Module 3's rendering-strategy decision, applied per route.`,
      validation: [
        { type: "code-includes", file: "/decisionEngine.ts", pattern: 'return "streaming"', message: "chooseRendering can return streaming for every-request routes" },
        { type: "dom-text", selector: "p.plan-homepage", includes: "static", message: "The rarely-changing homepage resolves to static rendering" },
        { type: "dom-text", selector: "p.plan-dashboard", includes: "streaming", message: "The every-request dashboard resolves to streaming" },
      ],
      hint: `if (spec.changesFrequency === "rarely") return "static";\nif (spec.changesFrequency === "hourly") return "dynamic";\nreturn "streaming";`,
    },
    {
      id: "ex2",
      title: "Choose a caching strategy per route",
      difficulty: "medium",
      instructions: `Implement \`chooseCaching\`: \`"rarely"\` → \`"long-revalidate"\`, \`"hourly"\` → \`"short-revalidate"\`, \`"every-request"\` → \`"no-store"\`. This is Module 4's caching decision, matched to the rendering choice from Exercise 1.`,
      validation: [
        { type: "code-includes", file: "/decisionEngine.ts", pattern: 'return "long-revalidate"', message: "chooseCaching can return long-revalidate for rarely-changing routes" },
        { type: "dom-text", selector: "p.plan-homepage", includes: "long-revalidate", message: "The homepage gets a long revalidation window" },
        { type: "dom-text", selector: "p.plan-dashboard", includes: "no-store", message: "The live dashboard gets no caching at this layer" },
      ],
      hint: `if (spec.changesFrequency === "rarely") return "long-revalidate";\nif (spec.changesFrequency === "hourly") return "short-revalidate";\nreturn "no-store";`,
    },
    {
      id: "ex3",
      title: "Choose where the mutation lives",
      difficulty: "hard",
      instructions: `Implement \`chooseMutationPath\`: no mutation → \`"none"\`; a mutation from a public/external caller → \`"route-handler"\`; a same-app mutation → \`"server-action"\`. This combines Module 5 (Server Actions) and Module 6 (Route Handlers).`,
      validation: [
        { type: "code-includes", file: "/decisionEngine.ts", pattern: 'return "route-handler"', message: "chooseMutationPath can return route-handler for public callers" },
        { type: "dom-text", selector: "p.plan-blog", includes: "server-action", message: "The same-app comment form uses a Server Action" },
        { type: "dom-text", selector: "p.plan-webhook", includes: "route-handler", message: "The external payment webhook uses a Route Handler" },
      ],
      hint: `if (!spec.hasMutation) return "none";\nif (spec.isPublic) return "route-handler";\nreturn "server-action";`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "A route's content changes on every single request and must reflect live state. What rendering strategy fits best?",
      options: [
        "Static rendering with a long revalidate window",
        "Dynamic rendering (or streaming if parts of it are slow to fetch)",
        "No rendering strategy is needed for such routes",
        "Client-side only rendering with no server involvement",
      ],
      answerIndex: 1,
      explanation: "Content that must reflect the current state on every request is the textbook case for dynamic rendering, with streaming layered in if some of that data is slow.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Choosing dynamic rendering for a route means the data cache and request memoization from Module 4 no longer apply.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Rendering strategy and caching are separate axes — request memoization and the data cache still operate within a dynamically rendered route.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A public payment provider needs to POST webhook events to your app. Which mutation path fits?",
      code: `// caller: an external payment provider, not your own React app`,
      options: [
        "A Server Action, since it's simpler",
        "A Route Handler, since the caller isn't your own app and needs a stable HTTP contract",
        "Neither — webhooks can't be handled by Next.js",
        "A Client Component event handler",
      ],
      answerIndex: 1,
      explanation: "Route Handlers exist precisely for callers outside your own React app — a webhook is the canonical example from Module 6.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A route has a long revalidate window for performance, but users report seeing stale data indefinitely after an admin edits the underlying record. What's missing?",
      options: [
        "Nothing — long revalidate windows are supposed to never update",
        "An invalidation call (revalidateTag or revalidatePath) after the mutation that changed the underlying data",
        "The route needs to switch to client-side rendering instead",
        "The cache needs to be disabled entirely"
      ],
      answerIndex: 1,
      explanation: "A caching decision only pays off if it's paired with the matching invalidation path — a long revalidate window with no revalidateTag/revalidatePath after the relevant mutation just serves stale data confidently.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "As an app grows to hundreds of routes, how should folder structure typically evolve?",
      options: [
        "Every file should move to one central components/ folder for consistency",
        "Colocate feature-specific code (page, components, Server Actions) next to its route; centralize only code genuinely shared across many features",
        "Folder structure doesn't matter once the app is in production",
        "Every route should be a route group to avoid any nesting"
      ],
      answerIndex: 1,
      explanation: "Most real apps mix both: colocation keeps a feature deletable as a unit, while central folders suit code with many genuine consumers across features.",
    },
  ],
  keyTakeaways: [
    "A production app answers four questions per route, not once globally: rendering strategy (Module 3), caching strategy (Module 4), where mutations live (Modules 5–6), and folder structure at scale (Module 1).",
    "These four decisions interact — caching still applies within dynamic rendering, and validation still layers client-then-server regardless of what triggered a mutation.",
    "Same-app mutations belong in Server Actions; external callers (webhooks, public APIs) belong in Route Handlers.",
    "A caching decision is incomplete without its matching invalidation path.",
    "Folder structure should mix colocation (feature-specific code) and centralization (genuinely shared code), revisited as the app grows — not decided once and left permanent.",
    "This closes the curriculum: every earlier module's concept is a tool in the same decision framework, applied per route in a real app.",
  ],
  cheatSheet: `
| Decision | Options | Driven by |
| --- | --- | --- |
| Rendering (Module 3) | static / dynamic / streaming | how often content changes, whether parts are slow |
| Caching (Module 4) | long-revalidate / short-revalidate / no-store | matches the rendering choice + how fresh data must be |
| Mutation path (Modules 5–6) | server-action / route-handler / none | is the caller your own app, or external |
| Structure (Module 1) | colocated / centralized | feature-specific vs genuinely shared code |
| Invalidation | \`revalidateTag\` / \`revalidatePath\` | must pair with every non-\`no-store\` caching choice |
`,
  interviewQuestions: [
    "Walk through how you'd decide the rendering and caching strategy for a product page that updates a few times a day but has a live 'X people viewing this' counter.",
    "When would you choose a Route Handler over a Server Action for a mutation, and why does the caller matter more than the mutation's complexity?",
    "How do rendering strategy and caching strategy interact — are they the same decision or two separate ones?",
    "How would you structure the folders for a large app with dozens of features, some shared UI, and a few public API routes?",
    "What goes wrong if a route has a long cache revalidation window but no invalidation path wired to its mutations?",
    "Design the architecture (rendering, caching, mutations) for a hypothetical dashboard with a mostly-static shell, a live data table, and a settings form — and justify each choice.",
  ],
};

export default lesson;
