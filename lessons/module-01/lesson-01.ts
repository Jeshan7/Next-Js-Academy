import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Next.js is a **framework built on top of React**. React gives you a way to describe user interfaces as components; Next.js gives you everything *around* those components that a real product needs: routing, rendering on the server, data fetching, caching, code splitting, image optimization, and a production build pipeline.

A useful mental model: **React is the engine, Next.js is the car.** You could buy an engine and build the chassis, wheels, and steering yourself — many teams did exactly that between 2015 and 2018 — but most of that work is identical from project to project. Next.js is that identical work, done once, maintained by a full-time team, and battle-tested by millions of sites.

## Why this exists — the problem

To understand Next.js you must understand the problem it was created to solve.

### The world before: two bad options

**Option 1 — Classic server-rendered sites (PHP, Rails, Django).**
Every click asks the server for a brand-new HTML page. This is great for first load and SEO — the browser receives finished HTML — but every interaction throws the page away and rebuilds it. Rich, app-like interfaces (think Gmail or Figma) feel sluggish because state lives on the server.

**Option 2 — Single Page Applications (plain React with create-react-app).**
The server sends an *empty* HTML shell plus a large JavaScript bundle. The browser downloads the bundle, executes it, and only *then* renders anything. Interactions are instant afterwards, but:

- **The first paint is slow.** Users stare at a blank screen while megabytes of JS download and parse.
- **SEO suffers.** Crawlers and link previews see an empty \`<div id="root"></div>\`.
- **Everything ships to the client.** Data-fetching logic, markdown parsers, date libraries — all of it lands in the user's bundle whether it needs to run in the browser or not.

::diagram{rendering-spectrum}

### The insight

The fix is obvious in hindsight: **render React on the server first**, send real HTML so the page appears immediately, then let JavaScript take over in the browser to make it interactive (a step called **hydration**). Doing this by hand is genuinely hard — you need a Node server, a bundler configured twice (server + client), route-level code splitting, and careful data serialization. Next.js, released in 2016, packaged that entire architecture behind one convention: *put a file in a folder, get a route with server rendering for free.*

## How it works internally

When a request hits a Next.js app, roughly this happens:

1. **Routing.** The URL is matched against your file system (\`app/blog/page.tsx\` → \`/blog\`). No route table to maintain — the folder structure *is* the router.
2. **Server render.** React runs on the server, producing an HTML stream. Server Components render entirely here and ship **zero JavaScript** to the browser.
3. **Streaming.** HTML is streamed to the browser as it's produced, so the user sees content before the whole page is ready.
4. **Hydration.** For the interactive parts (Client Components), the browser downloads only their code and attaches event listeners to the already-visible HTML.
5. **Client-side navigation.** After the first load, clicking a \`<Link>\` doesn't reload the page — Next.js fetches just the payload for the next route and swaps it in.

You get MPA-quality first loads *and* SPA-quality navigation. That combination is the entire reason the framework exists.

## Real-world example

Imagine an e-commerce product page:

- Product title, price, description → rendered on the **server** (fast, SEO-friendly, no JS shipped).
- "Add to cart" button and image carousel → small **client** components (interactive).
- The page can be **statically pre-rendered** at build time and **revalidated** when the price changes.

With plain React you'd ship the whole page as JS. With classic PHP you'd rebuild the page on every click. Next.js lets each part of the page use the strategy that suits it.

## Common mistakes

- **Treating Next.js as "React with extra config."** It's an architectural shift: the default rendering location is the *server*, not the browser. Beginners fight this instead of embracing it.
- **Reaching for Next.js when a plain SPA is fine.** An internal dashboard behind a login, with no SEO needs, may not benefit from server rendering. Know the trade-offs.
- **Assuming everything re-renders in the browser.** Server Component code never runs client-side — \`console.log\` there appears in your *terminal*, not DevTools. This confuses almost everyone at first.

## Best practices

- Start every component as a Server Component; opt into the client only when you need state, effects, or browser APIs.
- Let the file system drive your architecture — fighting the conventions negates the framework's value.
- Measure before optimizing: Next.js ships good defaults (code splitting, prefetching, image optimization). Use them before adding your own layers.

## Performance considerations

The biggest lever Next.js gives you is **shipping less JavaScript**. Every component that stays on the server is code the user never downloads. On slow devices and networks this is the difference between a 1-second and a 6-second page load.
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 1 sandbox
================

This sandbox runs a real React tree, the same library Next.js builds on.

Open App.tsx and work through the exercises in the theory panel.
Press "Run" to refresh the preview, then "Check" to validate each exercise.
`,
  },
  {
    path: "/App.tsx",
    code: `// Your first component. Everything in Next.js is built from these.
export default function App() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <p>Edit me in App.tsx</p>
    </main>
  );
}
`,
  },
];

const solutionFiles = [
  {
    path: "/App.tsx",
    code: `const features = [
  "Server-side rendering",
  "File-based routing",
  "Automatic code splitting",
];

export default function App() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Welcome to Next.js Academy</h1>
      <p className="subtitle">React is the engine, Next.js is the car.</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </main>
  );
}
`,
  },
];

const lesson: Lesson = {
  id: "m1-l1",
  title: "What is Next.js & why it exists",
  description:
    "The problem Next.js solves, how it compares to SPAs and classic server rendering, and what happens on every request.",
  durationMin: 25,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Render a heading",
      difficulty: "easy",
      instructions: `Replace the placeholder paragraph with an \`<h1>\` that says **Welcome to Next.js Academy**.`,
      validation: [
        {
          type: "dom-text",
          selector: "h1",
          includes: "Welcome to Next.js Academy",
          message: "The page renders an <h1> with the welcome text",
        },
      ],
      hint: "JSX looks like HTML: <h1>Welcome to Next.js Academy</h1>",
    },
    {
      id: "ex2",
      title: "Add a subtitle",
      difficulty: "medium",
      instructions: `Below the heading, add a \`<p>\` with the class name \`subtitle\` containing the sentence *React is the engine, Next.js is the car.* Remember: in JSX the attribute is \`className\`, not \`class\`.`,
      validation: [
        {
          type: "dom-exists",
          selector: "p.subtitle",
          message: "A <p class=\"subtitle\"> element exists",
        },
        {
          type: "code-includes",
          file: "/App.tsx",
          pattern: "className",
          message: "You used className (JSX) instead of class (HTML)",
        },
      ],
    },
    {
      id: "ex3",
      title: "Render a list from data",
      difficulty: "hard",
      instructions: `Create an array called \`features\` with at least three Next.js features as strings, then render it as a \`<ul>\` using \`.map()\`. Give each \`<li>\` a \`key\` prop — React needs it to track list items efficiently.`,
      validation: [
        { type: "dom-count", selector: "ul li", min: 3, message: "The <ul> contains at least 3 items" },
        { type: "code-includes", file: "/App.tsx", pattern: ".map(", message: "You rendered the list with .map()" },
        { type: "code-includes", file: "/App.tsx", pattern: "key=", message: "Each list item has a key prop" },
      ],
      hint: "{features.map((f) => <li key={f}>{f}</li>)}",
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What is the core problem Next.js was created to solve?",
      options: [
        "React was too slow at rendering components",
        "SPAs ship blank HTML and large JS bundles, hurting first load and SEO, while classic server apps can't feel app-like",
        "JavaScript couldn't run on servers before Next.js",
        "CSS was hard to write in React",
      ],
      answerIndex: 1,
      explanation:
        "Next.js combines the strengths of both worlds: server-rendered HTML for fast first paint and SEO, plus client-side navigation for an app-like feel.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Server Components ship their JavaScript to the browser so they can re-render there.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation:
        "Server Components render only on the server. Their code never reaches the browser — that's the main performance win.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "What is hydration?",
      options: [
        "Fetching data on the server before rendering",
        "Compressing HTML before sending it to the browser",
        "Attaching JavaScript behavior (event listeners, state) to server-rendered HTML in the browser",
        "Caching pages at the CDN edge",
      ],
      answerIndex: 2,
      explanation:
        "The server sends finished HTML; hydration is the browser step where React takes over that HTML and makes it interactive.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "In a Server Component, where does this log appear?",
      code: `export default function Page() {\n  console.log("hello");\n  return <h1>Hi</h1>;\n}`,
      options: [
        "In the browser DevTools console",
        "In the terminal running the Next.js server",
        "Both places",
        "Nowhere — console.log is not allowed",
      ],
      answerIndex: 1,
      explanation:
        "Server Component code executes on the server, so its logs appear in the server terminal. This surprises almost every beginner.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "After the first page load, what happens when a user clicks a Next.js <Link>?",
      options: [
        "A full page reload, like a classic website",
        "Next.js fetches only the payload for the next route and swaps it in without reloading",
        "The browser opens the link in a new tab",
        "Nothing until you configure a router",
      ],
      answerIndex: 1,
      explanation:
        "Client-side navigation is what makes Next.js apps feel like SPAs after the initial server-rendered load.",
    },
  ],
  keyTakeaways: [
    "React is a UI library; Next.js is the production framework around it.",
    "SPAs are slow to first paint and bad for SEO; classic server apps can't feel app-like. Next.js gives you both strengths.",
    "The default rendering location in Next.js is the server — the browser is opt-in.",
    "Hydration turns server-rendered HTML into an interactive app.",
  ],
  cheatSheet: `
| Concept | One-liner |
| --- | --- |
| SPA | Empty HTML + big JS bundle; fast after load, slow before |
| SSR | Server sends real HTML; fast first paint, good SEO |
| Hydration | Browser JS attaches to server HTML |
| Server Component | Renders on server, ships **0 KB** JS |
| \`<Link>\` | Client-side navigation without page reloads |
`,
  interviewQuestions: [
    "Explain the difference between a SPA and a server-rendered app. What trade-offs does each make?",
    "What is hydration and why is it necessary?",
    "Why do Server Components improve performance?",
    "Walk me through what happens between a request hitting a Next.js server and the page becoming interactive.",
    "When would you *not* choose Next.js for a project?",
    "How does Next.js achieve SPA-like navigation after the first load?",
  ],
};

export default lesson;
