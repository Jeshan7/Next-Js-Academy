import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

The dynamic-routes lesson introduced \`generateStaticParams\` briefly: a function that tells Next.js which param values exist, so a \`[slug]\` route can become a set of pre-rendered files instead of a template rendered on every request. This lesson goes deeper: **when** static rendering applies, what actually happens at build time, and the decision tree for choosing it.

## Why this exists — the problem

Rendering a page on every single request is wasted work if the page's output never changes between requests — a marketing page, a blog post, a docs page. Recomputing identical HTML for every visitor burns server time and adds latency the visitor shouldn't have to wait through. **Static rendering** does that work exactly once, at build time, and serves the same file to everyone afterwards — often straight from a CDN edge node, no server involved at all.

## How it works internally

### What "static" means

A route is eligible for static rendering when its output doesn't depend on anything only available at request time: no reading cookies/headers, no \`searchParams\`, no per-user data. Next.js detects this automatically for routes with no dynamic segments. For routes *with* dynamic segments (\`[slug]\`), you must tell it which values to pre-render:

\`\`\`tsx
// app/docs/[slug]/page.tsx
export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));   // one entry per file to pre-render
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();
  return <article><h1>{doc.title}</h1>{doc.body}</article>;
}
\`\`\`

At build time, Next.js calls \`generateStaticParams\`, then renders \`DocPage\` once **per returned param combination**, writing each result as a static HTML file (plus the RSC payload) — before any real visitor ever requests it.

::diagram{build-vs-request-time}

### What happens to values it wasn't told about

\`generateStaticParams\` doesn't have to be exhaustive. A slug that exists in your data but wasn't returned by it (published after the last build, say) can still be requested. By default (\`dynamicParams: true\`), Next.js renders it on demand the first time someone asks — the same code path, just running at request time instead of build time — and can cache that result afterward. Setting \`dynamicParams: false\` instead makes any unlisted param 404, useful when you want a strictly closed set of pages.

### The decision tree

1. Does the output depend on request-time data (cookies, headers, searchParams, logged-in user)? → **dynamic** (next lesson covers this fully).
2. Otherwise, does the route have dynamic segments with a known, enumerable set of values? → **static with \`generateStaticParams\`**.
3. Otherwise (no dynamic segments, no request-time dependency) → **static automatically**, no extra code needed.

## Real-world example

A documentation site with 400 pages: all 400 are known at build time, so \`generateStaticParams\` returns all 400 slugs and the entire site becomes static files — no server work per visitor, sub-millisecond responses from the CDN. Add a 401st page after deploying, and (with the default \`dynamicParams: true\`) the first visitor to request it triggers a one-time on-demand render, after which it too is cached.

## The sandbox in this lesson

The read-only \`framework.tsx\` simulates a build step: \`StaticParamsRouter\` accepts a \`staticParams\` list (standing in for \`generateStaticParams\`'s return value) and, once per "build" (computed via \`useMemo\` with no dependencies — it only ever runs once, just like a real build), marks which param combinations were pre-rendered. Anything else is flagged as rendered on demand — same content, different badge.

## Common mistakes

- **Forgetting \`generateStaticParams\` entirely** on a dynamic route with a mostly-fixed set of values, missing out on build-time pre-rendering for no reason.
- **Assuming unlisted params always 404** — the default is to render them on demand, not reject them.
- **Adding request-time logic (reading cookies, random values) to a route you expect to be static** — this silently disables static rendering for it.

## Best practices

- For content with a known, bounded set of values (docs, blog posts, product catalogs under a few thousand items), always implement \`generateStaticParams\`.
- Let \`dynamicParams\` stay at its default (\`true\`) unless you specifically need unlisted params to 404.
- Re-deploy (or use on-demand revalidation, next lesson) when the underlying data changes — static output doesn't refresh itself.

## Performance considerations

Static output is the fastest thing Next.js can serve: no server render, often no server involved at all — just a file at the edge. Maximizing the set of pages covered by \`generateStaticParams\` is one of the highest-leverage performance changes available for content-heavy sites.
`;

const frameworkCode = `// framework.tsx — READ-ONLY.
// Simulates a "build" step: StaticParamsRouter accepts a staticParams list
// (standing in for generateStaticParams's return value) and computes, once
// only (useMemo with an empty dependency array — never recomputed, just
// like a real build), which param combinations were pre-rendered.
import React from "react";
import { usePathname } from "next/navigation";

export type PageComponent = React.ComponentType<{ params: Record<string, string> }>;

function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const u = pathname.split("/").filter(Boolean);
  if (p.length !== u.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    if (seg.startsWith("[") && seg.endsWith("]")) {
      params[seg.slice(1, -1)] = decodeURIComponent(u[i]);
    } else if (seg !== u[i]) {
      return null;
    }
  }
  return params;
}

export function StaticParamsRouter({
  routes,
  staticParams,
}: {
  routes: Record<string, PageComponent>;
  staticParams: Record<string, string>[];
}) {
  const pathname = usePathname();
  const builtSet = React.useMemo(() => {
    console.log("[build] generateStaticParams ran — pre-rendering " + staticParams.length + " page(s)");
    return new Set(staticParams.map((p) => JSON.stringify(p)));
  }, []); // empty deps: this runs exactly once, like a real build

  const patterns = Object.keys(routes).sort(
    (a, b) => (a.match(/\\[/g)?.length ?? 0) - (b.match(/\\[/g)?.length ?? 0)
  );
  for (const pattern of patterns) {
    const params = match(pattern, pathname);
    if (params) {
      const isStatic = builtSet.has(JSON.stringify(params));
      const Page = routes[pattern];
      return (
        <div>
          <div className={isStatic ? "render-badge render-static" : "render-badge render-dynamic"}>
            {isStatic ? "STATIC — pre-rendered at build time" : "DYNAMIC — rendered on demand"}
          </div>
          <Page params={params} />
        </div>
      );
    }
  }
  return <div style={{ padding: 24 }}><h1>404</h1><p>No route matches "{pathname}".</p></div>;
}
`;

const dataCode = `export interface Doc {
  slug: string;
  title: string;
  body: string;
}

// Known at build time — these get pre-rendered by generateStaticParams.
export const docs: Doc[] = [
  { slug: "intro", title: "Introduction", body: "Start here." },
  { slug: "routing", title: "Routing", body: "Folders become routes." },
  { slug: "caching", title: "Caching", body: "Four layers, one model." },
];

// Published after the last build — not in the static params list, but a
// lookup still finds it, so it falls back to on-demand rendering.
export const lateDoc: Doc = {
  slug: "changelog",
  title: "Changelog",
  body: "Added after the last build — rendered on demand, not pre-built.",
};

export function getDoc(slug: string): Doc | undefined {
  return [...docs, lateDoc].find((d) => d.slug === slug);
}
`;

const docPageStarter = `import { getDoc } from "./data";

export default function DocPage({ params }: { params: Record<string, string> }) {
  const doc = getDoc(params.slug);
  if (!doc) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="not-found">Doc not found</h1>
      </main>
    );
  }
  return (
    <main style={{ padding: 24 }}>
      {/* Exercise 1: render doc.title in an <h2 className="doc-title">
          and doc.body in a <p className="doc-body"> */}
    </main>
  );
}
`;

const docPageSolution = `import { getDoc } from "./data";

export default function DocPage({ params }: { params: Record<string, string> }) {
  const doc = getDoc(params.slug);
  if (!doc) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="not-found">Doc not found</h1>
      </main>
    );
  }
  return (
    <main style={{ padding: 24 }}>
      <h2 className="doc-title">{doc.title}</h2>
      <p className="doc-body">{doc.body}</p>
    </main>
  );
}
`;

const appStarter = `import Link from "next/link";
import { StaticParamsRouter, PageComponent } from "./framework";
import DocPage from "./DocPage";
import { docs } from "./data";

const routes: Record<string, PageComponent> = {
  "/docs/[slug]": DocPage,
};

// Exercise 2: build this the way generateStaticParams would — one
// { slug } entry per known doc.
const staticParams: Record<string, string>[] = [];

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <nav style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        {/* Exercise 3: add a <Link> for every doc in "docs", plus one
            extra <Link href="/docs/changelog">Changelog</Link> — the
            late-published doc that's NOT in staticParams. */}
      </nav>
      <StaticParamsRouter routes={routes} staticParams={staticParams} />
    </div>
  );
}
`;

const appSolution = `import Link from "next/link";
import { StaticParamsRouter, PageComponent } from "./framework";
import DocPage from "./DocPage";
import { docs } from "./data";

const routes: Record<string, PageComponent> = {
  "/docs/[slug]": DocPage,
};

const staticParams: Record<string, string>[] = docs.map((doc) => ({ slug: doc.slug }));

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <nav className="doc-nav" style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        {docs.map((doc) => (
          <Link key={doc.slug} href={"/docs/" + doc.slug}>
            {doc.title}
          </Link>
        ))}
        <Link href="/docs/changelog">Changelog</Link>
      </nav>
      <StaticParamsRouter routes={routes} staticParams={staticParams} />
    </div>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.4 sandbox
==================

framework.tsx simulates a build step: any param combination in
staticParams is flagged STATIC; anything else renders on demand and
is flagged DYNAMIC.

1. Finish DocPage.tsx.
2. Build staticParams from docs.map(...) — like generateStaticParams.
3. Add nav links for every doc, plus one to /docs/changelog (not in
   staticParams) — click around and compare the render badges.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/DocPage.tsx", code: docPageStarter },
  { path: "/App.tsx", code: appStarter },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/DocPage.tsx", code: docPageSolution },
  { path: "/App.tsx", code: appSolution },
];

const lesson: Lesson = {
  id: "m3-l4",
  title: "Static rendering & generateStaticParams",
  description:
    "Build-time HTML generation in depth, generateStaticParams and dynamicParams, and the decision tree for static vs dynamic rendering.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Render the doc",
      difficulty: "easy",
      instructions: `In \`DocPage.tsx\`, render \`doc.title\` in an \`<h2 className="doc-title">\` and \`doc.body\` in a \`<p className="doc-body">\`.`,
      validation: [
        { type: "dom-exists", selector: "h2.doc-title", message: "Renders an <h2 class=\"doc-title\">" },
        { type: "dom-exists", selector: "p.doc-body", message: "Renders a <p class=\"doc-body\">" },
      ],
    },
    {
      id: "ex2",
      title: "Simulate generateStaticParams",
      difficulty: "medium",
      instructions: `In \`App.tsx\`, build \`staticParams\` from \`docs.map((doc) => ({ slug: doc.slug }))\` — exactly what \`generateStaticParams\` would return for these three docs.`,
      validation: [
        { type: "code-includes", file: "/App.tsx", pattern: "docs.map", message: "staticParams is derived from the docs data" },
        { type: "code-includes", file: "/App.tsx", pattern: "slug: doc.slug", message: "Each entry provides a slug value" },
      ],
    },
    {
      id: "ex3",
      title: "Compare static vs on-demand",
      difficulty: "hard",
      instructions: `In \`App.tsx\`, render a \`<Link>\` for every doc in \`docs\`, plus one extra \`<Link href="/docs/changelog">Changelog</Link>\`. Click through each: the three known docs show a STATIC badge; changelog — published after the simulated build, and absent from \`staticParams\` — shows DYNAMIC even though its content renders fine.`,
      validation: [
        { type: "dom-count", selector: "nav a", min: 4, message: "The nav links to all three docs plus the changelog" },
        { type: "code-includes", file: "/App.tsx", pattern: "/docs/changelog", message: "A link to the unlisted changelog doc exists" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does generateStaticParams actually do?",
      options: [
        "Validates route params at runtime",
        "Returns the list of param values Next.js should pre-render as static pages at build time",
        "Generates TypeScript types for a route's params",
        "Replaces the need for a params prop entirely",
      ],
      answerIndex: 1,
      explanation: "It enumerates the dynamic route's known values so each becomes a static file produced during the build.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A slug not returned by generateStaticParams always results in a 404.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "By default (dynamicParams: true), unlisted params are rendered on demand at request time, not rejected. Setting dynamicParams: false changes this.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A docs site has 400 known pages and adds a 401st after the last deploy. With default settings, what happens on the first visit to the new page?",
      options: [
        "A 404, since it wasn't in generateStaticParams",
        "It renders on demand at request time, and can be cached afterward",
        "The whole site rebuilds automatically",
        "It silently redirects to the homepage",
      ],
      answerIndex: 1,
      explanation: "dynamicParams defaults to true: unlisted values fall back to on-demand rendering using the same page code.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A route has no dynamic segments and reads no request-time data, yet a teammate insists it needs generateStaticParams to be static. Are they right?",
      options: [
        "Yes, every route needs it",
        "No — generateStaticParams is only needed for routes with dynamic segments; static routes without them are static automatically",
        "Yes, but only for the homepage",
        "No, static rendering is deprecated",
      ],
      answerIndex: 1,
      explanation: "generateStaticParams enumerates values for [param] segments. A route with no dynamic segments and no request-time dependency is static with no extra code.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Which of these would disqualify a route from static rendering?",
      options: [
        "Rendering a fixed array of features",
        "Reading a cookie to decide what to show",
        "Importing a CSS file",
        "Having a single dynamic segment with a known set of values",
      ],
      answerIndex: 1,
      explanation: "Reading request-time data like cookies means the output can differ per visitor per request — the definition of needing dynamic rendering.",
    },
  ],
  keyTakeaways: [
    "Static rendering runs a route's code once at build time and serves the same output to every visitor.",
    "generateStaticParams tells Next.js which dynamic segment values to pre-render as static files.",
    "Unlisted params fall back to on-demand rendering by default (dynamicParams: true), not a 404.",
    "The decision tree: request-time data → dynamic; enumerable dynamic segments → static + generateStaticParams; neither → static automatically.",
  ],
  cheatSheet: `
| Situation | Rendering |
| --- | --- |
| No dynamic segments, no request-time data | Static, automatic |
| Dynamic segments, known value set | Static + generateStaticParams |
| Reads cookies/headers/searchParams | Dynamic (next lesson) |
| Unlisted param, dynamicParams: true (default) | Rendered on demand, then cacheable |
| Unlisted param, dynamicParams: false | 404 |
`,
  interviewQuestions: [
    "What does generateStaticParams return, and when does Next.js call it?",
    "What happens to a dynamic route value that generateStaticParams didn't return?",
    "Walk through the decision tree for choosing static vs dynamic rendering for a given route.",
    "Why is static rendering the fastest option Next.js can serve, and when does it not apply?",
    "What's the difference between dynamicParams: true and false?",
    "For a docs site, why is implementing generateStaticParams almost always worth it?",
  ],
};

export default lesson;
