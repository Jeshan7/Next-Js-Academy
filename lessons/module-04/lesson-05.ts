import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Lesson 4.1 showed the waterfall problem: two sequential \`await\`s in the same component block each other, even when neither depends on the other's result. This lesson is about fixing that deliberately — with \`Promise.all\` for independent data — and recognizing the one case where sequential fetching is actually correct: when a later fetch genuinely needs an earlier fetch's result.

## Why this exists — the problem

\`await\` reads naturally top to bottom, which makes it easy to write code that's accidentally slower than it needs to be:

\`\`\`tsx
const user = await getUser();      // 300ms
const orders = await getOrders();  // 400ms — doesn't start until getUser() finishes
// total: 700ms, even though orders never used anything from user
\`\`\`

Nothing about \`getOrders()\` depends on \`user\` here — it's just written after it. The fix isn't a special API; it's simply starting both at once and waiting for both to settle.

## How it works internally

### Promise.all for independent data

\`\`\`tsx
const [user, orders] = await Promise.all([getUser(), getOrders()]);
// both start immediately; total time ≈ max(300ms, 400ms) = 400ms
\`\`\`

\`Promise.all\` takes an array of promises that are all already "in flight" (calling \`getUser()\` starts the work immediately — \`await\`ing it later doesn't delay when it started) and resolves once every one of them has. The total wait becomes the *slowest* of the group, not the *sum* of all of them.

::diagram{parallel-vs-sequential}

### When sequential fetching is unavoidable

Sometimes a fetch genuinely needs a previous result — there's no way around the dependency:

\`\`\`tsx
const user = await getUser();
const permissions = await getPermissions(user.roleId); // needs user.roleId
\`\`\`

This *is* a real waterfall, but it's not a bug — \`permissions\` literally cannot be requested before \`user\` resolves, because its input comes from \`user\`. The distinction that matters: **only chain awaits that have a real data dependency; run everything else in parallel.**

### Spotting an accidental waterfall in real code

The tell is simple: does the second \`await\` use anything returned by the first? If not, and they're just sitting one after another because that's how the code was written, it's an accidental waterfall.

\`\`\`tsx
// accidental waterfall — profile doesn't need stats
const stats = await getStats();
const profile = await getProfile();

// fixed
const [stats, profile] = await Promise.all([getStats(), getProfile()]);
\`\`\`

This also applies across component boundaries: a parent awaiting data *before* rendering a child that itself awaits unrelated data creates the same problem, just spread across files instead of lines.

### Preloading patterns

When a dependency *does* exist but you know part of the data early, you can kick off a fetch before you strictly need its result, so it's already in flight by the time you await it:

\`\`\`tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productPromise = getProduct(id);       // fire immediately, don't await yet
  const reviewsPromise = getReviews(id);        // fire immediately too

  const product = await productPromise;         // both were already running in parallel
  const reviews = await reviewsPromise;
  return <ProductPage product={product} reviews={reviews} />;
}
\`\`\`

This "start now, await later" pattern gets you the same parallelism as \`Promise.all\`, useful when you need to do something with the first result before the second resolves.

## The sandbox in this lesson

\`api.ts\` (read-only) exposes two independent simulated fetches with artificial delay, plus a shared timer that logs elapsed time. You'll refactor a sequential pair of \`await\`s into \`Promise.all\` and observe, via the logged timer, the total time drop from the sum of both delays to roughly the larger of the two.

## Common mistakes

- **Chaining every await "just in case," out of habit** — the default should be parallel; sequential is the exception, justified only by a real data dependency.
- **Using \`Promise.all\` on calls that actually do depend on each other** — this either throws (a variable used before it's defined) or silently uses stale/wrong data.
- **Not noticing a waterfall that's spread across a parent and child component** — it looks fine reading either file in isolation, but the parent's await still delays the child's from starting.

## Best practices

- Default to \`Promise.all\` for any two-or-more fetches that don't need each other's results.
- When one fetch really does depend on another, keep them sequential — don't force artificial parallelism onto a real dependency.
- Use the "start now, await later" pattern when you need parallelism but also need to use one result before the other resolves.

## Performance considerations

The gain from fixing an accidental waterfall scales with how many independent calls you have: two 300ms calls in sequence cost 600ms; in parallel, they cost ~300ms. With three or four independent fetches — common on a dashboard page — the difference between sequential and parallel fetching can be the difference between a snappy page and a noticeably slow one.
`;

const apiCode = `// api.ts — READ-ONLY. Two independent simulated fetches, plus a timer.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let start = 0;

export function startTimer() {
  start = Date.now();
}

export function logElapsed(label: string) {
  console.log(\`[timer] \${label}: \${Date.now() - start}ms\`);
}

export async function getUser() {
  await sleep(400);
  return { id: "u1", name: "Priya Shah" };
}

export async function getOrders() {
  await sleep(500);
  return [{ id: "o1", total: 89 }, { id: "o2", total: 42 }];
}
`;

const dashboardStarter = `// Exercise 1 & 2: getUser() and getOrders() don't depend on each other,
// but they're written sequentially below, which means they run one after
// another. Refactor them to run in parallel with Promise.all.
import { getUser, getOrders, startTimer, logElapsed } from "./api";

export default async function Dashboard() {
  startTimer();

  const user = await getUser();
  const orders = await getOrders();

  logElapsed("Dashboard data ready");

  return (
    <div className="dashboard">
      <h2 className="dashboard-user">{user.name}</h2>
      <p className="dashboard-order-count">{orders.length} orders</p>
    </div>
  );
}
`;

const dashboardSolution = `import { getUser, getOrders, startTimer, logElapsed } from "./api";

export default async function Dashboard() {
  startTimer();

  const [user, orders] = await Promise.all([getUser(), getOrders()]);

  logElapsed("Dashboard data ready");

  return (
    <div className="dashboard">
      <h2 className="dashboard-user">{user.name}</h2>
      <p className="dashboard-order-count">{orders.length} orders</p>
    </div>
  );
}
`;

const permissionsStarter = `// Exercise 3: getPermissions(roleId) genuinely NEEDS the user's roleId —
// this dependency is real, so it must stay sequential. Fetch the user
// first, then use their role to fetch permissions.
type Role = "admin" | "member";

async function getUserWithRole(): Promise<{ name: string; roleId: Role }> {
  return { name: "Priya Shah", roleId: "admin" };
}

async function getPermissions(roleId: Role): Promise<string[]> {
  return roleId === "admin" ? ["read", "write", "delete"] : ["read"];
}

export default async function PermissionsPanel() {
  // TODO: const user = await getUserWithRole();
  // TODO: const permissions = await getPermissions(user.roleId);
  return <div className="permissions-panel" />;
}
`;

const permissionsSolution = `type Role = "admin" | "member";

async function getUserWithRole(): Promise<{ name: string; roleId: Role }> {
  return { name: "Priya Shah", roleId: "admin" };
}

async function getPermissions(roleId: Role): Promise<string[]> {
  return roleId === "admin" ? ["read", "write", "delete"] : ["read"];
}

export default async function PermissionsPanel() {
  const user = await getUserWithRole();
  const permissions = await getPermissions(user.roleId);
  return (
    <div className="permissions-panel">
      <p>{user.name}</p>
      <ul className="permissions-list">
        {permissions.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
`;

const appCode = `import Dashboard from "./Dashboard";
import PermissionsPanel from "./PermissionsPanel";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Parallel vs sequential data fetching</h1>
      <Dashboard />
      <PermissionsPanel />
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Check the console panel for the [timer] log — compare the elapsed
        time before and after refactoring Dashboard.tsx.
      </p>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 4.5 sandbox
==================

api.ts simulates two independent, slow fetches plus a timer that logs
elapsed time to the console.

1. Dashboard.tsx awaits getUser() then getOrders() sequentially, even
   though neither depends on the other. Refactor to Promise.all and
   watch the [timer] log in the console drop from ~900ms to ~500ms.
2. Confirm both dashboard-user and dashboard-order-count still render
   correctly after the refactor.
3. PermissionsPanel.tsx has a REAL dependency (permissions need the
   user's roleId) — fetch the user first, then permissions, and leave
   this one sequential on purpose.
`,
  },
  { path: "/api.ts", readOnly: true, code: apiCode },
  { path: "/Dashboard.tsx", code: dashboardStarter },
  { path: "/PermissionsPanel.tsx", code: permissionsStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/api.ts", readOnly: true, code: apiCode },
  { path: "/Dashboard.tsx", code: dashboardSolution },
  { path: "/PermissionsPanel.tsx", code: permissionsSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m4-l5",
  title: "Parallel & sequential data fetching",
  description:
    "Promise.all for independent data, when a real dependency forces sequential fetching, spotting accidental waterfalls, and preloading patterns.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Refactor into Promise.all",
      difficulty: "easy",
      instructions: `In \`Dashboard.tsx\`, replace the sequential \`await getUser()\` then \`await getOrders()\` with a single \`const [user, orders] = await Promise.all([getUser(), getOrders()]);\`.`,
      validation: [
        { type: "code-includes", file: "/Dashboard.tsx", pattern: "Promise.all", message: "Dashboard uses Promise.all" },
        { type: "code-regex", file: "/Dashboard.tsx", regex: "\\[\\s*user\\s*,\\s*orders\\s*\\]\\s*=\\s*await\\s*Promise\\.all", message: "user and orders are destructured from Promise.all" },
      ],
      hint: `const [user, orders] = await Promise.all([getUser(), getOrders()]);`,
    },
    {
      id: "ex2",
      title: "Verify the rendered output is unchanged",
      difficulty: "medium",
      instructions: `After refactoring, confirm \`Dashboard\` still renders \`<h2 className="dashboard-user">\` with the user's name and \`<p className="dashboard-order-count">\` with the order count — the refactor should change timing only, never the rendered result.`,
      validation: [
        { type: "dom-exists", selector: "h2.dashboard-user", message: "The user name still renders" },
        { type: "dom-exists", selector: "p.dashboard-order-count", message: "The order count still renders" },
      ],
    },
    {
      id: "ex3",
      title: "Keep a real dependency sequential",
      difficulty: "hard",
      instructions: `In \`PermissionsPanel.tsx\`, await \`getUserWithRole()\` first, then await \`getPermissions(user.roleId)\` — this dependency is real, so leave these two sequential rather than wrapping them in Promise.all. Render the permissions as a \`<ul className="permissions-list">\`.`,
      validation: [
        { type: "code-includes", file: "/PermissionsPanel.tsx", pattern: "await getUserWithRole()", message: "PermissionsPanel awaits getUserWithRole() first" },
        { type: "code-includes", file: "/PermissionsPanel.tsx", pattern: "getPermissions(user.roleId)", message: "getPermissions is called with the user's roleId" },
        { type: "dom-exists", selector: "ul.permissions-list", message: "The permissions list renders" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "code-prediction",
      question: "const user = await getUser(); const orders = await getOrders(); — if neither depends on the other, what's the total wait time (each takes 400ms)?",
      code: `const user = await getUser();   // 400ms\nconst orders = await getOrders(); // 400ms`,
      options: [
        "400ms — they run in parallel automatically",
        "800ms — sequential awaits run one after another regardless of whether they depend on each other",
        "0ms — JavaScript batches awaits",
        "It depends on the network",
      ],
      answerIndex: 1,
      explanation: "Nothing parallelizes sequential awaits automatically. Written one after another, they always run in sequence, whether or not there's a real dependency.",
    },
    {
      id: "q2",
      type: "mcq",
      question: "What does Promise.all([a, b]) do to the total wait time compared to sequential awaits?",
      options: [
        "Reduces it to roughly the slower of the two, since both start at the same time",
        "Reduces it to roughly the faster of the two",
        "Has no effect on timing, only on code style",
        "Doubles the wait time",
      ],
      answerIndex: 0,
      explanation: "Promise.all starts every promise immediately and waits for all of them; the total time is bounded by the slowest one, not the sum.",
    },
    {
      id: "q3",
      type: "tf",
      question: "getPermissions(user.roleId) can be wrapped in Promise.all alongside the getUser() call that produces user.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "getPermissions needs user.roleId, which doesn't exist until getUser() resolves — this is a real dependency, so it must stay sequential.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A dashboard page fetches four independent widgets' data with four sequential awaits, and feels slow. What's the fix?",
      options: [
        "Move each fetch into a separate page",
        "Wrap all four calls in a single Promise.all so they run concurrently",
        "Cache all four calls with next: { revalidate: 0 }",
        "Nothing can be done — awaits are always sequential",
      ],
      answerIndex: 1,
      explanation: "Four independent fetches written sequentially is a classic accidental waterfall; Promise.all fixes it directly.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "What's the 'start now, await later' preloading pattern useful for?",
      options: [
        "Making a truly dependent fetch run before its input exists",
        "Kicking off a fetch immediately (without awaiting yet) so it's already in flight by the time you need its result, while still doing other work in between",
        "Disabling caching for a fetch",
        "Converting a Client Component fetch into a Server Component fetch",
      ],
      answerIndex: 1,
      explanation: "Calling the async function without awaiting starts the work immediately; awaiting the resulting promise later still benefits from the time already spent in flight.",
    },
  ],
  keyTakeaways: [
    "Sequential awaits always run one after another, even when the calls don't depend on each other — nothing parallelizes them automatically.",
    "Promise.all runs independent fetches concurrently, dropping the total wait from the sum of all calls to roughly the slowest one.",
    "Only keep fetches sequential when a real data dependency exists — e.g., a second call needs a field from the first call's result.",
    "The 'start now, await later' pattern gets the same parallelism as Promise.all when you need to use one result before another resolves.",
  ],
  cheatSheet: `
| Pattern | When to use | Total time |
| --- | --- | --- |
| \`await a(); await b();\` | b truly depends on a's result | sum of both |
| \`Promise.all([a(), b()])\` | a and b are independent | max of both |
| \`const p = a(); ...; await p;\` | need parallelism but must use one result before another | max of both |
`,
  interviewQuestions: [
    "Why do two sequential awaits run one after another even when they don't depend on each other?",
    "How does Promise.all change the total wait time for independent fetches?",
    "Give an example of a fetch that genuinely must stay sequential, and explain why.",
    "How would you spot an accidental waterfall in a code review?",
    "What's the 'start now, await later' pattern, and when would you prefer it over Promise.all?",
    "How does an accidental waterfall across a parent and child component differ from one within a single function, and why is it harder to spot?",
  ],
};

export default lesson;
