import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Next.js is React with an architecture around it — so before touching routing or server rendering, you need three React ideas cold: **components**, **props**, and **state**. This lesson builds them from first principles.

## Why this exists

Before component-based UI, web pages were built from three separate global piles: one pile of HTML, one of CSS, one of JavaScript. A single feature — say, a "like" button — had its markup in one file, its styles in another, and its behavior in a third, all connected by fragile string IDs. Change one pile and the others silently break.

React's bet: a UI is easier to reason about if you slice it by **feature**, not by **technology**. A component owns its markup, logic, and (often) styles in one place, and the page is a *tree* of these components.

::diagram{component-tree}

## How it works internally

### Components are functions that return descriptions

A component is a plain function that returns **JSX** — a description of what the UI should look like. JSX is not HTML; it compiles to \`React.createElement(...)\` calls that build a lightweight object tree (often called the *virtual DOM*).

When something changes, React re-runs the affected component functions, gets a new description tree, **diffs** it against the previous one, and applies only the minimal DOM changes. You never manually call \`document.createElement\` or mutate the page — you describe the end state, React handles the transitions.

### Props: data flows down

Props are the arguments of a component function. The parent decides the values; the child receives them **read-only**. This one-way flow is what keeps large apps predictable: to understand why a component looks the way it does, you only ever look *up* the tree.

\`\`\`tsx
function Price({ amount, currency }: { amount: number; currency: string }) {
  return <span>{currency}{amount.toFixed(2)}</span>;
}

// Parent decides the data:
<Price amount={19.99} currency="$" />
\`\`\`

### State: memory that triggers re-renders

Regular variables don't survive re-renders and changing them doesn't update the screen. \`useState\` gives a component both:

\`\`\`tsx
const [count, setCount] = useState(0);
\`\`\`

Calling \`setCount(1)\` does two things: stores the new value in React's internal memory for this component instance, and **schedules a re-render**. The function runs again, \`count\` is now 1, and React diffs the new output against the DOM.

Two rules that follow from the internals:

1. **Never mutate state directly.** \`count++\` changes a local variable React isn't watching — no re-render happens.
2. **State updates are asynchronous and batched.** Reading \`count\` immediately after \`setCount\` gives the old value; the new one exists only in the *next* render.

## Why this matters specifically for Next.js

In the App Router, components come in two flavors:

- **Server Components** (the default): can use props, **cannot** use state — there is no "later" on the server; they render once per request.
- **Client Components** (opt-in with \`"use client"\`): can use \`useState\`, \`useEffect\`, and browser APIs.

Everything in this lesson about props applies everywhere. Everything about state applies only to Client Components. Internalizing that split now saves you the single most common Next.js error message later: *"useState only works in a Client Component."*

## Common mistakes

- **Mutating state**: \`items.push(x)\` then \`setItems(items)\` — same array reference, React may skip the re-render. Always create new objects/arrays: \`setItems([...items, x])\`.
- **Calling the setter during render** — causes an infinite loop. Setters belong in event handlers or effects.
- **Prop drilling everything** — passing props through five layers that don't use them. Often the fix is restructuring (composition), not reaching for global state.
- **Missing \`key\` in lists** — React can't track which item is which, causing subtle UI bugs when the list reorders.

## Best practices

- Keep components small and named after what they *are* (\`ProductCard\`), not what they do internally.
- Lift state to the lowest common ancestor that needs it — no lower, no higher.
- Derive values instead of storing them: if \`total\` can be computed from \`items\`, compute it during render; don't put it in state.

## Performance considerations

Re-renders are cheap but not free. The biggest wins come from structure: keep state close to where it's used so a keystroke in a search box doesn't re-render the whole page tree.
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 2 sandbox
================

You'll build a small profile card app across three exercises:
1. A ProfileCard component that receives props.
2. A follow button with useState.
3. A skills list rendered from an array prop.

Create new components in components.tsx and use them from App.tsx.
`,
  },
  {
    path: "/App.tsx",
    code: `import { ProfileCard } from "./components";

export default function App() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Team</h1>
      <ProfileCard />
    </main>
  );
}
`,
  },
  {
    path: "/components.tsx",
    code: `// Exercise 1: give ProfileCard props for name and role, and render them.
export function ProfileCard() {
  return (
    <section className="card" style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, maxWidth: 320 }}>
      <h2 className="name">Someone</h2>
      <p className="role">Some role</p>
    </section>
  );
}
`,
  },
];

const solutionFiles = [
  {
    path: "/App.tsx",
    code: `import { ProfileCard } from "./components";

export default function App() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Team</h1>
      <ProfileCard
        name="Ada Lovelace"
        role="Staff Engineer"
        skills={["React", "TypeScript", "Next.js"]}
      />
    </main>
  );
}
`,
  },
  {
    path: "/components.tsx",
    code: `import { useState } from "react";

interface ProfileCardProps {
  name: string;
  role: string;
  skills: string[];
}

export function ProfileCard({ name, role, skills }: ProfileCardProps) {
  const [following, setFollowing] = useState(false);

  return (
    <section
      className="card"
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, maxWidth: 320 }}
    >
      <h2 className="name">{name}</h2>
      <p className="role">{role}</p>
      <ul className="skills">
        {skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <button onClick={() => setFollowing(!following)}>
        {following ? "Following" : "Follow"}
      </button>
    </section>
  );
}
`,
  },
];

const lesson: Lesson = {
  id: "m1-l2",
  title: "React essentials: components, props & state",
  description:
    "The three React ideas Next.js is built on, how re-rendering actually works, and why Server Components can't hold state.",
  durationMin: 35,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Props: a reusable ProfileCard",
      difficulty: "easy",
      instructions: `Give \`ProfileCard\` two props — \`name\` and \`role\` — and render them in the existing \`h2.name\` and \`p.role\` elements. Then pass **Ada Lovelace** / **Staff Engineer** from \`App.tsx\`.`,
      validation: [
        { type: "dom-text", selector: "h2.name", includes: "Ada Lovelace", message: "The card shows the name passed via props" },
        { type: "dom-text", selector: "p.role", includes: "Staff Engineer", message: "The card shows the role passed via props" },
        { type: "code-regex", file: "/App.tsx", regex: "name=", message: "App.tsx passes the name as a prop" },
      ],
      hint: "function ProfileCard({ name, role }: { name: string; role: string }) { ... }",
    },
    {
      id: "ex2",
      title: "State: a Follow button",
      difficulty: "medium",
      instructions: `Add a \`<button>\` to the card. Using \`useState\`, make it toggle between the labels **Follow** and **Following** when clicked. Import \`useState\` from \`react\`.`,
      validation: [
        { type: "dom-exists", selector: ".card button", message: "The card contains a button" },
        { type: "code-includes", file: "/components.tsx", pattern: "useState", message: "The button uses useState" },
        { type: "code-includes", file: "/components.tsx", pattern: "onClick", message: "The button has an onClick handler" },
      ],
      hint: "const [following, setFollowing] = useState(false); label with {following ? \"Following\" : \"Follow\"}",
    },
    {
      id: "ex3",
      title: "Lists: render skills from a prop",
      difficulty: "hard",
      instructions: `Add a \`skills: string[]\` prop and render it as \`<ul className="skills">\` with one \`<li>\` per skill (don't forget \`key\`). Pass at least three skills from \`App.tsx\`.`,
      validation: [
        { type: "dom-count", selector: "ul.skills li", min: 3, message: "The skills list renders at least 3 items" },
        { type: "code-includes", file: "/components.tsx", pattern: ".map(", message: "Skills are rendered with .map()" },
        { type: "code-includes", file: "/components.tsx", pattern: "key=", message: "Each skill <li> has a key" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "What happens when you call a state setter like setCount(1)?",
      options: [
        "The variable changes immediately and the DOM updates synchronously",
        "React stores the new value and schedules a re-render; the component function runs again with the new value",
        "The DOM node is mutated directly without re-running the component",
        "Nothing until you call render() manually",
      ],
      answerIndex: 1,
      explanation:
        "Setters don't mutate anything in place — they update React's internal memory and queue a re-render.",
    },
    {
      id: "q2",
      type: "code-prediction",
      question: "What does this log after the button is clicked once?",
      code: `const [count, setCount] = useState(0);\n\nfunction handleClick() {\n  setCount(count + 1);\n  console.log(count);\n}`,
      options: ["1", "0", "undefined", "It throws an error"],
      answerIndex: 1,
      explanation:
        "State updates apply on the *next* render. Inside the same event handler, count is still the value from the current render: 0.",
    },
    {
      id: "q3",
      type: "tf",
      question: "A child component is allowed to modify the props it receives.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation:
        "Props are read-only. Data flows down; if a child needs to change data, the parent passes down a callback.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "This list re-renders incorrectly when items are reordered. What's the bug?",
      code: `{items.map((item, i) => (\n  <li key={i}>{item.name}</li>\n))}`,
      options: [
        "You can't use .map() inside JSX",
        "The array index is used as the key, so React misidentifies items when order changes",
        "key must be a number, not a variable",
        "<li> elements can't have keys",
      ],
      answerIndex: 1,
      explanation:
        "Index keys break identity tracking on reorder/insert/delete. Use a stable unique value like item.id.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why can't a Server Component use useState?",
      options: [
        "It can, but only in production builds",
        "useState is deprecated in Next.js",
        "Server Components render once per request on the server — there is no later moment for state to change and trigger a re-render",
        "Server memory is too expensive",
      ],
      answerIndex: 2,
      explanation:
        "State exists to change over time in a running UI. A Server Component's life ends when the HTML is sent.",
    },
  ],
  keyTakeaways: [
    "Components are functions returning JSX descriptions; React diffs descriptions and patches the DOM.",
    "Props flow down and are read-only; state is per-component memory that triggers re-renders.",
    "Never mutate state — create new objects/arrays so React can detect the change.",
    "In Next.js, state and effects only exist in Client Components.",
  ],
  cheatSheet: `
| API | Purpose |
| --- | --- |
| \`function Comp(props)\` | Define a component |
| \`{expr}\` in JSX | Embed JavaScript |
| \`useState(initial)\` | \`[value, setter]\` pair |
| \`list.map(x => <li key={x.id}/>)\` | Render lists |
| \`onClick={fn}\` | Attach events (pass the function, don't call it) |
`,
  interviewQuestions: [
    "Explain the virtual DOM and reconciliation in your own words.",
    "Why are props immutable, and what problem does one-way data flow solve?",
    "Why does setCount(count + 1) called twice in one handler only increment once? How do you fix it?",
    "When would you lift state up, and when is it a smell?",
    "Why are array indexes bad keys?",
    "What's the difference between derived data and state, and why does it matter?",
  ],
};

export default lesson;
