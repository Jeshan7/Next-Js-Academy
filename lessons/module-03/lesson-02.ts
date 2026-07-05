import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Not everything can stay on the server. A "like" button needs to hold a count and respond to clicks the instant a user taps it — no round trip is fast enough for that to feel real. Next.js's answer is the \`"use client"\` directive: a single line at the top of a file that opts *that file and everything it imports* into the browser.

## Why this exists — the problem

Server Components can't use \`useState\`, \`useEffect\`, event handlers, or any browser API (\`window\`, \`localStorage\`) — none of that has meaning on a server process handling a request. But real apps need interactivity somewhere. Next.js needs an explicit, file-level signal for "this code must run in the browser" so its compiler knows what to bundle and ship as JavaScript, and what to leave out entirely.

## How it works internally

### The directive

\`\`\`tsx
"use client";

import { useState } from "react";

export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  return <button onClick={() => setLikes(likes + 1)}>♥ {likes}</button>;
}
\`\`\`

\`"use client"\` must be the very first line of the file (before imports). It marks a **boundary**, not just one component: every component *rendered from* that file is also part of the client bundle, even ones that don't themselves use hooks.

### Where to place it: leaf, not root

The most common mistake is adding \`"use client"\` to a whole page because *one* button on it needs state. That drags the entire page — and everything it imports — into the client bundle, defeating the purpose of Server Components. The rule: push \`"use client"\` **as far down the tree as possible**, onto the smallest component that actually needs interactivity. Everything above it (layouts, data fetching, static markup) stays a Server Component.

::diagram{client-boundary-props}

### What crosses the boundary: serializable props only

A Server Component can render a Client Component and pass it props — but only **serializable** values: strings, numbers, booleans, plain objects/arrays, and JSX (as \`children\`). You cannot pass a function, a class instance, or a \`Map\`/\`Set\` from a Server Component into a Client Component as a prop, because there's no way to serialize "call this server-side function" across the boundary (Server Actions, covered in Module 5, are the real mechanism for that). The fix is always the same: pass the *data* the client needs, and let the Client Component define its own behavior locally.

### Common "can't use hooks" errors

- \`useState\`/\`useEffect\` used inside a file with no \`"use client"\` → build error, because Server Components don't have a client runtime to attach them to.
- \`onClick\` (or any DOM event prop) on a plain Server Component → same problem, since event handlers are JavaScript that must run in the browser.
- Importing a Client Component into a Server Component is fine and extremely common — it's the reverse (importing server-only code, like a database client, into client code) that breaks.

## Real-world example

A blog post page: the title, body, and author bio are static per-request content — Server Components. The "like" counter and a "copy link" button need client state and clipboard access — small Client Components, each marked \`"use client"\`, imported and rendered inside the otherwise-server page. The page ships one tiny JS bundle for two buttons, not the whole article.

## The sandbox in this lesson

\`PostCard\` is a plain Server Component (no directive) that reads \`post\` from \`data.ts\` and renders two Client Component leaves, passing only serializable data down: a number (\`initialLikes\`) and a string (\`postId\`) — never a callback.

## Common mistakes

- **Marking a whole page \`"use client"\`** because one child needs interactivity — bloats the bundle.
- **Trying to pass a function as a prop** from a Server to a Client Component — it isn't serializable.
- **Forgetting the directive entirely** and then being confused by "hooks only work in Client Components" errors.

## Best practices

- Treat \`"use client"\` as a boundary you draw as low in the tree as possible.
- Pass IDs and data down; let the Client Component fetch or compute anything else it needs locally, or wire up a Server Action for real mutations.
- Keep third-party client-only libraries (charting, drag-and-drop) isolated behind their own small Client Component wrapper.

## Performance considerations

Every component you keep out of a \`"use client"\` file is JavaScript your users never download. A page with 10 Server Components and 1 tiny Client leaf ships roughly the JS of that one leaf — not the whole page.
`;

const dataCode = `export interface Post {
  id: string;
  title: string;
  likes: number;
}

export const post: Post = {
  id: "p1",
  title: "Why Server Components ship less JS",
  likes: 12,
};
`;

const likeButtonStarter = `// Exercise 2: make this a Client Component — it needs to hold state.
export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  return <button className="like-btn">love {initialLikes}</button>;
}
`;

const likeButtonSolution = `"use client";

import { useState } from "react";

export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  return (
    <button className="like-btn" onClick={() => setLikes(likes + 1)}>
      love {likes}
    </button>
  );
}
`;

const deleteButtonStarter = `// Exercise 3: this leaf only ever needs the post's id — never a function
// passed down from a Server Component. Make it a Client Component that
// just logs the id when clicked (a real app would call a Server Action here).
export default function DeleteButton({ postId }: { postId: string }) {
  return <button className="delete-btn">Delete</button>;
}
`;

const deleteButtonSolution = `"use client";

export default function DeleteButton({ postId }: { postId: string }) {
  return (
    <button
      className="delete-btn"
      onClick={() => console.log("delete requested for " + postId)}
    >
      Delete
    </button>
  );
}
`;

const postCardStarter = `import LikeButton from "./LikeButton";
import DeleteButton from "./DeleteButton";
import { post } from "./data";

// This is a Server Component: no "use client", no hooks — it just reads
// server data and passes the serializable parts down to Client leaves.
export default function PostCard() {
  return (
    <article style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
      {/* Exercise 1: render post.title in an <h2 className="post-title">,
          then render <LikeButton initialLikes={post.likes} /> and
          <DeleteButton postId={post.id} /> */}
    </article>
  );
}
`;

const postCardSolution = `import LikeButton from "./LikeButton";
import DeleteButton from "./DeleteButton";
import { post } from "./data";

export default function PostCard() {
  return (
    <article style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
      <h2 className="post-title">{post.title}</h2>
      <LikeButton initialLikes={post.likes} />
      <DeleteButton postId={post.id} />
    </article>
  );
}
`;

const appCode = `import PostCard from "./PostCard";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Composing Server & Client Components</h1>
      <PostCard />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 3.2 sandbox
==================

PostCard is a Server Component (no directive). It passes only
serializable data — a number and a string — down into two Client
Component leaves.

1. Finish PostCard.tsx.
2. Turn LikeButton.tsx into a Client Component.
3. Turn DeleteButton.tsx into a Client Component that only needs postId.
`,
  },
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/LikeButton.tsx", code: likeButtonStarter },
  { path: "/DeleteButton.tsx", code: deleteButtonStarter },
  { path: "/PostCard.tsx", code: postCardStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/data.ts", readOnly: true, code: dataCode },
  { path: "/LikeButton.tsx", code: likeButtonSolution },
  { path: "/DeleteButton.tsx", code: deleteButtonSolution },
  { path: "/PostCard.tsx", code: postCardSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m3-l2",
  title: 'Client Components & the "use client" boundary',
  description:
    "Why the directive exists, where to place it, what can (and can't) cross the boundary, and the hook errors it prevents.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Compose the card",
      difficulty: "easy",
      instructions: `In \`PostCard.tsx\`, render \`post.title\` in an \`<h2 className="post-title">\`, then render \`<LikeButton initialLikes={post.likes} />\` and \`<DeleteButton postId={post.id} />\`.`,
      validation: [
        { type: "dom-exists", selector: "h2.post-title", message: "The card renders an <h2 class=\"post-title\">" },
        { type: "code-includes", file: "/PostCard.tsx", pattern: "post.likes", message: "LikeButton receives post.likes" },
        { type: "code-includes", file: "/PostCard.tsx", pattern: "post.id", message: "DeleteButton receives post.id" },
      ],
    },
    {
      id: "ex2",
      title: "LikeButton needs the browser",
      difficulty: "medium",
      instructions: `In \`LikeButton.tsx\`, add \`"use client"\` as the first line, import \`useState\`, initialize state from the \`initialLikes\` prop, and increment it on click.`,
      validation: [
        { type: "code-includes", file: "/LikeButton.tsx", pattern: "use client", message: "LikeButton is marked as a Client Component" },
        { type: "code-regex", file: "/LikeButton.tsx", regex: "useState(<[^>]*>)?\\(initialLikes\\)", message: "State is initialized from the initialLikes prop" },
        { type: "code-includes", file: "/LikeButton.tsx", pattern: "onClick", message: "Clicking the button updates the count" },
      ],
      hint: `const [likes, setLikes] = useState(initialLikes);`,
    },
    {
      id: "ex3",
      title: "Pass data, not behavior",
      difficulty: "hard",
      instructions: `In \`DeleteButton.tsx\`, add \`"use client"\`, then add an \`onClick\` handler that logs \`"delete requested for " + postId\`. Notice \`PostCard\` never passed a delete *function* down — only the id, which is why this works across the boundary.`,
      validation: [
        { type: "code-includes", file: "/DeleteButton.tsx", pattern: "use client", message: "DeleteButton is marked as a Client Component" },
        { type: "code-includes", file: "/DeleteButton.tsx", pattern: "console.log", message: "Clicking Delete logs the request" },
        { type: "code-includes", file: "/DeleteButton.tsx", pattern: "postId", message: "The handler uses the postId prop, not a passed-in function" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: 'What does "use client" placed at the top of a file actually do?',
      options: [
        "Disables server rendering for the whole app",
        "Marks that file (and its subtree) as part of the client bundle, allowed to use hooks and browser APIs",
        "Tells Next.js to skip type-checking the file",
        "Forces the component to re-fetch data on every render",
      ],
      answerIndex: 1,
      explanation: '"use client" is a boundary marker for the bundler — everything rendered from that file ships to and runs in the browser.',
    },
    {
      id: "q2",
      type: "tf",
      question: 'Placing "use client" on a top-level page is usually the best practice when only one small child needs interactivity.',
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "That drags the entire page's subtree into the client bundle. The directive should sit on the smallest leaf that needs it.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A Server Component tries to pass this prop to a Client Component. What happens?",
      code: `<SaveButton onSave={() => db.save(record)} />`,
      options: [
        "It works exactly like passing a string",
        "It fails — functions aren't serializable across the Server/Client boundary",
        "The function runs on the server and only the result is sent",
        "Next.js automatically converts it to a Server Action",
      ],
      answerIndex: 1,
      explanation: "Only serializable data (strings, numbers, plain objects, arrays, JSX) can cross into a Client Component as props.",
    },
    {
      id: "q4",
      type: "debugging",
      question: 'A component throws "useState only works in a Client Component" even though the file looks fine. The first line is a comment, then imports, then "use client". What is wrong?',
      options: [
        "useState needs a different import path",
        '"use client" must be the very first line of the file, before any comments or imports',
        "The component needs to be async",
        "Nothing — this should work",
      ],
      answerIndex: 1,
      explanation: 'The directive is positional: it must be the literal first line for the compiler to recognize the boundary.',
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why is it fine for a Server Component to import and render a Client Component, but not the other way around?",
      options: [
        "It isn't fine either way",
        "Server Components can produce output client code can consume, but client code importing server-only modules (DB clients, secrets) would leak them into the browser bundle",
        "Import order doesn't matter in JavaScript",
        "Client Components can never be imported by anything",
      ],
      answerIndex: 1,
      explanation: "The asymmetry exists because server-only code (and its dependencies/secrets) must never end up in a client bundle.",
    },
  ],
  keyTakeaways: [
    '"use client" is a file-level boundary marker, not a per-component one — everything the file renders joins the client bundle.',
    "Push the directive as far down the tree as possible: leaf components, not whole pages.",
    "Only serializable values (strings, numbers, plain objects/arrays, JSX) can cross from a Server Component into a Client Component as props.",
    "Functions and class instances can't cross the boundary as props — pass data and let the client define behavior, or use a Server Action.",
  ],
  cheatSheet: `
| Rule | Why |
| --- | --- |
| \`"use client"\` = first line, before imports | Positional signal the compiler looks for |
| Place on leaves, not pages | Keeps the rest of the tree server-only (0 KB) |
| Props crossing the boundary: data only | Functions/class instances aren't serializable |
| Server → Client import: fine | Client → server-only import: leaks secrets/bloats bundle |
`,
  interviewQuestions: [
    'What exactly does "use client" mark, and why must it be the first line of the file?',
    "Why should the directive be placed as low in the component tree as possible?",
    "What kinds of props can and can't cross from a Server Component into a Client Component, and why?",
    "How would you refactor a page that has \"use client\" at the top but only needs interactivity in one button?",
    "Why is importing a Client Component from a Server Component safe, but not the reverse?",
    "What real mechanism lets a Client Component trigger server-side logic, if not a function prop?",
  ],
};

export default lesson;
