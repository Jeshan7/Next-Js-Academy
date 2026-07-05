import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

A "pessimistic" mutation waits for the server to confirm before the UI changes at all — safe, but it makes every click feel like it has network latency attached. \`useOptimistic\` lets you show the *expected* result the instant the user acts, then reconcile with whatever the server actually returns — rolling back cleanly if the mutation fails.

## Why this exists — the problem

Consider a "like" button. The honest sequence of events is: click → request sent → server processes it → response arrives → UI updates. If the UI waits for all of that, a 300ms round trip reads as a sluggish app, even though 300ms is objectively fast. But the *outcome* of clicking "like" is almost always predictable before the server responds — so why make the user wait to see it?

\`useOptimistic\` lets you render the predicted outcome immediately, while the real request is still in flight underneath.

## How it works internally

### Layering a temporary value over real state

\`\`\`tsx
const [optimisticLikes, addOptimisticLike] = useOptimistic(
  likes,                                   // the real, confirmed state
  (currentLikes, delta: number) => currentLikes + delta // how to merge in a pending change
);
\`\`\`

\`useOptimistic\` takes two things: the real state, and a function describing how to combine that real state with a pending optimistic value. It returns a *derived* value — \`optimisticLikes\` — that reflects the real state plus any not-yet-confirmed change layered on top. Nothing here has touched the server yet.

\`\`\`tsx
async function handleLike() {
  addOptimisticLike(1);           // UI updates now, instantly
  const updated = await likePost(postId); // real request happens in the background
  setLikes(updated.likes);        // real state catches up once the server confirms
}
\`\`\`

\`addOptimisticLike\` doesn't wait for anything — it schedules the derived value to include the pending change on the very next render. Once the real request resolves and \`setLikes\` updates the *actual* state, the optimistic overlay is no longer needed and disappears — the real value and the (now matching) optimistic value converge.

::diagram{optimistic-vs-pessimistic}

### Rollback behavior on failure

If the request fails, the real state (\`likes\`) never gets updated — so the optimistic overlay would otherwise be stuck showing a value the server never confirmed. The fix is to explicitly resolve the pending state one way or the other in a \`catch\`: revert the base state (even to its own unchanged value) so the derived optimistic layer collapses back to what's actually confirmed, and surface an error so the user knows the like didn't register.

\`\`\`tsx
async function handleLike() {
  addOptimisticLike(1);
  try {
    const updated = await likePost(postId);
    setLikes(updated.likes);
  } catch {
    setLikes((current) => current); // force a settle so the optimistic overlay clears
    setError("Couldn't save your like — try again.");
  }
}
\`\`\`

### When optimistic UI is worth it — and when it isn't

Optimistic updates are a great fit when:
- the outcome is highly predictable (liking a post almost never fails)
- the action is easily reversible if it does fail (toggle back, show a small error)

They're a poor fit when:
- the action is **destructive** and hard to undo visually (permanently deleting something) — showing it gone immediately, then un-deleting it on failure, is a jarring, trust-eroding flicker
- the action is **likely to fail** (payment processing, anything with real validation that commonly rejects) — the "optimistic" case would be the exception, not the rule, so pessimistic UI with a clear pending state serves the user better

The rule of thumb: reach for \`useOptimistic\` when being wrong is rare and cheap to correct; stick with a normal pending state when being wrong is common or costly.

## The sandbox in this lesson

\`useOptimistic\` ships in React 19; this sandbox bundles React 18.3, which predates it. \`polyfill.ts\` (read-only) reimplements the hook's \`[optimisticState, addOptimistic]\` shape with plain \`useState\`, layering a pending value over the real state exactly like the real hook does, and clearing itself once the real state changes underneath it. \`api.ts\` simulates \`likePost\` with an artificial delay and an explicit "simulate failure" flag you can toggle to see the rollback path.

## Common mistakes

- **Forgetting to reconcile with the real state after success** — the optimistic value is meant to be temporary; skipping \`setLikes(updated.likes)\` leaves the UI trusting a guess forever instead of the confirmed value.
- **Not handling the failure path at all** — without an explicit revert, a failed request can leave the UI permanently showing an outcome that never actually happened.
- **Using optimistic UI for destructive or failure-prone actions** — the flicker of "gone, then back" (or "paid, then failed") is worse than a brief, honest pending state.

## Best practices

- Keep the update function passed to \`useOptimistic\` pure and cheap — it runs on every render while a change is pending.
- Always pair \`addOptimistic\` with a \`try/catch\` around the real request, so failure has an explicit, visible resolution.
- Reserve optimistic UI for cheap, reversible, usually-successful actions; use a pending state for anything destructive or failure-prone.

## Performance considerations

Optimistic UI doesn't make the request itself faster — it changes *when the user perceives the result*. The network round trip still happens at the same speed; the value of \`useOptimistic\` is entirely about perceived responsiveness, not actual latency.
`;

const polyfillCode = `// polyfill.ts — READ-ONLY.
// React 19 ships useOptimistic natively. This sandbox bundles React 18.3,
// which predates it, so this file reimplements the hook's public shape —
// [optimisticState, addOptimistic] — with plain useState. The pending
// overlay clears itself once the real "state" argument changes underneath
// it, the same way the real hook settles once its base state updates.
import { useState } from "react";

export function useOptimistic<State, Value>(
  state: State,
  updateFn: (state: State, value: Value) => State
): [State, (value: Value) => void] {
  const [pending, setPending] = useState<{ base: State; value: Value } | null>(null);

  if (pending && pending.base !== state) {
    // the real state changed since this optimistic update was added —
    // the request settled (success or failure), so drop the overlay.
    setPending(null);
  }

  const optimisticState = pending ? updateFn(pending.base, pending.value) : state;

  function addOptimistic(value: Value) {
    setPending({ base: state, value });
  }

  return [optimisticState, addOptimistic];
}
`;

const apiCode = `// api.ts — READ-ONLY. Simulates a flaky "like" endpoint.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Post = { id: string; title: string; likes: number };

export const POSTS: Post[] = [
  { id: "p1", title: "Why we moved to the App Router", likes: 12 },
  { id: "p2", title: "Debugging a fetch waterfall", likes: 4 },
];

export async function likePost(id: string, shouldFail: boolean): Promise<Post> {
  await sleep(700); // pretend this is a network round trip
  const post = POSTS.find((p) => p.id === id);
  if (!post) throw new Error("Post not found");
  if (shouldFail) {
    console.log("[api] likePost failed for", id);
    throw new Error("Network error — like not saved");
  }
  post.likes += 1;
  console.log("[api] likePost succeeded for", id, "→", post.likes);
  return { ...post };
}
`;

const listStarter = `// Exercises 1–3: an optimistic "like" list with a failure toggle.
import { useState } from "react";
import { useOptimistic } from "./polyfill";
import { POSTS, likePost, Post } from "./api";

export default function LikeList() {
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [shouldFail, setShouldFail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: const [optimisticPosts, addOptimisticLike] = useOptimistic(
  //   posts,
  //   (current, likedId: string) =>
  //     current.map((p) => (p.id === likedId ? { ...p, likes: p.likes + 1 } : p))
  // );

  async function handleLike(id: string) {
    // TODO: addOptimisticLike(id) immediately
    // TODO: try { const updated = await likePost(id, shouldFail); setPosts(...) }
    // TODO: catch { setPosts((current) => [...current]); setError("Couldn't save your like — try again."); }
  }

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={shouldFail}
          onChange={(e) => setShouldFail(e.target.checked)}
        />
        Simulate failure
      </label>
      {error && <p className="like-error">{error}</p>}
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id}>
            {post.title} — <span className="like-count">{post.likes}</span>
            <button onClick={() => handleLike(post.id)}>Like</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const listSolution = `import { useState } from "react";
import { useOptimistic } from "./polyfill";
import { POSTS, likePost, Post } from "./api";

export default function LikeList() {
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [shouldFail, setShouldFail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [optimisticPosts, addOptimisticLike] = useOptimistic(
    posts,
    (current, likedId: string) =>
      current.map((p) => (p.id === likedId ? { ...p, likes: p.likes + 1 } : p))
  );

  async function handleLike(id: string) {
    setError(null);
    addOptimisticLike(id);
    try {
      const updated = await likePost(id, shouldFail);
      setPosts((current) => current.map((p) => (p.id === id ? updated : p)));
    } catch {
      setPosts((current) => [...current]);
      setError("Couldn't save your like — try again.");
    }
  }

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={shouldFail}
          onChange={(e) => setShouldFail(e.target.checked)}
        />
        Simulate failure
      </label>
      {error && <p className="like-error">{error}</p>}
      <ul className="post-list">
        {optimisticPosts.map((post) => (
          <li key={post.id}>
            {post.title} — <span className="like-count">{post.likes}</span>
            <button onClick={() => handleLike(post.id)}>Like</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const appCode = `import LikeList from "./LikeList";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>useOptimistic (polyfilled)</h1>
      <LikeList />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5.3 sandbox
==================

polyfill.ts reimplements useOptimistic's [optimisticState, addOptimistic]
shape, since this sandbox's bundled React predates the real hook.
api.ts simulates a "like" request with an artificial delay and a
"shouldFail" flag you can toggle from the UI.

1. Call useOptimistic over the posts state and render optimisticPosts.
2. Call addOptimisticLike immediately on click, then await the real
   request and reconcile with setPosts.
3. Check "Simulate failure", click Like, and confirm the like count
   rolls back and an error message appears.
`,
  },
  { path: "/polyfill.ts", readOnly: true, code: polyfillCode },
  { path: "/api.ts", readOnly: true, code: apiCode },
  { path: "/LikeList.tsx", code: listStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/polyfill.ts", readOnly: true, code: polyfillCode },
  { path: "/api.ts", readOnly: true, code: apiCode },
  { path: "/LikeList.tsx", code: listSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m5-l3",
  title: "Optimistic updates with useOptimistic",
  description:
    "Showing the expected result instantly with useOptimistic, how it layers a temporary value over real state, rollback on failure, and when optimistic UI is worth the added complexity.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Layer an optimistic value over posts",
      difficulty: "easy",
      instructions: `In \`LikeList.tsx\`, call \`useOptimistic(posts, updateFn)\` where \`updateFn\` maps over the posts and increments the liked post's count. Render \`optimisticPosts\` instead of \`posts\` in the \`<ul>\`.`,
      validation: [
        { type: "code-includes", file: "/LikeList.tsx", pattern: "useOptimistic(", message: "LikeList calls useOptimistic" },
        { type: "code-includes", file: "/LikeList.tsx", pattern: "optimisticPosts.map", message: "LikeList renders optimisticPosts, not the raw posts state" },
      ],
      hint: `const [optimisticPosts, addOptimisticLike] = useOptimistic(posts, (current, likedId) => current.map(p => p.id === likedId ? { ...p, likes: p.likes + 1 } : p));`,
    },
    {
      id: "ex2",
      title: "Add the optimistic update and reconcile on success",
      difficulty: "medium",
      instructions: `In \`handleLike\`, call \`addOptimisticLike(id)\` immediately, then \`await likePost(id, shouldFail)\` and call \`setPosts\` with the server-confirmed result. Uncheck "Simulate failure" and confirm the like count updates instantly, then stays correct after the delay.`,
      validation: [
        { type: "code-includes", file: "/LikeList.tsx", pattern: "addOptimisticLike(id)", message: "handleLike calls addOptimisticLike(id)" },
        { type: "code-includes", file: "/LikeList.tsx", pattern: "likePost(id, shouldFail)", message: "handleLike calls likePost(id, shouldFail)" },
        { type: "code-includes", file: "/LikeList.tsx", pattern: "setPosts(", message: "handleLike reconciles with setPosts after the request resolves" },
      ],
    },
    {
      id: "ex3",
      title: "Roll back on failure",
      difficulty: "hard",
      instructions: `Wrap the request in \`try/catch\`. In the \`catch\`, call \`setPosts\` with a new array (e.g. \`[...current]\`) to clear the optimistic overlay, and set an error message. Check "Simulate failure", click Like, and confirm the count reverts and \`<p className="like-error">\` appears.`,
      validation: [
        { type: "code-includes", file: "/LikeList.tsx", pattern: "catch", message: "handleLike has a catch branch" },
        { type: "code-includes", file: "/LikeList.tsx", pattern: "setError(", message: "handleLike sets an error message on failure" },
        { type: "dom-exists", selector: "p.like-error", message: "An error message can render (after triggering a simulated failure)" },
      ],
      hint: `catch { setPosts((current) => [...current]); setError("Couldn't save your like — try again."); }`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What does useOptimistic return?",
      options: [
        "A derived state value layering a pending change over the real state, and a function to add that pending change",
        "A promise that resolves when the mutation completes",
        "A boolean indicating whether the UI is stale",
        "The raw FormData from the last submission",
      ],
      answerIndex: 0,
      explanation: "useOptimistic returns [optimisticState, addOptimistic] — a derived value combining real state with any pending change, and the function to schedule that change.",
    },
    {
      id: "q2",
      type: "tf",
      question: "useOptimistic makes the underlying network request resolve faster.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The request takes exactly as long as it always would — useOptimistic only changes when the user perceives a result, not the actual round-trip time.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why is useOptimistic usually a poor fit for a destructive action like permanently deleting a record?",
      options: [
        "useOptimistic can't be used with delete operations at all",
        "Showing the item gone immediately and then reverting it on failure produces a jarring, trust-eroding flicker for an action that's hard to visually undo",
        "Delete operations are always synchronous",
        "It would require a second useState",
      ],
      answerIndex: 1,
      explanation: "Optimistic UI is best for cheap, reversible, usually-successful actions — a destructive action failing and 'un-deleting' is a worse experience than a brief pessimistic wait.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "A request made after addOptimistic fails, but the code never calls setPosts (or any update to the base state) in the catch block. What does the UI show?",
      code: `async function handleLike(id) {\n  addOptimisticLike(id);\n  try {\n    const updated = await likePost(id, true);\n    setPosts(updated);\n  } catch {\n    // nothing here\n  }\n}`,
      options: [
        "The UI automatically reverts to the real state after a timeout",
        "The optimistic overlay stays stuck showing the incremented like count forever, since the base state never changed to clear it",
        "React throws a runtime error",
        "The like count resets to zero",
      ],
      answerIndex: 1,
      explanation: "Without an explicit resolution of the base state in the failure path, the optimistic overlay has nothing to compare against and never clears — the UI keeps showing an outcome the server never confirmed.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "In this lesson's polyfill, why does the optimistic overlay clear itself specifically when the 'state' argument changes, rather than on a timer?",
      options: [
        "Because timers are unreliable in React",
        "Because the overlay is meant to represent a *pending* change relative to the real state — once the real state itself updates (the request settled, success or failure), the pending guess is no longer needed",
        "Because useState doesn't support timers",
        "It doesn't clear — it's permanent until the page reloads",
      ],
      answerIndex: 1,
      explanation: "The overlay's entire purpose is to bridge the gap until the real state is known; once that real state changes underneath it, the temporary value has served its purpose and should be dropped.",
    },
  ],
  keyTakeaways: [
    "useOptimistic layers a temporary, predicted value over real state so the UI updates before the server confirms anything.",
    "addOptimistic doesn't wait for the network — it's synchronous and immediate; the real request still happens in the background.",
    "Rollback requires explicitly resolving the base state in a catch block — without it, a failed request can leave the optimistic value stuck.",
    "Reserve optimistic UI for cheap, reversible, usually-successful actions; use a normal pending state for destructive or failure-prone ones.",
  ],
  cheatSheet: `
| Concept | What it means |
| --- | --- |
| \`useOptimistic(state, updateFn)\` | Derives a value combining real \`state\` with a pending change |
| \`addOptimistic(value)\` | Schedules the pending change for the next render — no network wait |
| Reconciliation | Calling the real state setter with the server's confirmed result |
| Rollback | Resolving the base state in a \`catch\` so the overlay clears |
| Good fit | Cheap, reversible, usually-successful actions (likes, toggles) |
| Poor fit | Destructive or failure-prone actions (deletes, payments) |
`,
  interviewQuestions: [
    "What two arguments does useOptimistic take, and what does each do?",
    "How does an optimistic update get 'cleared' once the real request resolves?",
    "What happens to the UI if a failed optimistic update is never explicitly rolled back?",
    "When would you avoid using useOptimistic even though it's available?",
    "Does useOptimistic change how long the actual network request takes? What does it actually improve?",
    "How would you show a user that an optimistic action ultimately failed, after the UI already showed it succeeding?",
  ],
};

export default lesson;
