import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every mutation so far has gone through a Server Action — a function called directly from your own components. But not every consumer of your backend logic *is* one of your own components. A payment provider needs a webhook URL to POST to. A mobile app needs a JSON endpoint. A public API needs a stable contract that isn't tied to React at all. **Route Handlers** are how Next.js serves plain HTTP: a file that exports HTTP-method functions instead of a page component.

## Why this exists — the problem

A \`page.tsx\` only knows how to do one thing: render HTML for a browser navigation. It has no way to say "respond to a POST from Stripe" or "return raw JSON to a client that isn't running React." Before Route Handlers existed (in the Pages Router era, \`pages/api/*.ts\`), and still today, an app needs *some* file convention that maps a URL to a function returning an arbitrary HTTP response — not a component tree.

Route Handlers fill that gap. Same folder-based routing you already know from Module 1, but the file is named \`route.ts\` instead of \`page.tsx\`, and instead of a default-exported component, it exports functions named after HTTP methods.

## How it works internally

### File convention and URL mapping

\`\`\`
app/
  api/
    tasks/
      route.ts     → matches requests to /api/tasks
\`\`\`

This is the *same* folder-to-URL mapping from Module 1 — \`app/api/tasks/route.ts\` matches \`/api/tasks\` exactly the way \`app/about/page.tsx\` matches \`/about\`. The only difference is the file name and what it's allowed to export. A folder can't have both a \`page.tsx\` and a \`route.ts\` at the same segment — a URL can't simultaneously be a page and an API endpoint.

::diagram{route-handler-flow}

### Exporting HTTP methods

Instead of one default export, a Route Handler exports one async function per HTTP method it supports:

\`\`\`ts
// app/api/tasks/route.ts
export async function GET(request: Request) {
  const tasks = await db.tasks.findMany();
  return Response.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = await db.tasks.create({ title: body.title });
  return Response.json(task, { status: 201 });
}
\`\`\`

Any method you don't export (\`PUT\`, \`DELETE\`, etc.) automatically responds \`405 Method Not Allowed\` — you never write that branch yourself.

### Request and Response are the real Web Fetch API

This is worth being precise about: \`Request\` and \`Response\` in a Route Handler are **not** Next.js inventions. They're the same standard Fetch API classes browsers have used for \`fetch()\` for years, now also available on the server. \`request.json()\`, \`request.headers.get(...)\`, \`new Response(body, { status, headers })\`, and the shortcut \`Response.json(data, init)\` all work exactly as the spec defines them. Next.js layers a few conveniences on top — \`NextRequest\` (extends \`Request\` with things like easier cookie/query access) and \`NextResponse\` (extends \`Response\` with helpers like \`NextResponse.redirect()\`) — but plain \`Request\`/\`Response\` are almost always enough, and are what this lesson uses.

### Dynamic segments and reading the URL

Route Handlers support the same \`[param]\` and \`[...slug]\` segments as pages:

\`\`\`ts
// app/api/tasks/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const task = await db.tasks.findById(params.id);
  if (!task) return new Response("Not Found", { status: 404 });
  return Response.json(task);
}
\`\`\`

Query parameters come from the URL itself: \`const { searchParams } = new URL(request.url);\`.

### Route Handler vs Server Action — which one do you reach for?

Both let you write server-side logic that a Next.js app can trigger. They are not interchangeable:

- **Reach for a Route Handler** when the caller isn't (or might not be) your own React app: a webhook a third party POSTs to, a public API consumed by a mobile client or another service, a response that needs to stream, or an endpoint that must return a specific status code / content type / set of headers a browser form action can't control as precisely.
- **Reach for a Server Action** when a same-app form or button is mutating data. It's simpler — no URL to design, no manual \`fetch\`, no manual JSON parsing, and TypeScript enforces the function signature end to end (Module 5).

A useful rule of thumb: if you find yourself hand-writing a \`fetch("/api/...")\` call from inside your *own* client component just to call your *own* backend logic, a Server Action would remove that boilerplate. If the caller lives outside your Next.js app, or needs to receive something that isn't a React-driven response, that's a Route Handler.

## The sandbox in this lesson

A real Route Handler runs in an actual Next.js server process, reachable over real HTTP. There is no server process inside this browser tab. To make the method/request/response shape learnable anyway, \`server.ts\` (read-only) simulates the dispatch step only: it looks up the route module for a given path and calls the exported function matching the HTTP method — the same job the Next.js server does when a real request arrives, just without any actual network transport. \`Request\` and \`Response\` themselves are **not** simulated — they're the real browser-native Fetch API classes, used exactly as they'd be used in a deployed Route Handler.

## Common mistakes

- **Putting page and API logic in the same route segment.** A folder resolves to either a \`page.tsx\` or a \`route.ts\` — pick one per segment.
- **Forgetting a method returns 405 automatically.** You don't need to write an "unsupported method" branch; just don't export a function for methods you don't support.
- **Reaching for a Route Handler for a same-app form submission.** That's almost always simpler and safer as a Server Action (Module 5) — a Route Handler adds a URL and a manual \`fetch\` for no benefit when the caller is your own UI.
- **Forgetting Route Handlers need the same validation/authorization discipline as any public endpoint** — anyone who can reach the URL can call it, exactly like a Server Action (Module 5).

## Best practices

- Name the file \`route.ts\` and export only the HTTP methods you actually support.
- Use \`Response.json(data, { status })\` for JSON responses — it sets the content-type header for you.
- Validate the request body and authorize the caller inside the handler, the same discipline as a Server Action.
- Prefer a Server Action for same-app mutations; reserve Route Handlers for webhooks, public APIs, and non-React clients.

## Performance considerations

Route Handlers can stream a response (returning a \`ReadableStream\` body) instead of buffering the whole thing in memory — useful for large exports or proxying another service's streamed response. They also run on either the Node.js or Edge runtime depending on configuration (Edge trades some Node APIs for faster cold starts — see the next lesson on middleware, which always runs on the Edge runtime).
`;

const serverCode = `// server.ts — READ-ONLY. Simulates the dispatch step a real Next.js server
// performs: match a URL to a route module, call the exported function for
// the request's HTTP method. Request and Response below are the browser's
// real Fetch API classes — nothing about them is mocked.
import * as tasksRoute from "./api/tasks/route";

type Handler = (request: Request) => Promise<Response> | Response;
type RouteModule = Record<string, Handler>;

const routeTable: Record<string, RouteModule> = {
  "/api/tasks": tasksRoute as unknown as RouteModule,
};

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const handlers = routeTable[path];
  if (!handlers) return new Response("Not Found", { status: 404 });

  const method = (init?.method ?? "GET").toUpperCase();
  const handler = handlers[method];
  if (!handler) {
    return new Response(\`Method \${method} Not Allowed\`, { status: 405 });
  }

  const request = new Request("http://sandbox.local" + path, init);
  return handler(request);
}
`;

const routeStarter = `// app/api/tasks/route.ts
// A real Next.js Route Handler lives at exactly this path and is reached by
// a real HTTP request to /api/tasks. Request and Response here are the real
// Fetch API — only the network transport is simulated (see server.ts).

let TASKS: { id: string; title: string }[] = [
  { id: "t1", title: "Write lesson theory" },
  { id: "t2", title: "Build sandbox files" },
];
let nextId = 3;

export async function GET(request: Request) {
  // TODO Exercise 1: return all tasks as JSON.
  // Response.json(TASKS)
}

export async function POST(request: Request) {
  // TODO Exercise 2: read the JSON body with request.json(), require a
  // non-empty "title" string, push a new task, and return it with status 201.

  // TODO Exercise 3: if the title is missing or blank, return a 400 response
  // with a JSON error body instead of creating a task.
}
`;

const routeSolution = `// app/api/tasks/route.ts
let TASKS: { id: string; title: string }[] = [
  { id: "t1", title: "Write lesson theory" },
  { id: "t2", title: "Build sandbox files" },
];
let nextId = 3;

export async function GET(request: Request) {
  return Response.json(TASKS);
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const task = { id: "t" + nextId++, title };
  TASKS.push(task);
  return Response.json(task, { status: 201 });
}
`;

const appCode = `import { useState } from "react";
import { apiFetch } from "./server";

type Task = { id: string; title: string };

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    const res = await apiFetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setTasks((prev) => [...prev, data]);
    setTitle("");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Tasks API (simulated)</h1>
      <button onClick={loadTasks}>Load tasks — GET /api/tasks</button>
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
        />
        <button type="submit">Add — POST /api/tasks</button>
      </form>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6.1 sandbox
==================

server.ts simulates the dispatch step of a real Next.js server: it matches a
path to a route module and calls the exported function for the request's
HTTP method. Request and Response are the real browser Fetch API — nothing
about them is mocked.

1. Implement GET in api/tasks/route.ts to return all tasks as JSON.
2. Implement POST to read the request body and create a new task.
3. Reject a blank title with a 400 response instead of creating a task.
`,
  },
  { path: "/server.ts", readOnly: true, code: serverCode },
  { path: "/api/tasks/route.ts", code: routeStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/server.ts", readOnly: true, code: serverCode },
  { path: "/api/tasks/route.ts", code: routeSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m6-l1",
  title: "Route Handlers: serving plain HTTP",
  description:
    "The route.ts file convention, exporting GET/POST/PUT/DELETE, why Request and Response are the real Fetch API, and when to reach for a Route Handler instead of a Server Action.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Implement GET",
      difficulty: "easy",
      instructions: `In \`api/tasks/route.ts\`, implement \`GET\` to return \`Response.json(TASKS)\`. Click **Load tasks** in the preview and confirm the two seeded tasks appear in the list.`,
      validation: [
        { type: "code-includes", file: "/api/tasks/route.ts", pattern: "Response.json(TASKS)", message: "GET returns Response.json(TASKS)" },
        { type: "dom-count", selector: "ul.task-list li", min: 2, message: "The task list renders the seeded tasks" },
      ],
      hint: `export async function GET(request: Request) {\n  return Response.json(TASKS);\n}`,
    },
    {
      id: "ex2",
      title: "Implement POST",
      difficulty: "medium",
      instructions: `Implement \`POST\` to read the request body with \`await request.json()\`, push a new task with a generated id, and return it via \`Response.json(task, { status: 201 })\`. Submit the form and confirm the new task appears.`,
      validation: [
        { type: "code-includes", file: "/api/tasks/route.ts", pattern: "request.json()", message: "POST reads the request body with request.json()" },
        { type: "code-regex", file: "/api/tasks/route.ts", regex: "status:\\s*201", message: "POST returns a 201 status on success" },
      ],
    },
    {
      id: "ex3",
      title: "Reject a blank title",
      difficulty: "hard",
      instructions: `Before creating a task, check that \`title\` is a non-empty string. If it's missing or blank, return \`Response.json({ error: "..." }, { status: 400 })\` instead. Submit the form with an empty title and confirm the error message renders.`,
      validation: [
        { type: "code-regex", file: "/api/tasks/route.ts", regex: "status:\\s*400", message: "POST returns a 400 status for an invalid title" },
        { type: "dom-exists", selector: "p.error", message: "The client renders the error message" },
      ],
      hint: `if (!title) {\n  return Response.json({ error: "Title is required" }, { status: 400 });\n}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does app/api/tasks/route.ts export instead of a default component?",
      options: [
        "A single default handler function",
        "Named async functions per HTTP method, e.g. GET and POST",
        "A class implementing an HTTP server",
        "A config object listing allowed methods",
      ],
      answerIndex: 1,
      explanation: "Each exported function name corresponds to the HTTP method it handles; Next.js calls the one matching the incoming request.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Request and Response in a Route Handler are Next.js-specific classes, not standard Web APIs.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "They're the same Fetch API classes used in browsers. NextRequest/NextResponse add optional conveniences but aren't required for most handlers.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "A folder contains both app/settings/page.tsx and app/settings/route.ts. What happens?",
      options: [
        "Next.js merges them into one response",
        "This isn't a valid setup — a route segment can't be both a page and a Route Handler",
        "The page always wins",
        "The route.ts always wins",
      ],
      answerIndex: 1,
      explanation: "A URL resolves to either a page or a Route Handler at a given segment, not both.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "app/api/tasks/route.ts exports only GET. What happens when a client sends a DELETE request to /api/tasks?",
      code: `export async function GET(request: Request) {\n  return Response.json(TASKS);\n}`,
      options: [
        "Next.js throws a build error",
        "The request is automatically answered with 405 Method Not Allowed",
        "GET runs anyway, ignoring the method",
        "The server crashes",
      ],
      answerIndex: 1,
      explanation: "Methods you don't export are automatically rejected with a 405 — you never write that branch yourself.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A teammate builds a same-app 'delete post' button by writing a Route Handler and calling it with fetch() from a Client Component. What's the simpler alternative from Module 5?",
      options: [
        "There isn't one — Route Handlers are required for all mutations",
        "A Server Action — no URL to design, no manual fetch/JSON handling, and the function signature is the whole contract",
        "A getStaticProps function",
        "A middleware.ts redirect",
      ],
      answerIndex: 1,
      explanation: "Route Handlers earn their keep for webhooks, public APIs, and non-React clients. A same-app mutation is almost always simpler as a Server Action.",
    },
  ],
  keyTakeaways: [
    "route.ts uses the same folder-to-URL mapping as page.tsx, but exports HTTP-method functions instead of a default component.",
    "Request and Response are the real Fetch API — no Next.js-specific shape to learn for the basics.",
    "Unsupported methods are rejected with 405 automatically; you only write the methods you support.",
    "Reach for a Route Handler when the caller isn't your own React app (webhooks, public APIs, streaming); reach for a Server Action for same-app mutations.",
  ],
  cheatSheet: `
| Concept | API |
| --- | --- |
| File convention | \`app/.../route.ts\` |
| Handle GET | \`export async function GET(request: Request) {}\` |
| Handle POST | \`export async function POST(request: Request) {}\` |
| JSON response | \`Response.json(data, { status })\` |
| Read JSON body | \`await request.json()\` |
| Dynamic segment | \`export async function GET(req, { params }) {}\` |
| Query params | \`new URL(request.url).searchParams\` |
| Unsupported method | Automatic 405 — nothing to write |
| Same-app mutation | Prefer a Server Action (Module 5) instead |
`,
  interviewQuestions: [
    "How does app/api/tasks/route.ts map to a URL, and how does that compare to page.tsx routing?",
    "What HTTP methods can a Route Handler export, and what happens for a method it doesn't export?",
    "Are Request and Response in a Route Handler Next.js inventions? What do NextRequest/NextResponse add on top?",
    "When would you choose a Route Handler over a Server Action, and vice versa?",
    "How do dynamic segments and query parameters work inside a Route Handler?",
    "Why can't a route segment have both a page.tsx and a route.ts?",
  ],
};

export default lesson;
