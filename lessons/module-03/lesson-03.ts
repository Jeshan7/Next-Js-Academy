import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

The previous lesson placed \`"use client"\` on a small leaf component. But what happens when a Client Component needs to wrap around a chunk of markup that itself must stay server-rendered — a modal, a tab panel, a collapsible section? Importing the server content directly into the client file would drag it into the client bundle. The fix is a pattern you already know from plain React: **children**.

## Why this exists — the problem

A Client Component's file is a boundary: anything it \`import\`s joins the client bundle. If a \`"use client"\` panel component needed to render an article's body, and it imported that Server Component directly, the article's data-fetching code and dependencies would ship to the browser too — exactly what Server Components exist to avoid.

## How it works internally

### Passing Server Components as children

Instead of importing server content into a Client Component, a **Server Component higher up the tree** renders the server content and passes it down as \`children\` (or any other JSX-typed prop):

\`\`\`tsx
// Panel.tsx — "use client"
"use client";
export default function Panel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button>
      {open && children}
    </div>
  );
}

// Page.tsx — a Server Component
import Panel from "./Panel";
import ServerContent from "./ServerContent"; // never imported by Panel.tsx

export default function Page() {
  return (
    <Panel>
      <ServerContent />   {/* rendered on the server, slotted in as children */}
    </Panel>
  );
}
\`\`\`

\`Panel.tsx\` has **zero knowledge** of \`ServerContent\` — it just renders whatever \`children\` it was given. \`Page.tsx\` (a Server Component) does the composing, so \`ServerContent\` still renders fully on the server and ships no JS of its own. Only \`Panel\`'s own code (the toggle logic) becomes a client bundle.

::diagram{composition-children-slot}

### The rule this enforces: don't import server code into client files

The moment a \`"use client"\` file \`import\`s something, that something is compiled for the browser too. This is fine for other Client Components, plain utility functions, and data — but importing a Server Component (or server-only modules like a database client) into a \`"use client"\` file either breaks the build or, worse, silently ships things that were never meant to leave the server. Composition via \`children\`/props sidesteps this entirely: the Client Component never imports the Server Component; it just renders a slot.

### Third-party Client Components

Many npm packages (chart libraries, drag-and-drop, rich text editors) are Client Components internally, whether or not they say so. If a package doesn't mark itself with \`"use client"\`, wrap it in your *own* thin Client Component file and re-export it from there — that one wrapper file is where you draw the boundary, and everything downstream of it is understood to be client code.

## Real-world example

A \`<Modal>\` component manages open/closed state (client) but its *content* — a product description fetched from a database — should stay server-rendered. The page (Server Component) fetches the product and renders \`<Modal><ProductDetails product={product} /></Modal>\`. \`Modal.tsx\` never imports \`ProductDetails\`; it only knows about \`children\`.

## The sandbox in this lesson

\`Panel.tsx\` is a Client Component that only manages open/closed state and renders \`children\`. \`ServerContent.tsx\` is a plain (server-style) component reading article data. \`App.tsx\`, playing the role of the page's Server Component, composes them: \`<Panel><ServerContent /></Panel>\`.

## Common mistakes

- **Importing a Server Component directly into a \`"use client"\` file** instead of accepting it as \`children\`.
- **Wrapping an entire page in a client "layout" component** instead of composing children from a Server Component parent.
- **Forgetting to wrap unmarked third-party client libraries**, causing confusing build errors when they're rendered from a Server Component.

## Best practices

- When a Client Component needs to display server content, accept it as \`children\` (or a JSX prop) instead of importing it.
- Keep the composing (which Server Component renders which Client Component, with what as children) in Server Components as high in the tree as makes sense.
- Create one thin \`"use client"\` wrapper file per third-party client library, and import the wrapper everywhere, never the raw package, from server code that doesn't need it directly.

## Performance considerations

This pattern is what lets *interactive shells* (modals, accordions, tabs) wrap around *heavy static content* (long articles, data tables) without that content's weight ever reaching the client bundle — only the shell's toggle logic does.
`;

const dataCode = `export interface Article {
  title: string;
  body: string;
}

export const article: Article = {
  title: "Composition beats importing",
  body: "Pass server content down as children instead of importing it into a client file.",
};
`;

const serverContentStarter = `import { article } from "./data";

// This plays the role of a Server Component: it reads data directly and
// has no "use client" directive.
export default function ServerContent() {
  return (
    <div>
      {/* Exercise 1: render article.title in an <h3 className="article-title">
          and article.body in a <p className="article-body"> */}
    </div>
  );
}
`;

const serverContentSolution = `import { article } from "./data";

export default function ServerContent() {
  return (
    <div>
      <h3 className="article-title">{article.title}</h3>
      <p className="article-body">{article.body}</p>
    </div>
  );
}
`;

const panelStarter = `// Exercise 2: make this a Client Component that toggles visibility of
// whatever it's given as children. It must NOT import ServerContent —
// it only knows about the "children" prop.
import type { ReactNode } from "react";

export default function Panel({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
`;

const panelSolution = `"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export default function Panel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="panel">
      <button className="panel-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"}
      </button>
      {open && <div className="panel-body">{children}</div>}
    </div>
  );
}
`;

const appStarter = `import Panel from "./Panel";
import ServerContent from "./ServerContent";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Composing across the boundary</h1>
      {/* Exercise 3: render <Panel> and slot <ServerContent /> inside it
          as children — Panel.tsx should never import ServerContent itself. */}
    </main>
  );
}
`;

const appSolution = `import Panel from "./Panel";
import ServerContent from "./ServerContent";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Composing across the boundary</h1>
      <Panel>
        <ServerContent />
      </Panel>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.3 sandbox
==================

Panel.tsx is a Client Component that only knows about "children".
ServerContent.tsx plays the role of a Server Component with its own data.

1. Finish ServerContent.tsx.
2. Turn Panel.tsx into a Client Component that toggles children.
3. In App.tsx, slot <ServerContent /> inside <Panel> as children.
`,
  },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/ServerContent.tsx", code: serverContentStarter },
  { path: "/Panel.tsx", code: panelStarter },
  { path: "/App.tsx", code: appStarter },
];

const solutionFiles = [
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/ServerContent.tsx", code: serverContentSolution },
  { path: "/Panel.tsx", code: panelSolution },
  { path: "/App.tsx", code: appSolution },
];

const lesson: Lesson = {
  id: "m3-l3",
  title: "Composition patterns across the boundary",
  description:
    "Passing Server Components as children into Client Components, why you never import server code into client files, and wrapping third-party client libraries.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Build the server content",
      difficulty: "easy",
      instructions: `In \`ServerContent.tsx\`, render \`article.title\` in an \`<h3 className="article-title">\` and \`article.body\` in a \`<p className="article-body">\`.`,
      validation: [
        { type: "dom-exists", selector: "h3.article-title", message: "Renders an <h3 class=\"article-title\">" },
        { type: "dom-exists", selector: "p.article-body", message: "Renders a <p class=\"article-body\">" },
      ],
    },
    {
      id: "ex2",
      title: "A Client Component that only knows children",
      difficulty: "medium",
      instructions: `Turn \`Panel.tsx\` into a Client Component: add \`"use client"\`, use \`useState\` to track \`open\` (default true), and render a button that toggles it. Render \`children\` only when \`open\` is true. Do not import \`ServerContent\` here.`,
      validation: [
        { type: "code-includes", file: "/Panel.tsx", pattern: "use client", message: "Panel is marked as a Client Component" },
        { type: "code-includes", file: "/Panel.tsx", pattern: "useState", message: "Panel tracks open/closed state" },
        { type: "code-includes", file: "/Panel.tsx", pattern: "children", message: "Panel renders whatever it's given as children" },
      ],
    },
    {
      id: "ex3",
      title: "Slot the server content in",
      difficulty: "hard",
      instructions: `In \`App.tsx\`, render \`<Panel>\` with \`<ServerContent />\` inside it as children. This is the composing step: \`App.tsx\` (playing the Server Component role) is the only file that imports both.`,
      validation: [
        { type: "code-regex", file: "/App.tsx", regex: "<Panel>[\\s\\S]*<ServerContent\\s*/>[\\s\\S]*</Panel>", message: "ServerContent is rendered as a child of Panel" },
        { type: "dom-exists", selector: ".panel .panel-body h3.article-title", message: "The article renders inside the panel's body" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "A modal needs to toggle open/closed (client) but should display server-fetched content without shipping its fetch logic to the browser. What's the pattern?",
      options: [
        "Import the server content directly into the modal's client file",
        "Have a Server Component parent render the modal, passing the server content in as children",
        "Fetch the data again inside the modal with useEffect",
        "Mark the server content \"use client\" too",
      ],
      answerIndex: 1,
      explanation: "Composing via children lets a Server Component parent supply already-rendered server content to a Client Component that never imports it.",
    },
    {
      id: "q2",
      type: "tf",
      question: 'A Client Component that receives a Server Component as "children" causes that Server Component\'s code to be bundled for the browser.',
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The Server Component is rendered by its Server Component parent before the tree is passed down — the Client Component only holds a reference to already-rendered output.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: 'What happens if Panel.tsx ("use client") directly imports and renders ServerContent instead of accepting it as children?',
      code: `"use client";\nimport ServerContent from "./ServerContent";\nexport default function Panel() {\n  return <div><ServerContent /></div>;\n}`,
      options: [
        "Nothing changes — imports don't affect bundling",
        "ServerContent (and its dependencies) get compiled into the client bundle, defeating the purpose of keeping it server-only",
        "This is required syntax and works correctly",
        "It automatically converts ServerContent into a Client Component",
      ],
      answerIndex: 1,
      explanation: "Anything a \"use client\" file imports joins the client bundle — that's the whole reason to accept server content as children instead.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "You render a third-party chart library directly from a Server Component and get a hooks/build error. The library never states whether it's client or server. What's the fix?",
      options: [
        "Give up on the library",
        "Wrap it in your own small \"use client\" file and import that wrapper instead of the raw package",
        "Add async to the Server Component",
        "Move the entire page into pages/ instead of app/",
      ],
      answerIndex: 1,
      explanation: "Unmarked third-party client libraries need a thin \"use client\" wrapper — that wrapper is where you draw the boundary explicitly.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why does Panel.tsx in this lesson's sandbox never import ServerContent.tsx?",
      options: [
        "Because TypeScript forbids it",
        "Because accepting it as children keeps ServerContent's rendering (and any data-fetching) entirely on the server, with Panel only handling its own toggle logic",
        "Because children are faster to render than imports",
        "There's no real reason, it's just a style choice",
      ],
      answerIndex: 1,
      explanation: "This is the core reason the children-composition pattern exists: it separates 'what toggles' (client) from 'what's shown' (can stay server).",
    },
  ],
  keyTakeaways: [
    "Accept server content as children (or a JSX prop) instead of importing it into a \"use client\" file.",
    "The Server Component parent does the composing; the Client Component only ever sees already-rendered output.",
    "Never import a Server Component, or server-only modules, from inside a \"use client\" file.",
    "Wrap unmarked third-party client libraries in your own thin \"use client\" file to draw the boundary explicitly.",
  ],
  cheatSheet: `
| Pattern | Where server content stays |
| --- | --- |
| Import ServerContent into Panel.tsx ("use client") | Bundled for the browser — wrong |
| \`<Panel><ServerContent /></Panel>\` composed in a Server Component | Server-only — correct |
| Unmarked third-party client lib | Wrap in your own "use client" file |
`,
  interviewQuestions: [
    "Why does passing a Server Component as children avoid bundling it for the client?",
    "Where does the 'composing' happen in the children-slot pattern, and why does that matter?",
    "What goes wrong if a \"use client\" file directly imports a Server Component?",
    "How would you integrate a third-party component library that doesn't declare \"use client\" itself?",
    "Give a real-world example where this composition pattern matters for bundle size.",
    "What's the difference between passing JSX as children versus passing a render function as a prop, in terms of the Server/Client boundary?",
  ],
};

export default lesson;
