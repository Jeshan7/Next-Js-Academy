import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

You now know how folders become routes. This lesson is about **moving between them**: the \`<Link>\` component, programmatic navigation with \`useRouter\`, reading the current URL with \`usePathname\`, and what actually happens on the wire when a user clicks.

## Why this exists

A plain \`<a href="/about">\` triggers a **full page load**: the browser tears down the entire JavaScript world — every component, all state, all listeners — downloads the new document, and boots React from scratch. For a framework whose selling point is app-like speed, that's unacceptable for internal navigation.

\`<Link>\` exists to intercept that click and replace the teardown with something surgical.

::diagram{navigation-flow}

## How it works internally

### What a Link click actually does

1. \`<Link>\` renders a real \`<a>\` tag (right-click → open in new tab still works; crawlers still see a normal link).
2. On click, it calls \`event.preventDefault()\` — the browser's navigation is cancelled.
3. Next.js updates the URL with the **History API** (\`pushState\`), so back/forward buttons behave correctly.
4. It fetches the **RSC payload** for the target route — not a full HTML document, but a compact description of the new page's server-rendered tree.
5. React reconciles: the parts of the tree that changed (the page) are swapped; the parts that didn't (shared layouts, and all their state) are **left untouched**.

That last point is the one that surprises people: navigating between two pages under the same layout does *not* re-render the layout. A video keeps playing in the sidebar; a search box keeps its text.

### Prefetching

In production, Next.js watches the viewport. When a \`<Link>\` scrolls into view, it **prefetches** the target route in the background. By the time the user clicks, the payload is usually already in the cache — navigation feels instant. This is why Next.js sites can feel faster than the network should allow.

### Programmatic navigation

Sometimes navigation follows logic, not a click — after a form submits, after login succeeds:

\`\`\`tsx
"use client";
import { useRouter } from "next/navigation";

function LoginButton() {
  const router = useRouter();
  async function handleLogin() {
    // ...authenticate...
    router.push("/dashboard");     // adds a history entry
    // router.replace("/dashboard") — swaps the current entry (good after login,
    // so Back doesn't return to the login form)
  }
  return <button onClick={handleLogin}>Sign in</button>;
}
\`\`\`

### Knowing where you are

\`usePathname()\` returns the current URL path and re-renders your component when it changes — the standard tool for highlighting the active nav item.

## Real-world example

Every app with a sidebar uses this trio: \`<Link>\` for the items, \`usePathname\` to bold the active one, \`router.push\` after actions like "create project" to jump to the new project's page.

## Common mistakes

- **Using \`<a>\` for internal links.** Works, but throws away all state and re-downloads the app on every click. Use \`<a>\` only for external URLs.
- **Using \`<Link>\` for external URLs.** The router can't prefetch or client-navigate to another origin; use a plain \`<a>\` there.
- **Forgetting \`"use client"\`** when using \`useRouter\`/\`usePathname\` — hooks only exist in Client Components.
- **\`router.push\` after login** instead of \`router.replace\` — pressing Back returns the user to a login form they've already passed.

## Best practices

- Centralize your nav in one component; derive the active state from \`usePathname\`, never from local state.
- Let prefetching do its job — don't build your own hover-preloading.
- Preserve accessibility: \`<Link>\` renders an anchor, so keep meaningful \`href\`s and readable link text.

## Performance considerations

Client navigation transfers a few kilobytes (the RSC payload) instead of a full document plus assets. Combined with viewport prefetching, most navigations complete from cache. The cost: the prefetcher can fetch pages the user never visits — Next.js budgets this automatically, and you can opt out per-link with \`prefetch={false}\` for rarely-used links in huge lists.
`;

const frameworkCode = `// framework.tsx — READ-ONLY route simulator (same as the previous lesson).
import React from "react";
import { usePathname } from "next/navigation";

export type RouteTable = Record<string, React.ComponentType>;

export function Router({ routes }: { routes: RouteTable }) {
  const pathname = usePathname();
  const Page = routes[pathname];
  if (!Page) {
    return (
      <div style={{ padding: 24 }}>
        <h1>404 — Not Found</h1>
        <p>No page exists for “{pathname}”.</p>
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
    code: `Lesson 4 sandbox
================

A three-page site is wired up. Your job:
1. Build the Nav with <Link> components.
2. Highlight the active link with usePathname.
3. Add a programmatic redirect with useRouter.

The sandbox implements the real next/link and next/navigation APIs.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/Nav.tsx",
    code: `import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  // Exercise 2: call usePathname() and style the active item.
  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd" }}>
      {/* Exercise 1: render one <Link> per item */}
    </nav>
  );
}
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router } from "./framework";
import { Nav } from "./Nav";
import { useRouter } from "next/navigation";

function Home() {
  const router = useRouter();
  return (
    <main style={{ padding: 24 }}>
      <h1>Home</h1>
      {/* Exercise 3: a button that router.push()-es to /docs */}
    </main>
  );
}

function Pricing() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Pricing</h1>
    </main>
  );
}

function Docs() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Docs</h1>
    </main>
  );
}

const routes = { "/": Home, "/pricing": Pricing, "/docs": Docs };

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <Nav />
      <Router routes={routes} />
    </div>
  );
}
`,
  },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/Nav.tsx",
    code: `import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd" }}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : ""}
            style={{ fontWeight: active ? 700 : 400, color: active ? "#0a0a0a" : "#555" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
`,
  },
  {
    path: "/App.tsx",
    code: `import { Router } from "./framework";
import { Nav } from "./Nav";
import { useRouter } from "next/navigation";

function Home() {
  const router = useRouter();
  return (
    <main style={{ padding: 24 }}>
      <h1>Home</h1>
      <button onClick={() => router.push("/docs")}>Read the docs →</button>
    </main>
  );
}

function Pricing() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Pricing</h1>
    </main>
  );
}

function Docs() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Docs</h1>
    </main>
  );
}

const routes = { "/": Home, "/pricing": Pricing, "/docs": Docs };

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <Nav />
      <Router routes={routes} />
    </div>
  );
}
`,
  },
];

const lesson: Lesson = {
  id: "m2-l1",
  title: "Navigation: Link, prefetching & useRouter",
  description:
    "What actually happens when a user clicks, why layouts keep their state, and how prefetching makes navigation feel instant.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Build the nav with Link",
      difficulty: "easy",
      instructions: `In \`Nav.tsx\`, map over \`items\` and render a \`<Link href={item.href}>\` for each. Click around in the preview — note that the URL changes without a page reload.`,
      validation: [
        { type: "dom-count", selector: "nav a", min: 3, message: "The nav renders three links" },
        { type: "code-includes", file: "/Nav.tsx", pattern: "<Link", message: "You used the Link component (not a plain <a>)" },
      ],
    },
    {
      id: "ex2",
      title: "Highlight the active route",
      difficulty: "medium",
      instructions: `Call \`usePathname()\` and give the link whose \`href\` matches the current path the class \`active\` (and bold styling). Navigate between pages and watch it follow you.`,
      validation: [
        { type: "code-includes", file: "/Nav.tsx", pattern: "usePathname()", message: "usePathname() is called" },
        { type: "dom-exists", selector: "nav a.active", message: "Exactly one nav link carries the active class" },
      ],
      hint: "const pathname = usePathname(); const active = pathname === item.href;",
    },
    {
      id: "ex3",
      title: "Programmatic navigation",
      difficulty: "hard",
      instructions: `On the Home page, add a button labelled **Read the docs →** that calls \`router.push("/docs")\` on click. This mirrors real flows like redirecting after a successful form submission.`,
      validation: [
        { type: "code-includes", file: "/App.tsx", pattern: "router.push(", message: "The button navigates with router.push" },
        { type: "dom-exists", selector: "main button", message: "The Home page renders a button" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does <Link> render into the DOM?",
      options: [
        "A <button> with a click handler",
        "A real <a> tag whose default navigation is intercepted",
        "A custom <next-link> element",
        "Nothing — it's purely logical",
      ],
      answerIndex: 1,
      explanation:
        "Rendering a real anchor preserves SEO, middle-click, and accessibility while enabling client-side navigation.",
    },
    {
      id: "q2",
      type: "mcq",
      question: "Two pages share a layout containing a playing video. The user navigates between them with <Link>. What happens to the video?",
      options: [
        "It restarts, because the whole page re-renders",
        "It keeps playing — shared layouts are not re-rendered during client navigation",
        "It pauses until hydration finishes",
        "It unmounts and remounts",
      ],
      answerIndex: 1,
      explanation:
        "Only the changed segments are swapped. Preserving layout state is a core App Router behavior.",
    },
    {
      id: "q3",
      type: "tf",
      question: "In production, Next.js prefetches routes for links that enter the viewport.",
      options: ["True", "False"],
      answerIndex: 0,
      explanation:
        "Viewport prefetching is why clicks often resolve from cache and feel instant.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "After login, users complain that pressing Back returns them to the login form. Which line is the culprit?",
      code: `async function onLogin() {\n  await signIn(credentials);\n  router.push("/dashboard");\n}`,
      options: [
        "signIn should be synchronous",
        "router.push adds a history entry; use router.replace so the login page is swapped out of history",
        "You must use <Link> instead",
        "The await is unnecessary",
      ],
      answerIndex: 1,
      explanation:
        "push = add to history, replace = overwrite the current entry. After auth flows, replace is almost always right.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "When should you use a plain <a> instead of <Link>?",
      options: [
        "Never",
        "For links to external origins (and downloads), where client-side navigation is impossible",
        "For links inside layouts",
        "Whenever the link has an onClick",
      ],
      answerIndex: 1,
      explanation:
        "The Next.js router only manages routes inside your app. External URLs are the browser's job.",
    },
  ],
  keyTakeaways: [
    "<Link> renders a real <a>, cancels the browser navigation, and swaps in the new route's payload.",
    "Shared layouts survive navigation with their state intact.",
    "Viewport prefetching makes most clicks resolve from cache.",
    "useRouter for logic-driven navigation; replace (not push) after login-style flows.",
  ],
  cheatSheet: `
| API | Use |
| --- | --- |
| \`<Link href="/x">\` | Internal navigation |
| \`<a href="https://...">\` | External links only |
| \`useRouter().push(href)\` | Navigate in code (+ history entry) |
| \`useRouter().replace(href)\` | Navigate, overwrite history |
| \`usePathname()\` | Current path, reactive |
| \`prefetch={false}\` | Opt a Link out of prefetching |
`,
  interviewQuestions: [
    "Walk through what happens, step by step, when a user clicks a <Link>.",
    "Why does Next.js render a real anchor tag instead of handling clicks on a div?",
    "How does prefetching work and what are its costs?",
    "push vs replace — give a scenario for each.",
    "Why do layouts keep their state across navigation, and why is that useful?",
    "How would you highlight the active item in a nav bar?",
  ],
};

export default lesson;
