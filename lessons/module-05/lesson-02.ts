import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Before \`useActionState\`, wiring a form to a mutation meant hand-rolling three separate pieces of state: a loading flag, an error message, and the eventual result — all kept in sync manually inside an \`onSubmit\` handler. \`useActionState\` collapses all three into one hook built around the action function itself, and lets the action *return* its own error state instead of throwing and hoping something catches it.

## Why this exists — the problem

The manual pattern looks like this:

\`\`\`tsx
function ProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await updateProfile(new FormData(e.currentTarget));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }
  // ...
}
\`\`\`

Every form in the app repeats this same three-state dance, and every mutation function has to decide whether to throw (forcing a try/catch) or return something (forcing a manual check) — inconsistently, from form to form. \`useActionState\` standardizes the shape: the action function takes the *previous state* and the submitted \`FormData\`, and returns the *next state* — which becomes exactly what the component renders, no separate error/loading variables to keep in sync.

## How it works internally

### The \`[state, formAction, isPending]\` shape

\`\`\`tsx
const [state, formAction, isPending] = useActionState(updateProfile, initialState);
\`\`\`

- **\`state\`** — whatever the action function most recently returned (or \`initialState\` before the first submission).
- **\`formAction\`** — a wrapped version of your action, meant to be passed to a \`<form action={formAction}>\` (or called directly with a \`FormData\`).
- **\`isPending\`** — \`true\` for the window between submission and the action's promise resolving; no manual \`useState\` needed to track it.

The action function itself takes the current \`state\` as its first argument and the submitted \`FormData\` as its second, and returns (or resolves to) the new state:

\`\`\`tsx
async function updateProfile(prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return { error: "Name is required" }; // returned, not thrown
  }
  await saveProfile(name);
  return { success: true, name };
}
\`\`\`

### Returning errors instead of throwing

This is the key shift from the manual pattern: a validation failure is *expected*, everyday behavior for a form — not an exceptional circumstance. Returning \`{ error: "..." }\` and rendering \`state.error\` treats it that way. A \`throw\` is reserved for truly unexpected failures (the ones \`error.tsx\` exists to catch) — see lesson 5.4 for the full distinction between the two.

::diagram{action-state-machine}

### Progressive enhancement

Because \`formAction\` is designed to be handed straight to a \`<form>\`'s \`action\` prop, a form wired this way in real Next.js keeps working even before JavaScript has loaded or hydrated — the browser can submit the form as a normal POST, and React progressively takes over the same code path once it's ready. This is a meaningful difference from a hand-rolled \`onSubmit\` handler, which does nothing at all until JS has hydrated.

## The sandbox in this lesson

\`useActionState\` ships in React 19; this sandbox bundles React 18.3, which predates it. \`polyfill.ts\` (read-only) reimplements the hook's exact public shape — \`[state, formAction, isPending]\`, action taking \`(state, formData)\` and returning the next state — using plain \`useState\`, so you practice the same programming model you'd use against the real hook in a React 19 app. \`actions.ts\` simulates the server-side action with an artificial delay.

## Common mistakes

- **Still managing a separate \`isLoading\`/\`error\` \`useState\` alongside \`useActionState\`** — that duplicates exactly what the hook already tracks.
- **Throwing from the action function for expected validation failures** — return a state object instead, so the form can render it inline.
- **Forgetting the action function's first parameter is the previous state, not the event** — its signature is \`(prevState, formData)\`, not \`(event)\`.

## Best practices

- Let the action function's return value be the single source of truth for what the form renders — success, error, or the initial state.
- Use \`isPending\` to disable the submit button and show a spinner, instead of a hand-rolled loading flag.
- Design the state shape (\`{ error? }\` vs \`{ success, data }\`) once, and reuse the same shape convention across every form in the app.

## Performance considerations

\`useActionState\` doesn't change the network cost of a mutation — it changes how much bookkeeping code you write around it. The real gain is fewer moving pieces to get out of sync, not a performance improvement to the request itself.
`;

const polyfillCode = `// polyfill.ts — READ-ONLY.
// React 19 ships useActionState natively. This sandbox bundles React 18.3,
// which predates it, so this file reimplements the hook's exact public
// shape — [state, formAction, isPending] — using plain useState, so the
// code you write here matches what you'd write against the real hook.
import { useState } from "react";

export function useActionState<State>(
  action: (prevState: State, formData: FormData) => Promise<State> | State,
  initialState: State
): [State, (formData: FormData) => void, boolean] {
  const [state, setState] = useState(initialState);
  const [isPending, setIsPending] = useState(false);

  function formAction(formData: FormData) {
    setIsPending(true);
    Promise.resolve(action(state, formData)).then((next) => {
      setState(next);
      setIsPending(false);
    });
  }

  return [state, formAction, isPending];
}
`;

const actionsCode = `// actions.ts — READ-ONLY. Simulates a Server Action with structured errors.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ProfileState = {
  error?: string;
  success?: boolean;
  name?: string;
};

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  await sleep(600); // pretend this is a network + database round trip
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return { error: "Name is required" };
  }
  console.log("[action] updateProfile saved:", name);
  return { success: true, name: name.trim() };
}
`;

const formStarter = `// Exercise 1 & 2 & 3: wire useActionState to a form.
import { useActionState } from "./polyfill";
import { updateProfile, ProfileState } from "./actions";

const initialState: ProfileState = {};

export default function ProfileForm() {
  // TODO: const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // TODO: e.preventDefault(); build FormData; call formAction(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Your name" />
      <button type="submit">Save</button>
      {/* TODO: render a pending spinner and any returned error/success message */}
    </form>
  );
}
`;

const formSolution = `import { useActionState } from "./polyfill";
import { updateProfile, ProfileState } from "./actions";

const initialState: ProfileState = {};

export default function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formAction(formData);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Your name" />
      <button type="submit" disabled={isPending}>
        Save
      </button>
      {isPending && <p className="form-pending">Saving…</p>}
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">Saved as {state.name}</p>}
    </form>
  );
}
`;

const appCode = `import ProfileForm from "./ProfileForm";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>useActionState (polyfilled)</h1>
      <ProfileForm />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5.2 sandbox
==================

polyfill.ts reimplements useActionState's [state, formAction, isPending]
shape using plain useState, since this sandbox's bundled React predates
the real hook. actions.ts simulates a Server Action that returns
structured errors instead of throwing.

1. Call useActionState(updateProfile, initialState) and wire formAction
   to the form's submit handler.
2. Show a pending message while isPending is true.
3. Render state.error or state.success below the form.
`,
  },
  { path: "/polyfill.ts", readOnly: true, code: polyfillCode },
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/ProfileForm.tsx", code: formStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/polyfill.ts", readOnly: true, code: polyfillCode },
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/ProfileForm.tsx", code: formSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m5-l2",
  title: "Forms with useActionState",
  description:
    "Replacing manual onSubmit + fetch + loading/error state with useActionState's [state, formAction, isPending] shape, returning structured errors instead of throwing, and the progressive-enhancement angle.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Wire up useActionState",
      difficulty: "easy",
      instructions: `In \`ProfileForm.tsx\`, call \`useActionState(updateProfile, initialState)\` and destructure \`[state, formAction, isPending]\`. In \`handleSubmit\`, prevent the default submit, build a \`FormData\` from the form, and call \`formAction(formData)\`.`,
      validation: [
        { type: "code-includes", file: "/ProfileForm.tsx", pattern: "useActionState(updateProfile, initialState)", message: "ProfileForm calls useActionState with updateProfile and initialState" },
        { type: "code-includes", file: "/ProfileForm.tsx", pattern: "formAction(formData)", message: "handleSubmit calls formAction(formData)" },
      ],
      hint: `const [state, formAction, isPending] = useActionState(updateProfile, initialState); then in handleSubmit: e.preventDefault(); formAction(new FormData(e.currentTarget));`,
    },
    {
      id: "ex2",
      title: "Show a pending state",
      difficulty: "medium",
      instructions: `Render a \`<p className="form-pending">\` (e.g. "Saving…") whenever \`isPending\` is true, and disable the submit button while pending.`,
      validation: [
        { type: "code-regex", file: "/ProfileForm.tsx", regex: "isPending\\s*&&", message: "ProfileForm conditionally renders something based on isPending" },
        { type: "code-regex", file: "/ProfileForm.tsx", regex: "disabled=\\{isPending\\}", message: "The submit button is disabled while isPending" },
      ],
    },
    {
      id: "ex3",
      title: "Render the returned error or success message",
      difficulty: "hard",
      instructions: `Submit the form with an empty name and confirm a \`<p className="form-error">\` renders \`state.error\`. Submit with a name filled in and confirm a \`<p className="form-success">\` renders instead.`,
      validation: [
        { type: "code-includes", file: "/ProfileForm.tsx", pattern: "state.error", message: "ProfileForm renders state.error" },
        { type: "code-includes", file: "/ProfileForm.tsx", pattern: "state.success", message: "ProfileForm renders something based on state.success" },
      ],
      hint: `{state.error && <p className="form-error">{state.error}</p>} {state.success && <p className="form-success">Saved as {state.name}</p>}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What are the three values useActionState returns?",
      options: [
        "[data, error, loading]",
        "[state, formAction, isPending]",
        "[value, setValue, reset]",
        "[request, response, status]",
      ],
      answerIndex: 1,
      explanation: "state is the action's last returned value, formAction is what you pass to the form, and isPending tracks whether a submission is in flight.",
    },
    {
      id: "q2",
      type: "tf",
      question: "An action function used with useActionState should throw an Error for an ordinary validation failure like a missing required field.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Ordinary, expected validation failures should be returned as part of the state (e.g. { error: \"...\" }), not thrown — throwing is for genuinely unexpected failures.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "What are the two parameters an action function passed to useActionState receives?",
      code: `async function updateProfile(a, b) {\n  // ...\n}\nuseActionState(updateProfile, initialState);`,
      options: [
        "The submit event and the form element",
        "The previous state and the submitted FormData",
        "The initial state and a callback",
        "Only the FormData — there's no first parameter",
      ],
      answerIndex: 1,
      explanation: "The action function's signature is (prevState, formData) => nextState — not (event) — which is why it can be passed directly as a form action.",
    },
    {
      id: "q4",
      type: "mcq",
      question: "Why does useActionState's progressive-enhancement angle matter?",
      options: [
        "It makes the bundle smaller",
        "A form wired to formAction can still submit as a plain POST before JavaScript hydrates, since formAction is designed to be passed straight into a <form>'s action prop",
        "It disables client-side validation entirely",
        "It automatically adds server-side rate limiting",
      ],
      answerIndex: 1,
      explanation: "Because formAction is meant to be handed to a form's action prop, the same code path degrades gracefully to a normal browser submission before React has hydrated.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A form using useActionState never shows the returned error message, even though the action function clearly returns { error: \"...\" } on invalid input. What's the likely bug?",
      options: [
        "useActionState doesn't support errors",
        "The component still checks a separate error useState instead of reading state.error from useActionState's returned state",
        "FormData can't hold error messages",
        "isPending is stuck at true"
      ],
      answerIndex: 1,
      explanation: "A common migration mistake is leaving old manual error state in place instead of reading the error off the state useActionState already returns.",
    },
  ],
  keyTakeaways: [
    "useActionState replaces manual onSubmit + fetch + loading/error useState with a single [state, formAction, isPending] triple.",
    "The action function's signature is (prevState, formData) => nextState — its return value becomes exactly what the form renders next.",
    "Return structured errors from the action instead of throwing; throwing is reserved for genuinely unexpected failures.",
    "formAction is designed to be passed directly to a form's action prop, which is what enables progressive enhancement before JS hydrates.",
  ],
  cheatSheet: `
| Manual pattern | useActionState |
| --- | --- |
| \`useState\` for loading | \`isPending\` from the hook |
| \`useState\` for error | part of \`state\`, returned by the action |
| \`try/catch\` around a throw | action returns \`{ error }\` directly |
| \`onSubmit\` + manual \`fetch\` | \`formAction\` passed to \`<form action={...}>\` |
| No JS = broken form | Progressive enhancement — works before hydration |
`,
  interviewQuestions: [
    "What three values does useActionState return, and what does each one represent?",
    "What's the signature of an action function used with useActionState, and why isn't it just (event)?",
    "Why should validation failures be returned from the action rather than thrown?",
    "How does useActionState enable progressive enhancement compared to a hand-rolled onSubmit handler?",
    "What state would you no longer need to manage manually once a form is wired to useActionState?",
    "How would you design the state shape returned by an action to support both error and success cases cleanly?",
  ],
};

export default lesson;
