import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

This lesson doesn't introduce anything new — it's a capstone that assembles everything from this module into one realistic feature: a small task list with create, toggle-complete, and delete. The interesting part isn't any single technique; it's the architectural decisions about **where state lives, which actions exist, and how optimism and validation interact** once a feature has more than one moving mutation.

## Why this exists — the problem

Individually, a Server Action, a \`useActionState\` form, an optimistic toggle, and a validated delete are each simple. A real feature needs all four working together without stepping on each other: creating a task shouldn't block the list from re-rendering with instant toggles; toggling a task shouldn't fight with a pending delete; and every mutation still needs to survive a server round trip that might fail. Building this once, deliberately, is what turns "I understand the hook" into "I can ship the feature."

## How it works internally

### Architecture: one source of truth, three kinds of mutation

\`\`\`
tasks state (the real, confirmed list)
 ├── create  → useActionState  (structured errors, pending state, no optimism — creation isn't instant-feeling by nature; a brief pending state is fine)
 ├── toggle  → useOptimistic   (instant feedback — toggling is cheap, reversible, and rarely fails)
 └── delete  → validated + confirmed → Server Action (destructive — no optimism; require confirmation, wait for the real result)
\`\`\`

This is a deliberate application of lesson 5.3's rule of thumb: **optimistic UI for the cheap and reversible, a normal pending state for the rest.** Toggling completion is exactly the "worth it" case; deleting a task is exactly the "not worth it" case — the cost of being wrong (a task vanishes, then reappears) is worse than a short, honest wait.

::diagram{crud-data-flow}

### Create: useActionState end to end

Creation follows lesson 5.2 exactly: an action function shaped \`(prevState, formData) => nextState\`, returning \`{ fieldErrors }\` for a blank title or \`{ tasks }\` for a successful create. The form renders \`isPending\` as a disabled button and \`fieldErrors.title\` next to the input — nothing new, just applied.

### Toggle: useOptimistic end to end

Toggling reuses lesson 5.3's pattern directly: the checkbox flips the instant it's clicked via \`addOptimistic\`, while the real request confirms in the background and reconciles \`tasks\` once it resolves. Because toggling is idempotent and low-stakes, there's no confirmation step — just instant feedback.

### Delete: validation and confirmation, no optimism

Delete combines lesson 5.4's validation layers with a deliberate choice *not* to use \`useOptimistic\`: the user must type the task's title to confirm before the delete button is even enabled (a client-side check, purely for UX — it prevents accidental clicks) — and the server action independently re-validates that the confirmation text matches before actually removing anything (the authoritative check; a client bypass can't skip this). The UI shows a pending state and waits for the real result, exactly the "poor fit for optimism" case from lesson 5.3.

### Why these three approaches coexist in one feature

None of the three mutations share code, but they share the same *foundation*: an action function that returns structured state instead of throwing for expected outcomes, and a UI that renders whatever that state currently is. The differences are all about **how much the UI gets ahead of the server** — never for create (a brief pending state is normal for adding something new), immediately for toggle (cheap and reversible), and never for delete (destructive, needs certainty).

## The sandbox in this lesson

\`db.ts\` (read-only) is a small in-memory task list standing in for a real database, with \`createTask\`, \`toggleTask\`, and \`deleteTask\` functions that simulate network delay via \`sleep\`. \`hooks.ts\` (read-only) re-exports this module's \`useActionState\` and \`useOptimistic\` polyfills from lessons 5.2 and 5.3 — same reasoning: this sandbox's bundled React 18.3 predates both hooks, so the polyfills reproduce their real public shape so the code you write matches a real React 19 app.

## Common mistakes

- **Using \`useOptimistic\` for the delete action** — it's the textbook "not worth it" case from lesson 5.3; a flicker of "gone, then back" is worse than a brief wait.
- **Trusting the client-side delete confirmation as the only check** — the server action must independently re-verify the confirmation, exactly like lesson 5.4's validation layers.
- **Sharing one big \`isPending\` flag across all three mutations** — a pending create shouldn't disable the ability to toggle an unrelated task; keep pending state scoped to the mutation it belongs to.

## Best practices

- Decide optimistic vs pessimistic per mutation, not per feature — the answer for toggle and delete in the same feature can legitimately differ.
- Keep every action function's shape consistent: \`(prevState, formData-or-args) => nextState\`, returning structured outcomes rather than throwing for expected cases.
- Re-validate every mutation on the "server" (simulated here), regardless of what the client already checked or confirmed.

## Performance considerations

None of the three mutations block each other — toggling one task doesn't wait on a pending create, and a pending delete doesn't freeze the rest of the list. Keeping mutation state scoped per-action (rather than one global "is anything happening" flag) is what makes that independence possible.
`;

const dbCode = `// db.ts — READ-ONLY. Simulates a task-list database.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Task = { id: string; title: string; completed: boolean };

export const TASKS: Task[] = [
  { id: "t1", title: "Write the lesson 5.5 sandbox", completed: false },
  { id: "t2", title: "Review Module 5 diagrams", completed: true },
];

let nextId = 3;

export type CreateState = {
  fieldErrors?: { title?: string };
  tasks?: Task[];
};

export async function createTask(
  _prevState: CreateState,
  formData: FormData
): Promise<CreateState> {
  await sleep(500);
  const title = formData.get("title");
  if (typeof title !== "string" || title.trim() === "") {
    return { fieldErrors: { title: "Title is required" } };
  }
  TASKS.push({ id: "t" + nextId++, title: title.trim(), completed: false });
  console.log("[db] created task:", title);
  return { tasks: [...TASKS] };
}

export async function toggleTask(id: string): Promise<Task[]> {
  await sleep(500);
  const task = TASKS.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  console.log("[db] toggled task:", id);
  return [...TASKS];
}

export async function deleteTask(
  id: string,
  confirmationText: string
): Promise<{ error?: string; tasks?: Task[] }> {
  await sleep(500);
  const task = TASKS.find((t) => t.id === id);
  if (!task) return { error: "Task not found" };
  // authoritative check — never trust that the client's confirmation ran
  if (confirmationText.trim() !== task.title) {
    return { error: "Confirmation text doesn't match the task title" };
  }
  const index = TASKS.findIndex((t) => t.id === id);
  TASKS.splice(index, 1);
  console.log("[db] deleted task:", id);
  return { tasks: [...TASKS] };
}
`;

const hooksCode = `// hooks.ts — READ-ONLY. Polyfills for useActionState and useOptimistic,
// reused from lessons 5.2 and 5.3 — this sandbox's bundled React 18.3
// predates both hooks (they ship natively in React 19).
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

export function useOptimistic<State, Value>(
  state: State,
  updateFn: (state: State, value: Value) => State
): [State, (value: Value) => void] {
  const [pending, setPending] = useState<{ base: State; value: Value } | null>(null);

  if (pending && pending.base !== state) {
    setPending(null);
  }

  const optimisticState = pending ? updateFn(pending.base, pending.value) : state;

  function addOptimistic(value: Value) {
    setPending({ base: state, value });
  }

  return [optimisticState, addOptimistic];
}
`;

const appStarter = `// Build the task list incrementally: create → toggle → delete.
import { useState } from "react";
import { useActionState, useOptimistic } from "./hooks";
import { TASKS, Task, createTask, CreateState, toggleTask, deleteTask } from "./db";

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  // Exercise 1: create
  // TODO: const [createState, createAction, isCreating] = useActionState(createTask, {});
  // handleCreate should build a FormData, call createAction, and — once
  // createState.tasks appears — sync it into local tasks state.

  // Exercise 2: toggle-complete, optimistic
  // TODO: const [optimisticTasks, addOptimisticToggle] = useOptimistic(
  //   tasks,
  //   (current, toggledId: string) =>
  //     current.map((t) => (t.id === toggledId ? { ...t, completed: !t.completed } : t))
  // );
  async function handleToggle(id: string) {
    // TODO: addOptimisticToggle(id) immediately, then await toggleTask(id)
    // and setTasks with the result.
  }

  // Exercise 3: delete, validated + confirmed, no optimism
  const [confirmText, setConfirmText] = useState<Record<string, string>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(task: Task) {
    // TODO: client-side check — confirmText[task.id] must equal task.title,
    // otherwise setDeleteError and return without calling deleteTask.
    // Then call deleteTask(task.id, confirmText[task.id]) and setTasks
    // with the result, or setDeleteError with the server's error.
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO
  }

  return (
    <div>
      <form onSubmit={handleCreate}>
        <input name="title" placeholder="New task" />
        <button type="submit">Add</button>
        {/* TODO: render createState.fieldErrors?.title */}
      </form>

      {deleteError && <p className="delete-error">{deleteError}</p>}

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} data-completed={task.completed}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.id)}
              />
              {task.title}
            </label>
            <input
              placeholder="type title to confirm delete"
              value={confirmText[task.id] ?? ""}
              onChange={(e) =>
                setConfirmText({ ...confirmText, [task.id]: e.target.value })
              }
            />
            <button
              className="delete-btn"
              disabled={confirmText[task.id] !== task.title || isDeleting}
              onClick={() => handleDelete(task)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const appSolution = `import { useState } from "react";
import { useActionState, useOptimistic } from "./hooks";
import { TASKS, Task, createTask, CreateState, toggleTask, deleteTask } from "./db";

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  const [createState, createAction, isCreating] = useActionState<CreateState>(
    createTask,
    {}
  );

  const [optimisticTasks, addOptimisticToggle] = useOptimistic(
    tasks,
    (current, toggledId: string) =>
      current.map((t) => (t.id === toggledId ? { ...t, completed: !t.completed } : t))
  );

  async function handleToggle(id: string) {
    addOptimisticToggle(id);
    const updated = await toggleTask(id);
    setTasks(updated);
  }

  const [confirmText, setConfirmText] = useState<Record<string, string>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(task: Task) {
    setDeleteError(null);
    if (confirmText[task.id] !== task.title) {
      setDeleteError("Type the task title exactly to confirm deletion");
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteTask(task.id, confirmText[task.id]);
      if (result.error) {
        setDeleteError(result.error);
      } else if (result.tasks) {
        setTasks(result.tasks);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAction(formData);
    e.currentTarget.reset();
  }

  if (createState.tasks && createState.tasks !== tasks) {
    setTasks(createState.tasks);
  }

  return (
    <div>
      <form onSubmit={handleCreate}>
        <input name="title" placeholder="New task" />
        <button type="submit" disabled={isCreating}>Add</button>
        {createState.fieldErrors?.title && (
          <p className="field-error">{createState.fieldErrors.title}</p>
        )}
      </form>

      {deleteError && <p className="delete-error">{deleteError}</p>}

      <ul className="task-list">
        {optimisticTasks.map((task) => (
          <li key={task.id} data-completed={task.completed}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.id)}
              />
              {task.title}
            </label>
            <input
              placeholder="type title to confirm delete"
              value={confirmText[task.id] ?? ""}
              onChange={(e) =>
                setConfirmText({ ...confirmText, [task.id]: e.target.value })
              }
            />
            <button
              className="delete-btn"
              disabled={confirmText[task.id] !== task.title || isDeleting}
              onClick={() => handleDelete(task)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const appCode = `import TaskApp from "./TaskApp";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Task list — full CRUD</h1>
      <TaskApp />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5.5 sandbox — capstone
=============================

db.ts simulates a task-list database with createTask, toggleTask, and
deleteTask. hooks.ts re-exports this module's useActionState and
useOptimistic polyfills.

1. Wire useActionState to createTask for the create form; sync its
   result into local tasks state and show field errors.
2. Wire useOptimistic to toggleTask so checking a task feels instant.
3. Wire deleteTask behind a typed confirmation, validated on both the
   client (enables the button) and the server (the authoritative check).
`,
  },
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/hooks.ts", readOnly: true, code: hooksCode },
  { path: "/TaskApp.tsx", code: appStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/db.ts", readOnly: true, code: dbCode },
  { path: "/hooks.ts", readOnly: true, code: hooksCode },
  { path: "/TaskApp.tsx", code: appSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m5-l5",
  title: "Project: a full CRUD feature",
  description:
    "A capstone task-list feature tying together Server Actions, useActionState, useOptimistic, and validation — with a deliberate look at where each technique fits and where it doesn't.",
  durationMin: 40,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Create: wire useActionState",
      difficulty: "easy",
      instructions: `Call \`useActionState(createTask, {})\` and destructure \`[createState, createAction, isCreating]\`. In \`handleCreate\`, build a \`FormData\` and call \`createAction(formData)\`. Render \`createState.fieldErrors?.title\` next to the input, and disable the "Add" button while \`isCreating\`.`,
      validation: [
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "useActionState<CreateState>(", message: "TaskApp calls useActionState with createTask" },
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "createAction(formData)", message: "handleCreate calls createAction(formData)" },
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "fieldErrors?.title", message: "TaskApp renders createState.fieldErrors?.title" },
      ],
      hint: `const [createState, createAction, isCreating] = useActionState<CreateState>(createTask, {});`,
    },
    {
      id: "ex2",
      title: "Toggle-complete: wire useOptimistic",
      difficulty: "medium",
      instructions: `Call \`useOptimistic\` over \`tasks\` with an update function that flips a task's \`completed\` flag by id. In \`handleToggle\`, call \`addOptimisticToggle(id)\` immediately, then \`await toggleTask(id)\` and \`setTasks\` with the result. Render \`optimisticTasks\`, not \`tasks\`, in the list.`,
      validation: [
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "useOptimistic(", message: "TaskApp calls useOptimistic" },
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "addOptimisticToggle(id)", message: "handleToggle calls addOptimisticToggle(id)" },
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "optimisticTasks.map", message: "TaskApp renders optimisticTasks in the list" },
      ],
    },
    {
      id: "ex3",
      title: "Delete: validate and confirm, no optimism",
      difficulty: "hard",
      instructions: `In \`handleDelete\`, check that \`confirmText[task.id]\` equals \`task.title\` before calling \`deleteTask\` — if it doesn't match, set \`deleteError\` and return early. Otherwise call \`deleteTask(task.id, confirmText[task.id])\`, and set \`tasks\` or \`deleteError\` based on the result. Confirm the delete button stays disabled until the typed text matches exactly.`,
      validation: [
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "deleteTask(task.id, confirmText[task.id])", message: "handleDelete calls deleteTask with the task id and confirmation text" },
        { type: "code-includes", file: "/TaskApp.tsx", pattern: "setDeleteError", message: "handleDelete sets deleteError on a mismatch or server error" },
        { type: "code-regex", file: "/TaskApp.tsx", regex: "disabled=\\{confirmText\\[task\\.id\\]\\s*!==\\s*task\\.title", message: "The delete button is disabled until the confirmation text matches the task title" },
      ],
      hint: `if (confirmText[task.id] !== task.title) { setDeleteError("Type the task title exactly to confirm deletion"); return; }`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "In this capstone, which mutation uses useOptimistic, and why that one specifically?",
      options: [
        "Delete — because removing a task is the most common action",
        "Toggle-complete — because it's cheap, reversible, and rarely fails, matching lesson 5.3's criteria for when optimism is worth it",
        "Create — because adding data should always feel instant",
        "All three mutations use useOptimistic equally",
      ],
      answerIndex: 1,
      explanation: "Toggle-complete is the textbook 'worth it' case: low stakes, easily reversible, and unlikely to fail — exactly what lesson 5.3 identifies as a good fit.",
    },
    {
      id: "q2",
      type: "tf",
      question: "The delete flow in this lesson trusts the client-side confirmation (typing the task title) as the only check before deleting.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "The client-side match only enables the button for UX; deleteTask independently re-checks the confirmation text on the 'server' before actually deleting anything.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why doesn't the delete action use useOptimistic, even though it could technically remove the task from the list instantly?",
      options: [
        "useOptimistic doesn't support removing items from an array",
        "Delete is destructive and comparatively likely to be rejected by validation — the flicker of 'gone, then back' is worse than a brief, honest pending state",
        "Delete actions can't be async",
        "It would require a different polyfill",
      ],
      answerIndex: 1,
      explanation: "This mirrors lesson 5.3's guidance directly: destructive, failure-prone actions are a poor fit for optimistic UI.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "If a pending create request shared the same isPending flag as the toggle and delete actions, what problem would that cause?",
      code: `// hypothetical: one shared isPending across create, toggle, delete\nconst [isPending, setIsPending] = useState(false);`,
      options: [
        "No problem — it simplifies the code",
        "Submitting the create form would disable toggling or deleting unrelated, already-existing tasks while the create request is still in flight",
        "It would cause a TypeScript error",
        "The three mutations already share state intentionally"
      ],
      answerIndex: 1,
      explanation: "Pending state should be scoped to the mutation it belongs to — a slow create shouldn't freeze interaction with tasks that have nothing to do with it.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A learner wires useActionState for create but the task list never updates after a successful create, even though createState.tasks clearly contains the new task. What's the likely missing step?",
      options: [
        "createTask needs to be marked \"use client\"",
        "The component needs to sync createState.tasks into the actual tasks state (e.g. with setTasks) — useActionState's own state and the list's local state are separate variables",
        "useActionState doesn't support arrays",
        "The form is missing a name attribute",
      ],
      answerIndex: 1,
      explanation: "createState is the action's own returned state; it doesn't automatically flow into a separately-declared tasks state unless the component explicitly syncs them.",
    },
  ],
  keyTakeaways: [
    "A real CRUD feature applies different mutation strategies per action — not one blanket pattern for every mutation in the feature.",
    "Optimistic UI fits toggle-style actions (cheap, reversible, rarely fails); destructive actions like delete are better served by a pending state and explicit confirmation.",
    "Client-side confirmation (typing a title to enable a button) is UX only — the server action must independently re-validate before anything is actually deleted.",
    "Keeping pending/error state scoped per-mutation (not one global flag) keeps unrelated actions from blocking each other.",
  ],
  cheatSheet: `
| Mutation | Technique | Why |
| --- | --- | --- |
| Create | \`useActionState\` | Structured field errors, a pending state is expected and fine |
| Toggle-complete | \`useOptimistic\` | Cheap, reversible, rarely fails — instant feedback is worth it |
| Delete | Validated + confirmed, no optimism | Destructive — client hint enables the button, server re-checks authoritatively |
| Every action | Return structured state, don't throw for expected outcomes | Consistent shape across the whole feature |
`,
  interviewQuestions: [
    "How would you decide which mutations in a CRUD feature deserve optimistic UI and which don't?",
    "Why does this capstone's delete flow check the confirmation text on both the client and the server?",
    "What would go wrong if all mutations in a feature shared one global pending flag?",
    "How do useActionState and useOptimistic complement each other when they're both used in the same feature?",
    "If you were adding an 'edit task title' mutation to this feature, would you make it optimistic? Why or why not?",
    "What's the architectural benefit of every action function returning structured state instead of throwing for expected outcomes?",
  ],
};

export default lesson;
