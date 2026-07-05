import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Open any Next.js project and you'll see the same skeleton. That's deliberate: in Next.js, **the folder structure is not organization — it's configuration**. Folders create routes, special file names create behavior, and understanding this mapping is the single highest-leverage piece of Next.js knowledge.

## Why this exists

Traditional React apps configure routing in code:

\`\`\`tsx
<Route path="/blog/:slug" element={<BlogPost />} />
\`\`\`

This works, but it creates a parallel structure you must keep in sync with your components, it's easy to make routes that dead-end or collide, and every team invents its own conventions. Next.js replaces the route table with a convention borrowed from the earliest web servers (where \`/about.html\` on disk *was* the \`/about\` URL), upgraded for components:

> **A folder = a URL segment. A \`page.tsx\` inside it = the UI for that URL.**

There is nothing to keep in sync because there is only one source of truth.

::diagram{file-routing}

## How it works internally

### The anatomy of a project

\`\`\`
my-app/
├── app/                  ← the router lives here
│   ├── layout.tsx        ← root layout (required): <html> and <body>
│   ├── page.tsx          ← UI for "/"
│   ├── globals.css
│   ├── about/
│   │   └── page.tsx      ← UI for "/about"
│   └── blog/
│       ├── page.tsx      ← UI for "/blog"
│       └── [slug]/
│           └── page.tsx  ← UI for "/blog/anything"
├── components/           ← your components (NOT routes)
├── lib/                  ← utilities, data access
├── public/               ← static files served as-is
├── next.config.mjs
└── package.json
\`\`\`

At build time, Next.js walks the \`app\` directory and compiles a route tree. At request time, the URL is split into segments and matched against that tree, most-specific first. Only **special file names** participate:

| File | Role |
| --- | --- |
| \`page.tsx\` | Makes a segment publicly reachable |
| \`layout.tsx\` | Shared shell that wraps everything below it |
| \`loading.tsx\` | Instant loading UI while the segment loads |
| \`error.tsx\` | Error boundary for the segment |
| \`not-found.tsx\` | 404 UI |
| \`route.ts\` | API endpoint instead of a page |

A crucial consequence: **anything that isn't a special file is private by default**. You can put \`Button.tsx\` or \`utils.ts\` right next to a \`page.tsx\` and it will never become a URL. Only folders containing a \`page.tsx\` are reachable.

### Where non-route code goes

Two common, equally valid conventions:

- **Central folders**: \`components/\`, \`lib/\`, \`hooks/\` at the project root. Simple, good for small/medium apps.
- **Colocation**: keep a route's private components inside its folder (\`app/dashboard/Chart.tsx\`). Good for large apps where features should be self-contained.

Pick one per project and be consistent.

## The sandbox in this lesson

A real file system can't exist inside a browser sandbox, so this lesson's editor includes a tiny read-only file, \`framework.tsx\`, that simulates what Next.js does: you give it a \`routes\` object (standing in for your folder structure) and it matches the current URL against it. It's about 40 lines — reading it will teach you more about routers than a week of using one.

## Common mistakes

- **Expecting every file to become a route.** Only \`page.tsx\` creates a URL. A folder without one is just a path segment (or private code).
- **Naming a component file \`page.tsx\` accidentally** — congratulations, you just published an internal component to the internet.
- **Deep folder trees for no reason.** URL structure should serve *users and SEO*, not mirror your mental org chart.
- **Putting server secrets in \`public/\`.** Everything there is served verbatim to anyone.

## Best practices

- Sketch your URL structure *before* creating folders — the folders will follow.
- Use route groups \`(marketing)\` (folders in parentheses) to organize files without affecting URLs — covered in depth in the Layouts lesson.
- Keep \`app/\` for routing concerns; keep reusable logic in \`lib/\` and reusable UI in \`components/\`.

## Performance considerations

Because routes are known at build time, Next.js code-splits **per route automatically**. Visiting \`/\` never downloads the code for \`/dashboard\`. You get this for free purely by following the folder convention — one more reason not to fight it.
`;

const frameworkCode = `// framework.tsx — a 40-line simulation of what Next.js does with your folders.
// READ-ONLY. In a real app, the "routes" object below is derived from the
// app/ directory: every folder with a page.tsx becomes an entry here.
import React from "react";
import { usePathname } from "next/navigation";

export type RouteTable = Record<string, React.ComponentType>;

export function Router({ routes }: { routes: RouteTable }) {
  // usePathname is the same hook you'll use in real Next.js apps.
  const pathname = usePathname();

  // Match the current URL against the route table (exact match here;
  // dynamic [slug] matching arrives in the Dynamic Routes lesson).
  const Page = routes[pathname];

  if (!Page) {
    return (
      <div style={{ padding: 24 }}>
        <h1>404 — Not Found</h1>
        <p>No page.tsx exists for “{pathname}”.</p>
      </div>
    );
  }
  return <Page />;
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3 sandbox
================

framework.tsx (read-only) simulates the Next.js router.
The "routes" object in App.tsx stands in for your app/ folder:

  "/"        ≙ app/page.tsx
  "/about"   ≙ app/about/page.tsx

Add pages in pages.tsx, register them in App.tsx, and use the
nav links to move around. Watch the preview URL bar update.
`,
  },
  {
    path: "/framework.tsx",
    readOnly: true,
    code: frameworkCode,
  },
  {
    path: "/pages.tsx",
    code: `import Link from "next/link";

// Each function here stands in for one page.tsx file.
export function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <Nav />
      <h1>Home</h1>
      <p>This is app/page.tsx — the UI for “/”.</p>
    </main>
  );
}

// Exercise 1: create AboutPage here.

export function Nav() {
  return (
    <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <Link href="/">Home</Link>
      {/* Exercise 2: add links for the other pages */}
    </nav>
  );
}
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router } from "./framework";
import { HomePage } from "./pages";

// This object simulates your app/ directory.
const routes = {
  "/": HomePage,
  // Exercise 1: register "/about" here
};

export default function App() {
  return <Router routes={routes} />;
}
`,
  },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/pages.tsx",
    code: `import Link from "next/link";

export function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <Nav />
      <h1>Home</h1>
      <p>This is app/page.tsx — the UI for “/”.</p>
    </main>
  );
}

export function AboutPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <Nav />
      <h1>About</h1>
      <p>This is app/about/page.tsx.</p>
    </main>
  );
}

export function ContactPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <Nav />
      <h1>Contact</h1>
      <p>This is app/contact/page.tsx.</p>
    </main>
  );
}

export function Nav() {
  return (
    <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router } from "./framework";
import { HomePage, AboutPage, ContactPage } from "./pages";

const routes = {
  "/": HomePage,
  "/about": AboutPage,
  "/contact": ContactPage,
};

export default function App() {
  return <Router routes={routes} />;
}
`,
  },
];

const lesson: Lesson = {
  id: "m1-l3",
  title: "Project structure & the App Router mental model",
  description:
    "How folders become URLs, which file names are special, where everything else lives — plus a 40-line router you can read.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Register an /about route",
      difficulty: "easy",
      instructions: `In \`pages.tsx\`, create an \`AboutPage\` component (an \`<h1>About</h1>\` inside a \`<main>\`, plus the \`<Nav />\`). Then register it in the \`routes\` object in \`App.tsx\` under \`"/about"\` — the equivalent of creating \`app/about/page.tsx\`.`,
      validation: [
        { type: "code-includes", file: "/pages.tsx", pattern: "AboutPage", message: "AboutPage exists in pages.tsx" },
        { type: "code-regex", file: "/App.tsx", regex: "[\"']/about[\"']\\s*:", message: "\"/about\" is registered in the routes object" },
      ],
    },
    {
      id: "ex2",
      title: "Link the pages together",
      difficulty: "medium",
      instructions: `In the \`Nav\` component, add a \`<Link href="/about">\` so users can navigate. Click it in the preview — notice the page swaps **without a reload** and the 404 appears for unregistered paths.`,
      validation: [
        { type: "dom-count", selector: "nav a", min: 2, message: "The nav contains at least two links" },
        { type: "code-regex", file: "/pages.tsx", regex: "href=[\"']/about[\"']", message: "A Link points to /about" },
      ],
    },
    {
      id: "ex3",
      title: "A third route: /contact",
      difficulty: "hard",
      instructions: `Add a \`ContactPage\` with an \`<h1>Contact</h1>\`, register it at \`"/contact"\`, and add it to the nav. Then test the router's 404: type a nav link to \`/pricing\` (unregistered) and confirm the not-found UI renders — then remove it again.`,
      validation: [
        { type: "code-regex", file: "/App.tsx", regex: "[\"']/contact[\"']\\s*:", message: "\"/contact\" is registered" },
        { type: "code-regex", file: "/pages.tsx", regex: "href=[\"']/contact[\"']", message: "The nav links to /contact" },
        { type: "code-includes", file: "/pages.tsx", pattern: "ContactPage", message: "ContactPage component exists" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What makes a folder inside app/ publicly reachable as a URL?",
      options: [
        "Any .tsx file inside it",
        "A page.tsx file inside it",
        "Registering it in next.config.mjs",
        "An index.html file",
      ],
      answerIndex: 1,
      explanation:
        "Folders define segments, but only page.tsx makes a segment reachable. Everything else stays private.",
    },
    {
      id: "q2",
      type: "mcq",
      question: "Where does the URL /blog/hello-world get its UI in the App Router?",
      options: [
        "app/blog/hello-world.tsx",
        "app/blog/[slug]/page.tsx",
        "pages/blog/[slug].tsx",
        "components/blog/HelloWorld.tsx",
      ],
      answerIndex: 1,
      explanation:
        "Dynamic segments use square-bracket folders. (pages/ is the legacy router.)",
    },
    {
      id: "q3",
      type: "tf",
      question: "Files placed in public/ are processed by the bundler before being served.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation:
        "public/ is served verbatim at the site root. Never put secrets there.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A developer creates app/dashboard/Chart.tsx and app/dashboard/page.tsx. A user visits /dashboard/Chart. What happens?",
      options: [
        "Chart.tsx renders as a page",
        "A build error about conflicting routes",
        "404 — Chart.tsx is not a special file, so it never becomes a route",
        "The dashboard page renders twice",
      ],
      answerIndex: 2,
      explanation:
        "Colocation is safe: only special file names (page, layout, route, ...) participate in routing.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why does file-based routing enable automatic code splitting?",
      options: [
        "It doesn't — you must configure splitting manually",
        "All routes are known at build time, so the bundler can create a separate chunk per route",
        "Because each folder gets its own web server",
        "Because TypeScript removes unused code",
      ],
      answerIndex: 1,
      explanation:
        "A static, analyzable route tree lets Next.js ship each page only the code it needs.",
    },
  ],
  keyTakeaways: [
    "Folders are URL segments; page.tsx makes a segment reachable — that's the whole router.",
    "Special file names (layout, loading, error, route, not-found) attach behavior to a segment.",
    "Everything else is private by default; colocation is safe.",
    "Routes known at build time = automatic per-route code splitting.",
  ],
  cheatSheet: `
| Path | URL |
| --- | --- |
| \`app/page.tsx\` | \`/\` |
| \`app/about/page.tsx\` | \`/about\` |
| \`app/blog/[slug]/page.tsx\` | \`/blog/:slug\` |
| \`app/api/hello/route.ts\` | \`GET /api/hello\` |
| \`public/logo.svg\` | \`/logo.svg\` (static) |
`,
  interviewQuestions: [
    "Compare file-based routing to a code-configured route table. What are the trade-offs?",
    "Which file names are 'special' in the App Router, and what does each do?",
    "How does Next.js decide which code to send for a given page?",
    "Is it safe to colocate components inside app/? Why?",
    "How would you organize a large Next.js codebase — central folders or colocation — and why?",
    "What's the difference between app/ and the legacy pages/ router?",
  ],
};

export default lesson;
