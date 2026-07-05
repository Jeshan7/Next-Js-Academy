import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every form so far in this module has assumed the submitted data is basically fine. Real forms need validation — but validation happens in two genuinely different places that serve two different purposes, and conflating them is one of the most common mistakes in web development: **client-side validation is a UX nicety; server-side validation is the actual security boundary.**

## Why this exists — the problem

It's tempting to write validation once, in the browser, and call it done — the form already blocks empty fields, so why check again? Because **anything running in the browser is optional from the server's point of view.** A user can disable JavaScript, edit the DOM, or skip the browser entirely and send a crafted request straight to your Server Action or route handler with \`curl\`. Client-side checks are a convenience for the well-behaved case; they enforce nothing for anyone who chooses to bypass them.

## How it works internally

### Two layers, two jobs

\`\`\`tsx
// client-side — fast feedback, entirely skippable
function validateClient(email: string) {
  if (!email.includes("@")) return "Enter a valid email";
  return null;
}
\`\`\`

\`\`\`tsx
"use server";
// server-side — authoritative, cannot be bypassed
export async function signUp(prevState: SignUpState, formData: FormData) {
  const email = formData.get("email");
  const errors: SignUpState["fieldErrors"] = {};
  if (typeof email !== "string" || !email.includes("@")) {
    errors.email = "Enter a valid email";
  }
  if (Object.keys(errors).length > 0) return { fieldErrors: errors };
  await db.users.create({ email });
  return { success: true };
}
\`\`\`

The client check exists purely so a well-behaved user gets instant feedback without waiting for a round trip. The server check exists because **it is the only check that's actually guaranteed to run.** Both can implement the exact same rule — that's fine and expected — but only one of them is load-bearing for security.

::diagram{validation-layers}

### Schema-validation as a pattern (conceptually)

Rather than hand-writing scattered \`if\` checks for every field, most real applications describe the shape and constraints of valid input once — as a schema — and validate the incoming data against it in one pass, producing a structured list or object of field-level errors instead of a single pass/fail. Conceptually:

\`\`\`
schema = {
  email: required, must contain "@"
  password: required, minimum 8 characters
}

result = validate(schema, formData)
// result: { valid: false, fieldErrors: { password: "Too short" } }
\`\`\`

The exact library used to express this doesn't matter for the concept — what matters is that validation logic lives in one declarative place instead of scattered across handlers, and produces errors keyed by field name, ready to render next to the exact input that caused them.

### Surfacing field-level errors back to the right input

A single generic "Something went wrong" message forces the user to guess which field was the problem. Returning errors keyed by field name lets the UI place each message exactly where it's relevant:

\`\`\`tsx
{state.fieldErrors?.email && (
  <p className="field-error" data-field="email">{state.fieldErrors.email}</p>
)}
\`\`\`

### Expected validation failures vs unexpected server errors

These are different failure modes and deserve different handling, same distinction as lesson 4.1's try/catch vs error.tsx, applied to mutations:

- **Expected validation failure** — the email is malformed, the password is too short. This is normal, everyday input from real users; return it as structured field errors and render it inline, calmly.
- **Unexpected server error** — the database is unreachable, an assumption in the code was violated. This should either throw (letting \`error.tsx\` or a surrounding boundary catch it) or be caught and surfaced as a generic, non-field-specific banner — never silently treated as if it were the user's fault.

Conflating the two — e.g., showing "Enter a valid email" when the real problem was a database outage — actively misleads the user into "fixing" something that was never broken.

## The sandbox in this lesson

\`actions.ts\` simulates a server-side \`signUp\` action returning \`{ fieldErrors }\` for expected validation problems, and throwing for a simulated unexpected failure (toggled from the UI) — standing in for the kind of outage a real backend occasionally has. The real authoritative check can't run in a browser sandbox without a server, but the same shape (field-keyed errors, thrown exceptions for genuine failures) mirrors exactly what a real Server Action would return.

## Common mistakes

- **Trusting client-side validation as the actual security check** — it's a UX layer only; the server must independently re-validate everything.
- **Returning one generic error string for a form with multiple fields** — the user can't tell what to fix without keying errors to field names.
- **Treating an unexpected server error as if it were a validation failure** — this misleads users into thinking their input was wrong when the actual problem was on the server.

## Best practices

- Duplicate simple validation rules on the client for responsiveness, but always re-check everything on the server — never trust that the client's check ran.
- Key returned errors by field name so the UI can render each one next to its input.
- Keep a clear code path split between "return structured errors" (expected) and "throw" (unexpected) inside every action.

## Performance considerations

Client-side validation avoids unnecessary round trips for obviously-invalid input, saving the user a wait and the server a wasted request — but it's an optimization on top of the server check, never a replacement for it.
`;

const actionsCode = `// actions.ts — READ-ONLY. Simulates a server-side sign-up validation.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SignUpState = {
  fieldErrors?: { email?: string; password?: string };
  success?: boolean;
};

// simulates an authoritative, server-side check — this is the one that
// actually matters, regardless of what the client already validated.
export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
  simulateOutage: boolean
): Promise<SignUpState> {
  await sleep(500); // pretend this is a network + database round trip

  if (simulateOutage) {
    // an unexpected failure — not the user's fault, don't blame a field
    console.log("[action] signUp: simulated server outage");
    throw new Error("Service temporarily unavailable");
  }

  const email = formData.get("email");
  const password = formData.get("password");
  const fieldErrors: SignUpState["fieldErrors"] = {};

  if (typeof email !== "string" || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address";
  }
  if (typeof password !== "string" || password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters";
  }

  if (Object.keys(fieldErrors).length > 0) {
    console.log("[action] signUp: validation failed", fieldErrors);
    return { fieldErrors };
  }

  console.log("[action] signUp: account created for", email);
  return { success: true };
}
`;

const formStarter = `// Exercises 1–3: client hint + server-authoritative validation.
import { useState } from "react";
import { signUp, SignUpState } from "./actions";

export default function SignUpForm() {
  const [state, setState] = useState<SignUpState>({});
  const [isPending, setIsPending] = useState(false);
  const [simulateOutage, setSimulateOutage] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientHint, setClientHint] = useState<string | null>(null);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    // TODO: fast, skippable client-side hint — set clientHint if the
    // value doesn't include "@", otherwise clear it.
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: build FormData, call signUp(state, formData, simulateOutage)
    // inside a try/catch — on success set state; on thrown error set
    // serverError (a generic, non-field message), not a field error.
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          type="checkbox"
          checked={simulateOutage}
          onChange={(e) => setSimulateOutage(e.target.checked)}
        />
        Simulate server outage
      </label>
      <div>
        <input name="email" onChange={handleEmailChange} placeholder="Email" />
        {clientHint && <p className="client-hint">{clientHint}</p>}
        {/* TODO: render state.fieldErrors?.email next to this field */}
      </div>
      <div>
        <input name="password" type="password" placeholder="Password" />
        {/* TODO: render state.fieldErrors?.password next to this field */}
      </div>
      <button type="submit" disabled={isPending}>Sign up</button>
      {serverError && <p className="server-error">{serverError}</p>}
      {state.success && <p className="signup-success">Account created!</p>}
    </form>
  );
}
`;

const formSolution = `import { useState } from "react";
import { signUp, SignUpState } from "./actions";

export default function SignUpForm() {
  const [state, setState] = useState<SignUpState>({});
  const [isPending, setIsPending] = useState(false);
  const [simulateOutage, setSimulateOutage] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientHint, setClientHint] = useState<string | null>(null);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientHint(e.target.value.includes("@") ? null : "Looks like this is missing an @");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsPending(true);
    setServerError(null);
    try {
      const result = await signUp(state, formData, simulateOutage);
      setState(result);
    } catch {
      setServerError("Something went wrong on our end — please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          type="checkbox"
          checked={simulateOutage}
          onChange={(e) => setSimulateOutage(e.target.checked)}
        />
        Simulate server outage
      </label>
      <div>
        <input name="email" onChange={handleEmailChange} placeholder="Email" />
        {clientHint && <p className="client-hint">{clientHint}</p>}
        {state.fieldErrors?.email && (
          <p className="field-error" data-field="email">{state.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <input name="password" type="password" placeholder="Password" />
        {state.fieldErrors?.password && (
          <p className="field-error" data-field="password">{state.fieldErrors.password}</p>
        )}
      </div>
      <button type="submit" disabled={isPending}>Sign up</button>
      {serverError && <p className="server-error">{serverError}</p>}
      {state.success && <p className="signup-success">Account created!</p>}
    </form>
  );
}
`;

const appCode = `import SignUpForm from "./SignUpForm";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Validation & error handling</h1>
      <SignUpForm />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 5.4 sandbox
==================

actions.ts simulates an authoritative server-side signUp check that
returns per-field errors for invalid input, and throws for a simulated
server outage (toggle it from the UI).

1. Add a fast, skippable client-side hint for the email field.
2. Call signUp and store its result; render fieldErrors next to each field.
3. Check "Simulate server outage" and confirm a generic, non-field
   error banner appears instead of a misleading field error.
`,
  },
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/SignUpForm.tsx", code: formStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/actions.ts", readOnly: true, code: actionsCode },
  { path: "/SignUpForm.tsx", code: formSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m5-l4",
  title: "Validation & error handling",
  description:
    "Client-side validation as a UX nicety vs server-side validation as the actual security boundary, schema-validation patterns, surfacing field-level errors, and distinguishing expected failures from unexpected server errors.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Add a client-side hint",
      difficulty: "easy",
      instructions: `In \`handleEmailChange\`, set \`clientHint\` to a short message when the typed value doesn't include \`"@"\`, and clear it otherwise. Render it in a \`<p className="client-hint">\`.`,
      validation: [
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "setClientHint", message: "handleEmailChange sets clientHint" },
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "includes(\"@\")", message: "The client hint checks for an @ character" },
      ],
      hint: `setClientHint(e.target.value.includes("@") ? null : "Looks like this is missing an @");`,
    },
    {
      id: "ex2",
      title: "Call the server-authoritative check",
      difficulty: "medium",
      instructions: `In \`handleSubmit\`, build a \`FormData\`, call \`await signUp(state, formData, simulateOutage)\` inside a \`try\`, and store the result with \`setState\`. Submit with a short password and confirm a field error renders for the password.`,
      validation: [
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "signUp(state, formData, simulateOutage)", message: "handleSubmit calls signUp with state, formData, and simulateOutage" },
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "fieldErrors?.password", message: "SignUpForm renders state.fieldErrors?.password" },
      ],
    },
    {
      id: "ex3",
      title: "Distinguish server outages from validation errors",
      difficulty: "hard",
      instructions: `In the \`catch\` branch, set \`serverError\` to a generic message — not a field error. Check "Simulate server outage", submit the form, and confirm \`<p className="server-error">\` renders instead of any field-specific message.`,
      validation: [
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "setServerError", message: "The catch branch sets serverError" },
        { type: "code-includes", file: "/SignUpForm.tsx", pattern: "catch", message: "handleSubmit has a catch branch around the signUp call" },
        { type: "dom-exists", selector: "p.server-error", message: "A server-error message can render (after simulating an outage)" },
      ],
      hint: `catch { setServerError("Something went wrong on our end — please try again."); }`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Why is server-side validation the actual security boundary, and client-side validation only a UX nicety?",
      options: [
        "Server-side validation runs faster",
        "Client-side code is fully under the user's control and can be bypassed (disabled JS, edited DOM, direct requests) — the server check is the only one guaranteed to run",
        "Client-side validation is deprecated",
        "There's no real difference between the two",
      ],
      answerIndex: 1,
      explanation: "A user can always bypass anything running in their own browser; the server is the only place a check can't be skipped.",
    },
    {
      id: "q2",
      type: "tf",
      question: "It's acceptable to implement a validation rule only on the client if the same form always goes through your own UI.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Anyone can send a request directly to the server endpoint, bypassing your UI entirely — the server must independently enforce every rule.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "Why return errors keyed by field name (e.g. { email: '...' }) instead of one generic error string?",
      options: [
        "It's required by TypeScript",
        "It lets the UI render each specific error message next to the exact input that caused it, instead of forcing the user to guess",
        "It makes the network request smaller",
        "Field-keyed errors are only needed for password fields",
      ],
      answerIndex: 1,
      explanation: "Field-level errors let each message appear exactly where it's relevant, which is far clearer than one form-wide error for a multi-field form.",
    },
    {
      id: "q4",
      type: "code-prediction",
      question: "A database outage occurs during signUp, but the code catches the exception and shows it as fieldErrors.email = 'Enter a valid email'. What's wrong with this?",
      code: `try {\n  await db.users.create(data);\n} catch {\n  return { fieldErrors: { email: "Enter a valid email" } };\n}`,
      options: [
        "Nothing — any error can be shown as a field error",
        "It misleads the user into thinking their input was wrong, when the actual problem was an unrelated server failure — expected validation failures and unexpected errors need different handling",
        "The code has a syntax error",
        "Field errors can only apply to password fields",
      ],
      answerIndex: 1,
      explanation: "Conflating an unexpected server error with an expected validation failure sends the user down the wrong path — 'fixing' an email that was never invalid.",
    },
    {
      id: "q5",
      type: "debugging",
      question: "A signup form's client-side check correctly blocks empty fields, but a request sent directly to the server (bypassing the UI) with an empty email still creates a broken account. What's the fix?",
      options: [
        "Add more client-side checks",
        "Add the same (or stricter) validation inside the server-side action itself — the client check alone does not protect the server",
        "Disable the endpoint entirely",
        "Nothing can be done — this is expected behavior",
      ],
      answerIndex: 1,
      explanation: "This is exactly the scenario server-side validation exists to prevent — the client check was bypassed, so only a server-side check can catch it.",
    },
  ],
  keyTakeaways: [
    "Client-side validation is a UX convenience that can always be bypassed; server-side validation is the only check that actually enforces anything.",
    "Schema-style validation validates the whole shape of the input in one declarative pass, producing field-keyed errors instead of scattered if-checks.",
    "Field-level errors, keyed by field name, let the UI render each message next to the exact input that caused it.",
    "Expected validation failures (return structured errors) and unexpected server errors (throw or show a generic banner) need different handling — never conflate the two.",
  ],
  cheatSheet: `
| Layer | Purpose | Can be bypassed? |
| --- | --- | --- |
| Client-side validation | Fast, instant feedback | Yes — always |
| Server-side validation | Authoritative enforcement | No |
| Expected validation failure | Return \`{ fieldErrors }\`, render inline | — |
| Unexpected server error | Throw / catch, show a generic banner | — |
| Field-keyed errors | Render each message next to its input | — |
`,
  interviewQuestions: [
    "Why can't client-side validation alone be trusted as a security measure?",
    "What's the benefit of a schema-based validation approach over scattered if-checks?",
    "How should you structure returned errors so the UI can render them next to the correct fields?",
    "What's the difference between an expected validation failure and an unexpected server error, and how should each be handled?",
    "What could go wrong if a server error were shown to the user as if it were a field-specific validation message?",
    "How would you design a form's error state to support both field-level errors and a general server-error banner at once?",
  ],
};

export default lesson;
