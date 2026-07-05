import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Almost every app has chrome that repeats: a header on every page, a sidebar across a dashboard section, tabs across a settings area. **Layouts** are the App Router's answer — UI that wraps a whole branch of your route tree, renders once, and stays mounted while pages change inside it.

## Why this exists

Before layouts, shared chrome meant one of two hacks:

- **Copy the header into every page** — guaranteed drift; someone forgets to update one copy.
- **One global wrapper component with conditionals** — \`if (path.startsWith("/dashboard")) show sidebar\` — a growing pile of route logic living far from the routes themselves.

Both also share a deeper flaw: on navigation, the wrapper *re-renders*, losing scroll position, resetting animations, remounting anything stateful. The App Router bakes the solution into the file system: put a \`layout.tsx\` in a folder and it wraps everything beneath that folder — declaratively, and **without re-rendering on navigation**.

::diagram{layout-nesting}

## How it works internally

### Layouts compose by nesting

A layout is a component that receives \`children\`:

\`\`\`tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <section>{children}</section>
    </div>
  );
}
\`\`\`

When a URL like \`/dashboard/settings\` is rendered, Next.js walks the folders from the root down, wrapping as it goes:

\`\`\`
RootLayout            ← app/layout.tsx        (html, body)
  └── DashboardLayout ← app/dashboard/layout.tsx
        └── Page      ← app/dashboard/settings/page.tsx
\`\`\`

The rendered output is literally \`RootLayout(DashboardLayout(Page))\`. Every folder on the path contributes its layout, if it has one.

### The root layout

\`app/layout.tsx\` is **required** and is the only place that renders \`<html>\` and \`<body>\`. It replaces the old \`_app.tsx\`/\`_document.tsx\` pair from the legacy router.

### The persistence guarantee

During client navigation from \`/dashboard/sales\` to \`/dashboard/settings\`, Next.js compares route trees, sees that \`RootLayout\` and \`DashboardLayout\` are unchanged, and swaps **only the page slot**. The layouts don't re-run, don't re-fetch, don't lose state. This is a *guarantee of the architecture*, not an optimization you enable.

### Route groups: organization without URLs

Sometimes you want different layouts for sections that share a URL level — marketing pages get a footer, app pages get a sidebar, both live at the root. Folders named in parentheses are **route groups**: they can hold a layout but add nothing to the URL.

\`\`\`
app/
├── (marketing)/
│   ├── layout.tsx     ← footer layout
│   ├── page.tsx       ← "/"
│   └── pricing/page.tsx  ← "/pricing"
└── (app)/
    ├── layout.tsx     ← sidebar layout
    └── dashboard/page.tsx ← "/dashboard"
\`\`\`

### Templates: when you *want* remounting

\`template.tsx\` looks like a layout but **remounts on every navigation** — fresh state each time. Use it for enter animations or per-page reset logic. Layout = persistent; template = fresh.

## Real-world example

A SaaS app: root layout carries \`<html>\`, fonts and the toast container; \`(marketing)\` group wraps public pages in header+footer; \`(app)\` group wraps the product in a sidebar; \`app/(app)/settings/layout.tsx\` adds a tab bar over the settings sub-pages. Three levels of nesting, zero conditionals.

## Common mistakes

- **Expecting layouts to re-render on navigation** — e.g., reading the pathname in a layout and wondering why it's stale. Active-link logic belongs in a Client Component (\`usePathname\`), which does re-render.
- **A second \`<html>\` or \`<body>\` in a nested layout** — only the root layout owns those.
- **Using a layout where a template is needed** (page-enter animations that never replay).
- **Deeply nesting layouts "for structure"** — every level adds wrapper DOM and mental overhead; nest only when a branch genuinely shares chrome.

## Best practices

- Keep layouts lean: chrome and providers, not page logic.
- Use route groups to give sections different shells without warping your URLs.
- Data needed by all pages of a section can be fetched in that section's layout once.

## Performance considerations

Persistent layouts mean less work per navigation: less rendering, fewer fetches, no layout flicker. The heavier your shared chrome, the more this architecture pays off.
`;

const frameworkCode = `// framework.tsx — READ-ONLY. The router now supports per-branch layouts,
// mirroring how Next.js composes layout.tsx files from the root down.
import React from "react";
import { usePathname } from "next/navigation";

type LayoutComponent = React.ComponentType<{ children: React.ReactNode }>;

export interface RouteEntry {
  page: React.ComponentType;
  /** Layouts applied outermost-first, like folders from the root down. */
  layouts?: LayoutComponent[];
}

export function Router({ routes }: { routes: Record<string, RouteEntry> }) {
  const pathname = usePathname();
  const entry = routes[pathname];
  if (!entry) {
    return <div style={{ padding: 24 }}><h1>404</h1><p>No page for “{pathname}”.</p></div>;
  }
  const { page: Page, layouts = [] } = entry;
  // Compose: RootLayout(SectionLayout(Page)) — reduceRight nests inward.
  return layouts.reduceRight<React.ReactNode>(
    (children, Layout) => <Layout>{children}</Layout>,
    <Page />
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5 sandbox
================

framework.tsx now composes layouts exactly like Next.js does:
each route lists the layouts that wrap it, outermost first —
the equivalent of the layout.tsx files on its folder path.

You'll build a RootLayout, then a nested DashboardLayout,
and verify that layout state survives navigation.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/layouts.tsx",
    code: `import Link from "next/link";
import { useState } from "react";

// Exercise 1: RootLayout — a header with nav links, then {children}.
export function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Exercise 2: DashboardLayout — a sidebar next to {children}.
// Give it a counter button to prove layout state survives navigation.
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router, RouteEntry } from "./framework";
import { RootLayout } from "./layouts";

function Home() {
  return <main style={{ padding: 24 }}><h1>Home</h1></main>;
}
function Sales() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Sales</h1></main>;
}
function Settings() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Settings</h1></main>;
}

const routes: Record<string, RouteEntry> = {
  "/": { page: Home, layouts: [RootLayout] },
  // Exercise 2: give the two dashboard routes a second, nested layout:
  "/dashboard/sales": { page: Sales, layouts: [RootLayout] },
  "/dashboard/settings": { page: Settings, layouts: [RootLayout] },
};

export default function App() {
  return <div style={{ fontFamily: "system-ui" }}><Router routes={routes} /></div>;
}
`,
  },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/layouts.tsx",
    code: `import Link from "next/link";
import { useState } from "react";

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd" }}>
        <strong>Acme</strong>
        <Link href="/">Home</Link>
        <Link href="/dashboard/sales">Dashboard</Link>
      </header>
      {children}
    </>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div style={{ display: "flex" }}>
      <aside
        className="sidebar"
        style={{ width: 200, padding: 16, borderRight: "1px solid #ddd", display: "grid", gap: 8 }}
      >
        <Link href="/dashboard/sales">Sales</Link>
        <Link href="/dashboard/settings">Settings</Link>
        <button onClick={() => setClicks(clicks + 1)}>
          Layout state: {clicks}
        </button>
      </aside>
      <section style={{ flex: 1 }}>{children}</section>
    </div>
  );
}
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router, RouteEntry } from "./framework";
import { RootLayout, DashboardLayout } from "./layouts";

function Home() {
  return <main style={{ padding: 24 }}><h1>Home</h1></main>;
}
function Sales() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Sales</h1></main>;
}
function Settings() {
  return <main style={{ padding: 24 }}><h1 className="page-title">Settings</h1></main>;
}

const routes: Record<string, RouteEntry> = {
  "/": { page: Home, layouts: [RootLayout] },
  "/dashboard/sales": { page: Sales, layouts: [RootLayout, DashboardLayout] },
  "/dashboard/settings": { page: Settings, layouts: [RootLayout, DashboardLayout] },
};

export default function App() {
  return <div style={{ fontFamily: "system-ui" }}><Router routes={routes} /></div>;
}
`,
  },
];

const lesson: Lesson = {
  id: "m2-l2",
  title: "Layouts & nested layouts",
  description:
    "Persistent shared chrome, layout composition from the folder tree, route groups, and templates vs layouts.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "A root layout with a header",
      difficulty: "easy",
      instructions: `Fill in \`RootLayout\` in \`layouts.tsx\`: a \`<header>\` containing a brand name and \`<Link>\`s to **/** and **/dashboard/sales**, followed by \`{children}\`. Every page should now share the header.`,
      validation: [
        { type: "dom-exists", selector: "header", message: "A shared <header> renders on every page" },
        { type: "dom-count", selector: "header a", min: 2, message: "The header contains at least two links" },
        { type: "code-includes", file: "/layouts.tsx", pattern: "{children}", message: "RootLayout renders its children slot" },
      ],
    },
    {
      id: "ex2",
      title: "Nest a dashboard layout",
      difficulty: "medium",
      instructions: `Create \`DashboardLayout\` in \`layouts.tsx\`: an \`<aside className="sidebar">\` with links to **Sales** and **Settings**, next to \`{children}\`. In \`App.tsx\`, add it as a *second* layout for both dashboard routes — the equivalent of creating \`app/dashboard/layout.tsx\`.`,
      validation: [
        { type: "code-includes", file: "/layouts.tsx", pattern: "DashboardLayout", message: "DashboardLayout exists" },
        { type: "code-regex", file: "/App.tsx", regex: "layouts:\\s*\\[\\s*RootLayout\\s*,\\s*DashboardLayout\\s*\\]", flags: "", message: "Dashboard routes nest both layouts, outermost first" },
      ],
      hint: "layouts: [RootLayout, DashboardLayout] — order matters: outermost first.",
    },
    {
      id: "ex3",
      title: "Prove layouts persist",
      difficulty: "hard",
      instructions: `Add a button inside the sidebar showing a \`useState\` counter (**Layout state: N**). Increment it, then navigate between Sales and Settings. Because both routes share the same layout instance, the counter must survive. (In this simulator, as in real Next.js, the layout component isn't remounted when only the page changes.)`,
      validation: [
        { type: "dom-exists", selector: ".sidebar button", message: "The sidebar contains the counter button" },
        { type: "code-includes", file: "/layouts.tsx", pattern: "useState", message: "The layout holds state with useState" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Which file is allowed to render <html> and <body>?",
      options: [
        "Any layout.tsx",
        "Only the root app/layout.tsx",
        "page.tsx",
        "next.config.mjs",
      ],
      answerIndex: 1,
      explanation: "Nested layouts render fragments inside the root layout's body.",
    },
    {
      id: "q2",
      type: "code-prediction",
      question: "app/layout.tsx and app/shop/layout.tsx both exist. What wraps app/shop/cart/page.tsx?",
      options: [
        "Only the shop layout — the nearest one wins",
        "Only the root layout",
        "RootLayout, wrapping ShopLayout, wrapping the page",
        "The page chooses its layout via a prop",
      ],
      answerIndex: 2,
      explanation:
        "Layouts accumulate down the folder path — they nest rather than replace each other.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "What does a route group folder like (marketing) do?",
      options: [
        "Adds /marketing to every URL inside it",
        "Lets you attach a layout (and organization) without affecting URLs",
        "Marks routes as static",
        "Hides routes from the router",
      ],
      answerIndex: 1,
      explanation:
        "Parenthesized folders are invisible to the URL — organization and per-section layouts only.",
    },
    {
      id: "q4",
      type: "mcq",
      question: "You want a fade-in animation to replay on every navigation within a section. Which file?",
      options: ["layout.tsx", "template.tsx", "loading.tsx", "page.tsx only"],
      answerIndex: 1,
      explanation:
        "Templates remount per navigation (fresh state, effects re-run); layouts persist.",
    },
    {
      id: "q5",
      type: "tf",
      question: "Navigating between two pages under the same layout re-renders that layout.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation:
        "Unchanged segments are preserved — the layout keeps its DOM and state. That's the persistence guarantee.",
    },
  ],
  keyTakeaways: [
    "A layout.tsx wraps every route beneath its folder; layouts nest down the path.",
    "Layouts persist across navigation — state, DOM and fetches survive.",
    "Route groups (parens) give sections their own shells without changing URLs.",
    "template.tsx = layout that remounts; use it when you need per-navigation freshness.",
  ],
  cheatSheet: `
| File | Behavior |
| --- | --- |
| \`app/layout.tsx\` | Root; owns \`<html>\`/\`<body>\` |
| \`app/x/layout.tsx\` | Wraps everything under \`/x\`; persists |
| \`app/(group)/\` | Layout scope, no URL segment |
| \`template.tsx\` | Like layout, but remounts each navigation |
`,
  interviewQuestions: [
    "How does Next.js decide which layouts wrap a given page?",
    "Why do layouts preserve state across navigation, and how would you demonstrate it?",
    "Layout vs template — differences and a use case for each.",
    "How would you give marketing pages and app pages different shells at the same URL depth?",
    "Where would you put a data fetch needed by every page of a section?",
    "What replaced _app.tsx and _document.tsx from the pages router?",
  ],
};

export default lesson;
