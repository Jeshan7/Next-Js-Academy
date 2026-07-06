import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Everything queried so far in this course has come from an in-memory array standing in for "the database." Real apps need an actual database, and in the Next.js ecosystem, **Prisma** is the most common way to talk to one — specifically, to PostgreSQL, a relational database. This lesson is conceptual: there's no real database available inside this environment, so the goal is understanding the shape and rules of the integration well enough to use it correctly the first time you connect one for real.

## Why this exists — the problem

You could talk to Postgres with raw SQL strings and a driver library directly. That works, but you lose type safety (a typo in a column name is a runtime error, not a compile error), you hand-write migrations by comparing schema diffs yourself, and every query's return shape has to be manually kept in sync with your TypeScript types. An **ORM** (Object-Relational Mapper) like Prisma trades a small amount of flexibility for: a single schema file that's the source of truth for your data shape, generated TypeScript types that match your schema exactly, and a migration system that turns schema changes into versioned, applied-in-order SQL migrations.

Raw SQL isn't wrong — Prisma itself lets you drop into raw queries when you need something the query builder can't express. The default, though, buys you a lot of safety for very little ceremony.

## How it works internally

### Defining a model

\`\`\`prisma
// schema.prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
}
\`\`\`

This one file describes your tables. Running \`prisma migrate dev\` compares it against the database's current state and generates a versioned SQL migration file for the difference — you get a reviewable, ordered history of every schema change, the same way Git gives you a history of code changes.

### Generating the typed client

Running \`prisma generate\` reads \`schema.prisma\` and generates a TypeScript client tailored to your exact schema: \`db.post.findMany()\`, \`db.post.create({ data: {...} })\`, and so on, all fully typed — autocomplete for column names, compile errors for typos, and inferred return types that update automatically when the schema changes.

### Where you're allowed to call it

\`\`\`tsx
// Server Component — allowed
async function PostList() {
  const posts = await db.post.findMany({ where: { published: true } });
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}

// Server Action — allowed
"use server";
async function createPost(formData: FormData) {
  await db.post.create({ data: { title: formData.get("title") as string, authorId: "u1" } });
}
\`\`\`

Prisma Client (and any database credential it needs) must **never** be imported into a Client Component. A Client Component's code ships to the browser — if it imported the database client, your connection string and query logic would ship with it. Database access belongs exclusively to Server Components, Server Actions, and Route Handlers — code that only ever runs on the server.

::diagram{prisma-connection-flow}

### Connection pooling — why you can't just "open a connection per request"

A traditional long-running server process opens one database connection and reuses it for the app's whole lifetime. Serverless and edge environments don't work that way: your Server Component or Route Handler might run in a fresh, short-lived function instance for every request (or a small number of concurrent ones), and Postgres has a hard limit on how many simultaneous connections it will accept — often in the low hundreds. If every request opened its own fresh connection, a moderate amount of traffic would exhaust that limit and start rejecting connections outright, taking the whole app down. A **connection pool** sits between your app and Postgres: it keeps a bounded set of real connections open and hands them out to requests as needed, queuing or reusing rather than opening a new one every time. In serverless/edge deployments this is usually an external pooler (e.g. PgBouncer, or a managed pooling service) rather than something your app process manages itself, precisely because the app process itself is too short-lived and too numerous to hold that responsibility.

## The sandbox in this lesson

There is no real Prisma or Postgres in this environment — this is stated plainly, the same way earlier modules named the router simulator as a simulation rather than hiding it. \`db.ts\` (read-only) exposes a fake \`db\` object shaped like a real Prisma Client (\`db.post.findMany()\`, \`db.post.create(...)\`) backed by a plain in-memory array. Calling it teaches the *query shape* — what you'd actually type in real code — without a real network round trip or real persistence behind it.

## Common mistakes

- **Importing the database client into a Client Component.** Even if it "seems to work" in a quick test, it means shipping database access code (and potentially credentials) to every visitor's browser.
- **Assuming a serverless function can hold one open connection like a traditional server.** Without pooling, concurrent short-lived function instances can exhaust Postgres's connection limit under real traffic.
- **Hand-writing SQL for everything "to avoid the abstraction."** Prisma still lets you drop to raw SQL per-query when needed — you don't have to choose one approach for the entire app.
- **Skipping migrations and editing the database schema by hand.** That breaks the reviewable, ordered history migrations are meant to provide, and diverges the database from what schema.prisma claims it looks like.

## Best practices

- Keep \`db\` (however it's set up in your app) reachable only from Server Components, Server Actions, and Route Handlers.
- Let \`prisma migrate dev\` generate migrations from schema changes rather than editing the database directly.
- Use connection pooling in any serverless/edge deployment — check your hosting provider's Prisma + serverless guidance before assuming a naive connection setup will scale.
- Reach for raw SQL only for the specific queries that need it, not as a wholesale alternative to the typed client.

## Performance considerations

A pooled connection avoids the latency and connection-limit risk of opening a fresh TCP + TLS + auth handshake to Postgres on every request. Combined with Module 4's caching layers, a well-designed app pushes most reads through the cache and reserves a real pooled database round trip for genuinely fresh data.
`;

const dbCode = `// db.ts — READ-ONLY. Simulates a Prisma-shaped client with an in-memory
// array standing in for a Postgres table. Real Prisma Client methods are
// async and return real promises resolving against a real database; this
// mock is async too (with an artificial delay) so the call shape matches,
// but nothing here persists beyond this browser tab or touches a network.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Post = { id: string; title: string; published: boolean };

let POSTS: Post[] = [
  { id: "p1", title: "Why Prisma models are a source of truth", published: true },
  { id: "p2", title: "Draft: connection pooling notes", published: false },
];
let nextId = 3;

export const db = {
  post: {
    async findMany(args?: { where?: Partial<Post> }): Promise<Post[]> {
      await sleep(200);
      if (!args?.where) return [...POSTS];
      return POSTS.filter((p) =>
        Object.entries(args.where!).every(([key, value]) => (p as any)[key] === value)
      );
    },
    async create(args: { data: { title: string; published?: boolean } }): Promise<Post> {
      await sleep(200);
      const post: Post = {
        id: "p" + nextId++,
        title: args.data.title,
        published: args.data.published ?? false,
      };
      POSTS.push(post);
      return post;
    },
  },
};
`;

const postListStarter = `// PostList.tsx — the file you edit for every exercise.
// Stands in for an async Server Component querying db.post directly.
import { useEffect, useState } from "react";
import { db } from "./db";

type Post = { id: string; title: string; published: boolean };

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    // TODO Exercise 1: call db.post.findMany({ where: { published: true } })
    // and set the result into state.
  }, []);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    // TODO Exercise 2: call db.post.create with { title: draftTitle, published: false }.

    // TODO Exercise 3: after creating, refetch only published posts and
    // update state — the new draft should NOT appear in this published list.
  }

  return (
    <div>
      <ul className="post-list">
        {posts.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
      <form onSubmit={handleCreateDraft}>
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="New draft title"
        />
        <button type="submit">Save draft</button>
      </form>
    </div>
  );
}
`;

const postListSolution = `import { useEffect, useState } from "react";
import { db } from "./db";

type Post = { id: string; title: string; published: boolean };

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    db.post.findMany({ where: { published: true } }).then(setPosts);
  }, []);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    await db.post.create({ title: draftTitle, published: false } as any);
    const published = await db.post.findMany({ where: { published: true } });
    setPosts(published);
    setDraftTitle("");
  }

  return (
    <div>
      <ul className="post-list">
        {posts.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
      <form onSubmit={handleCreateDraft}>
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="New draft title"
        />
        <button type="submit">Save draft</button>
      </form>
    </div>
  );
}
`;

const appCode = `import PostList from "./PostList";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Posts (simulated Prisma client)</h1>
      <PostList />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6.4 sandbox
==================

db.ts simulates a Prisma-shaped client (db.post.findMany / db.post.create)
backed by an in-memory array. There is no real Prisma or Postgres here —
the goal is the query shape, not real persistence.

1. Load published posts with db.post.findMany({ where: { published: true } }).
2. Create a new draft post with db.post.create.
3. After creating a draft, re-query only published posts — the draft
   shouldn't appear in this list.
`,
  },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/PostList.tsx", code: postListStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/PostList.tsx", code: postListSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m6-l4",
  title: "Prisma & PostgreSQL integration",
  description:
    "What an ORM buys you over raw SQL, the schema-to-typed-client pipeline, why database access is server-only, and why connection pooling matters in serverless/edge environments.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Load published posts",
      difficulty: "easy",
      instructions: `In \`PostList.tsx\`, call \`db.post.findMany({ where: { published: true } })\` inside the \`useEffect\` and set the result with \`setPosts\`. Confirm the one published seed post renders.`,
      validation: [
        { type: "code-includes", file: "/PostList.tsx", pattern: "db.post.findMany", message: "PostList queries db.post.findMany" },
        { type: "code-includes", file: "/PostList.tsx", pattern: "published: true", message: "The query filters for published posts" },
      ],
      hint: `useEffect(() => {\n  db.post.findMany({ where: { published: true } }).then(setPosts);\n}, []);`,
    },
    {
      id: "ex2",
      title: "Create a draft post",
      difficulty: "medium",
      instructions: `In \`handleCreateDraft\`, call \`db.post.create\` with \`{ title: draftTitle, published: false }\`. Submit the form and confirm no error is thrown (the draft won't appear in the published list yet — that's expected until Exercise 3).`,
      validation: [
        { type: "code-includes", file: "/PostList.tsx", pattern: "db.post.create", message: "handleCreateDraft calls db.post.create" },
        { type: "code-includes", file: "/PostList.tsx", pattern: "published: false", message: "The new post is created as a draft" },
      ],
    },
    {
      id: "ex3",
      title: "Re-query after the mutation",
      difficulty: "hard",
      instructions: `After creating the draft, call \`db.post.findMany({ where: { published: true } })\` again and update state with the result — mirroring how a real app re-reads data after a write. Confirm the published list still shows exactly the original published posts, not the new draft.`,
      validation: [
        { type: "code-regex", file: "/PostList.tsx", regex: "db.post.create[\\s\\S]*db.post.findMany", message: "The list is re-queried after creating the draft" },
      ],
      hint: `await db.post.create(...);\nconst published = await db.post.findMany({ where: { published: true } });\nsetPosts(published);`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does an ORM like Prisma give you over hand-written SQL and a driver library?",
      options: [
        "Faster queries in every case",
        "A single schema as the source of truth, generated typed queries, and a reviewable migration history",
        "The ability to skip writing SQL entirely, forever",
        "Automatic database backups",
      ],
      answerIndex: 1,
      explanation: "Prisma still lets you drop to raw SQL when needed — the default value is type safety and a managed migration history, not the elimination of SQL.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Prisma Client can be safely imported directly into a Client Component as long as the query is simple.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "A Client Component's code ships to the browser — database access (and any credentials it needs) belongs only in Server Components, Server Actions, and Route Handlers.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why can't a serverless function simply open one database connection per request the way a traditional long-running server does?",
      options: [
        "Serverless functions can't make network calls",
        "Postgres has a hard limit on simultaneous connections, and many short-lived function instances opening their own connections can exhaust it quickly",
        "Connections are free but slow",
        "Prisma doesn't support serverless environments at all",
      ],
      answerIndex: 1,
      explanation: "A connection pool bounds and reuses real connections instead of letting every request open a fresh one, which is what keeps traffic from exceeding Postgres's connection limit.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "What happens if a schema.prisma model gains a new required field, but the database is edited by hand instead of via a migration?",
      code: `model Post {\n  id String @id\n  title String\n  authorId String // added by hand-editing the DB, no migration run\n}`,
      options: [
        "Nothing — schema.prisma and the database always stay in sync automatically",
        "schema.prisma no longer accurately reflects a reviewable, ordered history of the database's actual shape, since the change bypassed the migration system",
        "Prisma regenerates the client with no other consequence",
        "The database rejects the manual edit",
      ],
      answerIndex: 1,
      explanation: "Migrations exist specifically to keep the database's real shape and schema.prisma's claimed shape in sync with an ordered, reviewable history — a manual edit breaks that guarantee.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "In this sandbox, why does db.ts simulate db.post.findMany/create as async functions with an artificial delay instead of returning data synchronously?",
      options: [
        "Because synchronous functions aren't valid in TypeScript",
        "Because real Prisma Client methods are always async (they involve a real network round trip to the database), so the sandbox mirrors that call shape even without a real database behind it",
        "Because React requires all functions to be async",
        "Because it makes the sandbox code shorter",
      ],
      answerIndex: 1,
      explanation: "Matching the async call shape teaches the pattern you'll actually use — await db.post.findMany(...) — even though nothing here is a real network call.",
    },
  ],
  keyTakeaways: [
    "An ORM's main value is a single schema as source of truth, a generated typed client, and a reviewable migration history — not the elimination of SQL.",
    "Database access is server-only: Server Components, Server Actions, and Route Handlers — never a Client Component.",
    "Serverless/edge environments need connection pooling because many short-lived function instances can't each hold their own connection without exhausting Postgres's connection limit.",
    "This lesson's db object is an explicitly simulated stand-in for Prisma Client — the query shape is real, the persistence and network round trip are not.",
  ],
  cheatSheet: `
| Concept | Shape |
| --- | --- |
| Define a model | \`schema.prisma\` — \`model Post { ... }\` |
| Generate the client | \`prisma generate\` |
| Apply schema changes | \`prisma migrate dev\` |
| Read | \`await db.post.findMany({ where: {...} })\` |
| Write | \`await db.post.create({ data: {...} })\` |
| Allowed callers | Server Components, Server Actions, Route Handlers |
| Never call from | Client Components |
| Serverless/edge concern | Connection pooling (e.g. PgBouncer / managed pooler) |
`,
  interviewQuestions: [
    "What does defining a model in schema.prisma actually generate, and via which two commands?",
    "Why must Prisma Client only ever be called from server-side code, never a Client Component?",
    "What problem does connection pooling solve in serverless or edge deployments?",
    "What's the tradeoff between using an ORM's query builder and dropping to raw SQL?",
    "Why do migrations matter even though you could edit the database schema by hand?",
    "In this course's sandbox, what exactly is simulated about the db object, and what part of it is faithful to real Prisma usage?",
  ],
};

export default lesson;
