import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every mutation so far in this course has been hypothetical — data has flowed one direction, from server to screen. Real applications need the reverse: a user submits a form, and something on the server needs to change. The traditional answer was a two-step dance: build an API route, then \`fetch()\` it from the client. **Server Actions collapse that into one step.** A function marked \`"use server"\` can be called directly from a client component — including passed straight into a \`<form action={...}>\` — with no API route in between.

## Why this exists — the problem

Building a mutation the old way meant writing the same round trip twice: once as a route handler (\`POST /api/messages\`) that reads a body, validates it, writes to a database, and returns JSON; and again as client code that constructs a \`fetch\` call, serializes the payload, and handles the response. The two halves live in different files, often different mental models, and have to be kept in sync by hand — rename a field in one and the other silently breaks until runtime.

A Server Action is a function. You write it once, mark it \`"use server"\`, and call it — from an event handler, or directly as a form's \`action\` — the same way you'd call any other function. Next.js generates the network request for you.

## How it works internally

### The directive: what \`"use server"\` actually does

\`\`\`tsx
// actions.ts
"use server";

export async function createMessage(formData: FormData) {
  const text = formData.get("text");
  await db.messages.create({ text });
}
\`\`\`

\`"use server"\` doesn't run anything special at the top of the file the way \`"use client"\` marks a component boundary. It's a build-time marker: Next.js finds every exported function in that file, keeps its implementation on the server, and replaces the client-side reference to it with a lightweight stub — an opaque reference (effectively an ID) that knows how to call back to the real function over the network. The function's *code* never ships to the browser; only a pointer to it does.

### What happens on the wire

When you write:

\`\`\`tsx
<form action={createMessage}>
  <input name="text" />
  <button type="submit">Send</button>
</form>
\`\`\`

React (as of the version Next.js ships) supports passing a function directly to a \`<form>\`'s \`action\` prop. Submitting the form does **not** navigate or trigger a normal browser POST to a URL you wrote — instead, React intercepts the submission, builds a \`FormData\` from the form automatically, and issues its own POST request under the hood to an internal endpoint Next.js generates for that action, carrying the serialized arguments and the action's opaque reference. The server receives that request, looks up the real function by its reference, runs it, and returns the result. From the outside this looks like "the client just called a server function" — but on the wire it is still, fundamentally, an HTTP POST.

::diagram{server-action-flow}

### Why this collapses the two-step pattern

There's no separate route file to keep in sync, no manual \`fetch\` call to construct, no manual JSON parsing on either side. The function signature *is* the contract — change a parameter and both "sides" (there's only one side now) update together, and TypeScript catches a mismatch at compile time instead of at runtime.

### After the mutation: revalidation

A Server Action that writes to a database doesn't automatically make already-rendered pages reflect the change — Module 4's caching layers still apply. The action calls \`revalidatePath\` or \`revalidateTag\` after the mutation completes, which invalidates the relevant cached data so the next render picks up the fresh value:

\`\`\`tsx
"use server";
import { revalidatePath } from "next/cache";

export async function createMessage(formData: FormData) {
  const text = formData.get("text") as string;
  await db.messages.create({ text });
  revalidatePath("/messages");
}
\`\`\`

### Security implications — a Server Action is a public endpoint

This is the part that's easy to miss: the moment a Server Action exists in a Client Component's bundle, its opaque reference is reachable by anyone who can send a POST to your app — not just from the form you wrote it for. There's no implicit protection from "well, only my form calls it." A Server Action must **validate its input and check authorization exactly like a route handler would**, because functionally, it is one:

\`\`\`tsx
"use server";

export async function deletePost(postId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized"); // never trust the caller
  if (typeof postId !== "string") throw new Error("Invalid input");
  await db.posts.delete(postId);
}
\`\`\`

Skipping this check because "the button is only shown to admins in the UI" is a common and serious mistake — hiding a button doesn't stop a request being crafted directly against the action's endpoint.

## The sandbox in this lesson

The real \`"use server"\` directive requires an actual Next.js server and can't execute inside this browser-only sandbox. \`actions.ts\` (read-only) simulates one instead: a plain async function with an artificial delay (\`sleep\`) that mutates an in-memory array standing in for a database, plus a \`console.log\` each time it "writes." Because there's no real \`<form action={fn}>\` support outside of a full React 19 + Next.js runtime, the sandbox form calls the simulated action from a normal \`onSubmit\` handler, building a \`FormData\` object from the form itself — in real Next.js, passing the function straight into \`action={...}\` does this same work for you automatically, with no \`onSubmit\` or \`preventDefault\` required.

## Common mistakes

- **Assuming a hidden UI element makes a Server Action safe.** Anyone can call the action's endpoint directly; validate and authorize inside the function, every time.
- **Forgetting to revalidate after a mutation** — the write succeeds but the UI silently keeps showing stale data because the relevant cache was never invalidated.
- **Treating a Server Action like a plain client-side function that has no network cost** — every call is still a real request/response round trip, with the latency that implies.

## Best practices

- Validate and authorize inside every Server Action, regardless of what UI conditions gate the button that calls it.
- Call \`revalidatePath\`/\`revalidateTag\` immediately after a successful mutation, scoped as narrowly as the data that actually changed.
- Keep Server Actions small and single-purpose — one action per distinct mutation, rather than one giant action branching on a "type" field.

## Performance considerations

Because a Server Action is a real network round trip, batching related work inside one action (rather than firing several actions back to back) reduces the number of request/response cycles a mutation needs — the same principle as \`Promise.all\` for reads, applied to writes.
`;

const actionsCode = `// actions.ts — READ-ONLY. Simulates a Server Action without a real server.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const MESSAGES: { id: string; text: string }[] = [
  { id: "m1", text: "Welcome to the thread!" },
];

let nextId = 2;

// In real Next.js this file would start with "use server" and this function
// would run on the server, reachable via a <form action={createMessage}>.
export async function createMessage(formData: FormData): Promise<typeof MESSAGES> {
  await sleep(500); // pretend this is a network + database round trip
  const text = formData.get("text");
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("Message text is required");
  }
  MESSAGES.push({ id: "m" + nextId++, text: text.trim() });
  console.log("[action] createMessage wrote:", text);
  return MESSAGES;
}
`;

const formStarter = `// Exercise 1 & 2: simulate calling a Server Action from a form submit.
// The real "use server" directive can't run in this sandbox — instead,
// build a FormData from the form yourself and call createMessage with it.
import { useState } from "react";
import { createMessage, MESSAGES } from "./actions";

export default function MessageForm() {
  const [messages, setMessages] = useState(MESSAGES);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // TODO: e.preventDefault()
    // TODO: const formData = new FormData(e.currentTarget)
    // TODO: call createMessage(formData), then setMessages with the result
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="text" placeholder="Write a message" />
      <button type="submit">Send</button>
      <ul className="message-list">
        {messages.map((m) => (
          <li key={m.id}>{m.text}</li>
        ))}
      </ul>
    </form>
  );
}
`;

const formSolution = `import { useState } from "react";
import { createMessage, MESSAGES } from "./actions";

export default function MessageForm() {
  const [messages, setMessages] = useState(MESSAGES);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setIsPending(true);
    try {
      const updated = await createMessage(formData);
      setMessages([...updated]);
      form.reset();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="text" placeholder="Write a message" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send"}
      </button>
      <ul className="message-list">
        {messages.map((m) => (
          <li key={m.id}>{m.text}</li>
        ))}
      </ul>
    </form>
  );
}
`;

const appCode = `import MessageForm from "./MessageForm";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Server Actions (simulated)</h1>
      <MessageForm />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5.1 sandbox
==================

actions.ts simulates a Server Action: an async function with an artificial
delay that mutates an in-memory MESSAGES array, standing in for a database.

1. Prevent the form's default submit and build a FormData from it.
2. Call createMessage(formData) and update local state with the result.
3. Show a pending state on the submit button while the action is running.
`,
  },
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/MessageForm.tsx", code: formStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/MessageForm.tsx", code: formSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m5-l1",
  title: "Server Actions from first principles",
  description:
    "What \"use server\" actually does, calling a server function directly from a form with no API route, what happens on the wire, and why a Server Action must validate and authorize like any public endpoint.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Prevent default and build a FormData",
      difficulty: "easy",
      instructions: `In \`MessageForm.tsx\`, call \`e.preventDefault()\` inside \`handleSubmit\` and construct \`const formData = new FormData(e.currentTarget)\`.`,
      validation: [
        { type: "code-includes", file: "/MessageForm.tsx", pattern: "preventDefault", message: "handleSubmit calls e.preventDefault()" },
        { type: "code-includes", file: "/MessageForm.tsx", pattern: "new FormData(", message: "handleSubmit builds a FormData from the form" },
      ],
      hint: `e.preventDefault(); const formData = new FormData(e.currentTarget);`,
    },
    {
      id: "ex2",
      title: "Call the simulated action and update state",
      difficulty: "medium",
      instructions: `Call \`await createMessage(formData)\` and pass its result into \`setMessages\`. Submit the form and confirm the new message appears in the \`<ul className="message-list">\` after the simulated delay.`,
      validation: [
        { type: "code-includes", file: "/MessageForm.tsx", pattern: "createMessage(formData)", message: "handleSubmit calls createMessage(formData)" },
        { type: "code-includes", file: "/MessageForm.tsx", pattern: "setMessages", message: "handleSubmit updates messages state with the result" },
        { type: "dom-exists", selector: "ul.message-list", message: "The message list renders" },
      ],
    },
    {
      id: "ex3",
      title: "Disable the button while pending",
      difficulty: "hard",
      instructions: `Track a pending state around the \`await createMessage(...)\` call and pass it to the submit button's \`disabled\` prop, showing "Sending…" while the simulated action is in flight.`,
      validation: [
        { type: "code-includes", file: "/MessageForm.tsx", pattern: "isPending", message: "MessageForm tracks an isPending state" },
        { type: "code-regex", file: "/MessageForm.tsx", regex: "disabled=\\{isPending\\}", message: "The submit button is disabled while isPending is true" },
      ],
      hint: `const [isPending, setIsPending] = useState(false); setIsPending(true) before the await, setIsPending(false) in a finally block.`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does the \"use server\" directive do to an exported function?",
      options: [
        "It runs the function at build time only",
        "It keeps the function's implementation on the server and replaces the client's reference to it with an opaque, callable pointer",
        "It converts the function into a React hook",
        "It disables the function in development mode",
      ],
      answerIndex: 1,
      explanation: "The function's code never ships to the browser — only a reference Next.js can use to call back to the real server-side implementation.",
    },
    {
      id: "q2",
      type: "tf",
      question: "Calling a Server Action from a client form still results in an HTTP request under the hood.",
      options: ["True", "False"],
      answerIndex: 0,
      explanation: "Submitting the form triggers a POST to an internal endpoint Next.js generates for that action — it looks like a direct function call, but it's still a real network round trip.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why must a Server Action validate and authorize its input, even if the only UI that calls it is hidden behind an admin check?",
      options: [
        "Because TypeScript doesn't check server code",
        "Because the action is reachable as its own endpoint the moment it exists — hiding the button in the UI doesn't stop a direct request",
        "Because Server Actions run on the client",
        "It doesn't need to — Next.js validates automatically",
      ],
      answerIndex: 1,
      explanation: "A Server Action's opaque reference is callable by anyone who can send a request to it, regardless of what conditionally renders the button.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "A Server Action successfully writes to the database but doesn't call revalidatePath or revalidateTag. What happens to already-rendered pages?",
      code: `"use server";\nexport async function createMessage(formData: FormData) {\n  await db.messages.create({ text: formData.get("text") });\n  // no revalidation call\n}`,
      options: [
        "Next.js revalidates automatically after every action",
        "Cached data isn't automatically invalidated, so users may keep seeing the old value until it revalidates for another reason",
        "The mutation itself fails without revalidation",
        "The page immediately shows a build error",
      ],
      answerIndex: 1,
      explanation: "Server Actions don't implicitly invalidate the cache — Module 4's caching layers still apply, and skipping revalidation is a common cause of a mutation that 'didn't seem to work.'",
    },
    {
      id: "q5",
      type: "debugging",
      question: "In this sandbox, why does MessageForm build a FormData manually in onSubmit instead of passing createMessage straight into <form action={...}>?",
      options: [
        "Because FormData doesn't exist in browsers",
        "Because the sandbox runs a browser-only React environment without a real Next.js server, so it can't execute \"use server\" or Next's form-action wiring — the manual onSubmit is a simulation of that same flow",
        "Because createMessage is a hook, not a plain function",
        "Because forms can't have onSubmit and action at the same time",
      ],
      answerIndex: 1,
      explanation: "Passing a function directly into a form's action prop and having \"use server\" work requires a real Next.js server runtime; the sandbox approximates the same call shape with plain client code.",
    },
  ],
  keyTakeaways: [
    "\"use server\" keeps a function's code on the server and replaces the client's reference with an opaque, callable pointer — no API route file required.",
    "Calling a Server Action from a form is still a real network request under the hood; Next.js generates the request for you.",
    "A Server Action is a public endpoint from the moment it exists — validate and authorize inside it regardless of what UI conditions gate the caller.",
    "A successful mutation doesn't refresh cached data on its own — call revalidatePath/revalidateTag to make the UI reflect the change.",
  ],
  cheatSheet: `
| Old two-step pattern | Server Actions |
| --- | --- |
| Write a route handler (\`POST /api/x\`) | Write one \`"use server"\` function |
| Write client \`fetch\` + serialize payload | Pass the function directly as \`action\` or call it from an event handler |
| Keep both sides' shapes in sync by hand | One function signature is the whole contract |
| Manually invalidate cache client-side | Call \`revalidatePath\`/\`revalidateTag\` inside the action |
| Auth check lives in the route handler | Auth check lives inside the Server Action itself — non-negotiable |
`,
  interviewQuestions: [
    "What does the \"use server\" directive actually do to a function at build time?",
    "Is calling a Server Action from the client still a network request? What does that request look like?",
    "Why is a Server Action considered a public endpoint, and what does that imply for validation and authorization?",
    "What's the role of revalidatePath/revalidateTag after a Server Action's mutation completes?",
    "How does a Server Action replace the traditional 'build an endpoint, then fetch it' pattern?",
    "What's a common mistake teams make when they assume a hidden UI button makes an action safe?",
  ],
};

export default lesson;
