import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every exercise in this curriculum has been graded automatically — a rule checks your code, or a rule checks the rendered DOM, and you get a pass/fail. That's not incidental to the platform; it's a small, concrete example of the same idea real test suites are built on: **deterministic assertions against code and against rendered output**. This lesson is about applying that idea deliberately, to your own Next.js application, with real tools.

## Why this exists — the problem

Without tests, correctness lives entirely in a person's head (or in the hope that manual clicking through the app catches regressions). As an app grows, that doesn't scale — a change to a shared utility can silently break a dozen call sites, and nobody notices until production. Automated tests are how a codebase remembers what it's supposed to do, and catches the moment that stops being true.

The trap is over-applying one test type everywhere. Not every kind of test is worth writing for every kind of code — the cost/confidence trade-off is different at each layer.

## How it works internally

### Where each test type earns its cost

::diagram{testing-pyramid}

- **Unit tests** — the base of the pyramid, and the cheapest to write and run. Target pure functions and utilities: a price calculator, a validation function, a date formatter. No rendering, no network, no DOM — just input in, output out. Write a lot of these; they're fast and pinpoint failures precisely.
- **Integration tests** — verify a component (or a few working together) behaves correctly: a form validates and submits, a list re-renders when its data changes. More setup than a unit test, fewer than an E2E test.
- **End-to-end (E2E) tests** — drive a real browser through a full user flow: log in, add an item to a cart, check out. The most expensive to write and the slowest to run, but the only layer that catches an integration failure between real pages, real routing, and a real backend. Write fewer of these, reserved for your most critical flows.

### Testing Server Components vs Client Components

This is where Next.js changes the calculus a little. A Server Component is, at its core, an async function that runs on the server and returns JSX — rendering it in isolation outside an actual Next.js server is awkward, because the tooling that does that rendering (and resolves \`params\`, \`searchParams\`, data fetches, etc.) is part of the framework itself, not something a plain test renderer replicates easily.

The practical answer: **don't try to unit-test the rendered output of a Server Component directly.** Instead, unit-test the plain functions it calls — the data-fetching function, the formatting logic, the business rule that decides what to display. If \`ProductPage\` calls \`getProduct(id)\` and \`formatPrice(product.price)\`, test \`getProduct\` and \`formatPrice\` directly as pure/async functions; you get most of the confidence without fighting the framework.

Client Components don't have this problem — they're ordinary React components, and standard component-testing approaches (rendering them, interacting with them, asserting on the result) apply exactly as they would in any React app.

### Mocking fetch and Server Actions

A unit test for a function that calls \`fetch\` shouldn't make a real network call — it's slow, flaky, and depends on an external service being up. The standard technique is to **replace \`fetch\` with a fake** for the duration of the test: a function with the same shape that returns a canned response, then restore the original afterward. The function under test never knows the difference — it still calls \`fetch(url)\` and gets back something with a \`.json()\` method.

Server Actions are tested the same way as any other async function: call the exported function directly with test arguments and assert on its return value or on the side effect it was supposed to cause (e.g., a mocked database call it was supposed to trigger) — no HTTP request or React tree involved.

### This platform's own validation is a miniature example

\`lib/sandbox/validate.ts\`, which has been grading every exercise in this curriculum, is itself a small illustration of the two families of assertion described above: \`code-includes\`/\`code-regex\` rules are **code-based assertions** (did the source contain the right pattern — no different in spirit from asserting a function's source or a snapshot), and \`dom-exists\`/\`dom-text\`/\`dom-count\` rules are **DOM-based assertions** (did the rendered output contain the right element/text/count — exactly what an integration test does against a rendered component). You've been using both kinds of test the whole time without necessarily naming them that way.

## The sandbox in this lesson

There's no real Jest, Vitest, or Playwright runtime available offline inside this browser tab — those depend on a Node.js process and, for Playwright, a full browser automation harness, neither of which exist inside an iframe. To make the *concept* of a unit test concrete anyway, this sandbox provides a tiny hand-rolled \`test\`/\`expect\` helper (\`testHelpers.ts\`, read-only) — conceptually similar to what \`console.assert\` gives you for free, just with clearer failure messages. **This is a teaching approximation only** — a real project should use Jest, Vitest, or a similar test runner for unit/integration tests, and Playwright or Cypress for E2E, not a hand-rolled helper like this one.

## Common mistakes

- **Writing E2E tests for logic a unit test could cover in milliseconds.** Reserve the expensive layer for what only it can verify — real cross-page, cross-system flows.
- **Trying to render a Server Component directly in a unit test.** Test the functions it calls instead; fighting the framework's own rendering pipeline in a test environment is a losing battle.
- **Letting a "unit" test hit a real network or database.** That's an integration or E2E concern in disguise — mock the boundary instead.
- **Forgetting to restore a mocked \`fetch\` (or other global) after a test.** A leaked mock silently breaks the *next* test that expects real behavior.

## Best practices

- Default to a unit test for any pure function; reach for integration/E2E only when the thing you're verifying genuinely can't be captured at the unit level.
- Test a Server Component's logic functions directly rather than its rendered output.
- Mock \`fetch\`/Server Actions at the boundary, and always restore the original after the test runs.
- Treat this platform's own \`code-*\`/\`dom-*\` validation rules as a working mental model for the two assertion styles you'll reach for in a real test suite.

## Performance considerations

A healthy test suite's total run time is dominated by how many tests live at the expensive end of the pyramid. A suite with a thousand unit tests and ten E2E tests runs in seconds; a suite with a thousand E2E tests can take longer than the deploy pipeline should reasonably wait for. Push confidence as far down the pyramid as the test still meaningfully verifies the thing you care about.
`;

const cartCode = `// cart.ts — READ-ONLY. Plain functions, exactly the kind a Server Component
// (or anything else) would call — these are what you write unit tests for,
// instead of trying to render a Server Component in a test environment.

export type CartItem = { price: number; quantity: number };

export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function applyDiscount(total: number, code: string): number {
  if (code === "SAVE10") return total * 0.9;
  return total;
}

// Simulates a Server Action or data-fetching function that calls fetch() —
// exactly the kind of boundary you'd mock in a real test instead of hitting
// a real network.
export async function fetchShippingRate(zip: string): Promise<number> {
  const res = await fetch(\`/api/shipping?zip=\${zip}\`);
  const data = await res.json();
  return data.rate;
}
`;

const testHelpersCode = `// testHelpers.ts — READ-ONLY. A hand-rolled stand-in for a real test
// runner's test()/expect() — conceptually similar to what console.assert
// gives you for free. Real projects use Jest, Vitest or Playwright instead;
// this exists only because no such runtime is available offline in a
// browser sandbox.

export type TestResult = { name: string; passed: boolean; message?: string };

const results: TestResult[] = [];

export async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (err) {
    results.push({
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(\`expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
      }
    },
  };
}

export function getResults() {
  return results;
}
`;

const cartTestStarter = `// cart.test.ts
// A hand-rolled unit test file. Real projects would name this
// cart.test.ts and run it with Jest/Vitest — here, runTests() is called
// directly by App.tsx since there's no test runner in the sandbox.
import { calculateTotal, applyDiscount, fetchShippingRate } from "./cart";
import { test, expect } from "./testHelpers";

export async function runTests() {
  await test("calculateTotal", () => {
    // TODO Exercise 1: assert that calculateTotal with two items
    // ({ price: 10, quantity: 2 } and { price: 5, quantity: 1 }) equals 25.
  });

  await test("applyDiscount", () => {
    // TODO Exercise 2: assert applyDiscount(100, "SAVE10") equals 90, and
    // assert applyDiscount(100, "NOPE") equals 100 (both in the same test).
  });

  await test("fetchShippingRate", async () => {
    // TODO Exercise 3: temporarily replace globalThis.fetch with a fake that
    // resolves an object with a json() method returning { rate: 7.5 },
    // call fetchShippingRate, assert the result equals 7.5, then restore
    // the original fetch — even if the assertion throws.
  });
}
`;

const cartTestSolution = `import { calculateTotal, applyDiscount, fetchShippingRate } from "./cart";
import { test, expect } from "./testHelpers";

export async function runTests() {
  await test("calculateTotal", () => {
    const total = calculateTotal([
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 },
    ]);
    expect(total).toBe(25);
  });

  await test("applyDiscount", () => {
    expect(applyDiscount(100, "SAVE10")).toBe(90);
    expect(applyDiscount(100, "NOPE")).toBe(100);
  });

  await test("fetchShippingRate", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      json: async () => ({ rate: 7.5 }),
    })) as typeof fetch;

    try {
      const rate = await fetchShippingRate("00000");
      expect(rate).toBe(7.5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
`;

const appCode = `import { useEffect, useState } from "react";
import { runTests } from "./cart.test";
import { getResults, type TestResult } from "./testHelpers";

export default function App() {
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    runTests().then(() => setResults(getResults()));
  }, []);

  function statusFor(name: string) {
    const r = results.find((result) => result.name === name);
    if (!r) return "pending";
    return r.passed ? "PASS" : \`FAIL: \${r.message}\`;
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Hand-rolled unit tests (sandbox simulation)</h1>
      <p>A real project would run these with Jest or Vitest — this sandbox has no test runtime, so results render directly in the page.</p>
      <p className="result-total">calculateTotal: {statusFor("calculateTotal")}</p>
      <p className="result-discount">applyDiscount: {statusFor("applyDiscount")}</p>
      <p className="result-shipping">fetchShippingRate: {statusFor("fetchShippingRate")}</p>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 7.3 sandbox
==================

There's no real Jest/Vitest/Playwright runtime available offline in a
browser sandbox, so testHelpers.ts provides a tiny hand-rolled test()/
expect() pair — enough to illustrate the unit-test layer concretely. Real
projects should use a real test runner instead.

1. Write the assertion for calculateTotal in cart.test.ts.
2. Write the assertions for applyDiscount (both the discounted and
   non-discounted cases).
3. Mock globalThis.fetch, call fetchShippingRate, assert on the result, and
   restore the original fetch afterward.
`,
  },
  { path: "/cart.ts", readOnly: true, code: cartCode },
  { path: "/testHelpers.ts", readOnly: true, code: testHelpersCode },
  { path: "/cart.test.ts", code: cartTestStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/cart.ts", readOnly: true, code: cartCode },
  { path: "/testHelpers.ts", readOnly: true, code: testHelpersCode },
  { path: "/cart.test.ts", code: cartTestSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m7-l3",
  title: "Testing Next.js applications",
  description:
    "Where unit, integration and E2E tests earn their cost, testing Server Components by testing the functions they call, mocking fetch and Server Actions, and this platform's own validation as a miniature example.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Unit test a pure function",
      difficulty: "easy",
      instructions: `In \`cart.test.ts\`, inside the \`"calculateTotal"\` test, call \`calculateTotal\` with two items ({ price: 10, quantity: 2 } and { price: 5, quantity: 1 }) and assert the result with \`expect(total).toBe(25)\`.`,
      validation: [
        { type: "code-includes", file: "/cart.test.ts", pattern: "calculateTotal(", message: "The test calls calculateTotal" },
        { type: "code-includes", file: "/cart.test.ts", pattern: ".toBe(25)", message: "The test asserts the total equals 25" },
        { type: "dom-text", selector: "p.result-total", includes: "PASS", message: "The calculateTotal test passes" },
      ],
      hint: `const total = calculateTotal([{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }]);\nexpect(total).toBe(25);`,
    },
    {
      id: "ex2",
      title: "Test both branches of applyDiscount",
      difficulty: "medium",
      instructions: `In the \`"applyDiscount"\` test, assert \`applyDiscount(100, "SAVE10")\` equals 90 and \`applyDiscount(100, "NOPE")\` equals 100 — covering both the discounted and non-discounted paths through the function.`,
      validation: [
        { type: "code-includes", file: "/cart.test.ts", pattern: ".toBe(90)", message: "The discounted case is asserted" },
        { type: "code-includes", file: "/cart.test.ts", pattern: ".toBe(100)", message: "The non-discounted case is asserted" },
        { type: "dom-text", selector: "p.result-discount", includes: "PASS", message: "The applyDiscount test passes" },
      ],
      hint: `expect(applyDiscount(100, "SAVE10")).toBe(90);\nexpect(applyDiscount(100, "NOPE")).toBe(100);`,
    },
    {
      id: "ex3",
      title: "Mock fetch for an async function",
      difficulty: "hard",
      instructions: `In the \`"fetchShippingRate"\` test, temporarily set \`globalThis.fetch\` to a fake async function resolving \`{ json: async () => ({ rate: 7.5 }) }\`, call \`fetchShippingRate\`, assert the result with \`expect(rate).toBe(7.5)\`, and restore the original \`fetch\` in a \`finally\` block so later tests aren't affected.`,
      validation: [
        { type: "code-includes", file: "/cart.test.ts", pattern: "globalThis.fetch =", message: "The test replaces globalThis.fetch with a fake" },
        { type: "code-includes", file: "/cart.test.ts", pattern: "finally", message: "The original fetch is restored in a finally block" },
        { type: "dom-text", selector: "p.result-shipping", includes: "PASS", message: "The fetchShippingRate test passes" },
      ],
      hint: `const originalFetch = globalThis.fetch;\nglobalThis.fetch = (async () => ({ json: async () => ({ rate: 7.5 }) })) as typeof fetch;\ntry {\n  const rate = await fetchShippingRate("00000");\n  expect(rate).toBe(7.5);\n} finally {\n  globalThis.fetch = originalFetch;\n}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Why is it awkward to unit-test a Server Component's rendered output directly?",
      options: [
        "Server Components can't be tested at all, under any approach",
        "Rendering a Server Component depends on framework machinery (params, data fetches) that a plain test renderer doesn't replicate — testing the functions it calls is more practical",
        "Server Components don't return JSX",
        "Only E2E tests can verify Server Component behavior",
      ],
      answerIndex: 1,
      explanation: "The practical approach is to unit-test the data/logic functions a Server Component calls, rather than fight the framework's own rendering pipeline in a test environment.",
    },
    {
      id: "q2",
      type: "tf",
      question: "A suite with far more E2E tests than unit tests is generally a healthier, faster-running suite.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "E2E tests are the slowest and most expensive layer — a healthy pyramid has far more unit tests at the base than E2E tests at the top.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A test calls a function that internally uses fetch(), without mocking it first. What's the risk?",
      code: `test("getRate", async () => {\n  const rate = await fetchShippingRate("00000");\n  expect(rate).toBe(7.5);\n});`,
      options: [
        "None — fetch always resolves instantly in tests",
        "The test makes a real network call, making it slow, flaky, and dependent on an external service being up",
        "TypeScript will refuse to compile this",
        "fetch is automatically mocked in every test file",
      ],
      answerIndex: 1,
      explanation: "Without mocking fetch, the test depends on a real network round trip — exactly what unit tests should avoid.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "After a test mocks globalThis.fetch, the next test in the file unexpectedly also receives the fake response instead of hitting the real mocked setup it expected. What's the likely cause?",
      options: [
        "Test runners always share fetch mocks across tests intentionally",
        "The previous test never restored the original fetch after mocking it",
        "fetch can only be mocked once per file, ever",
        "This is unrelated to mocking and is a flaky test framework bug",
      ],
      answerIndex: 1,
      explanation: "A mock that isn't restored (e.g., in a finally block) leaks into later tests — always restore the original implementation after the test that replaced it.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "How does this platform's own lib/sandbox/validate.ts relate to real test assertions?",
      options: [
        "It's unrelated — it's just UI logic for this app",
        "code-includes/code-regex rules are code-based assertions, and dom-exists/dom-text/dom-count rules are DOM-based assertions — the same two families real integration tests use",
        "It only performs DOM-based assertions, never code-based ones",
        "It replaces the need for real tests entirely",
      ],
      answerIndex: 1,
      explanation: "The two rule families mirror the two assertion styles used throughout real test suites: checking source code and checking rendered output.",
    },
  ],
  keyTakeaways: [
    "Unit tests target pure functions and are the cheapest, fastest layer; integration tests target component behavior; E2E tests drive full user flows and are the most expensive.",
    "Don't unit-test a Server Component's rendered output directly — test the plain functions it calls instead.",
    "Client Components test like any ordinary React component.",
    "Mock fetch/Server Actions at the boundary in unit tests, and always restore the original afterward.",
    "This platform's own code-*/dom-* validation rules mirror the two real assertion families: code-based and DOM-based.",
    "Real projects use Jest/Vitest/Playwright — the sandbox's hand-rolled test()/expect() only approximates the concept offline.",
  ],
  cheatSheet: `
| Layer | Targets | Cost | Real-world tool |
| --- | --- | --- | --- |
| Unit | Pure functions/utilities | Lowest | Jest, Vitest |
| Integration | Component behavior | Medium | React Testing Library |
| E2E | Full user flows | Highest | Playwright, Cypress |
| Server Component | The functions it calls, not its render | — | Jest/Vitest on the logic functions |
| Client Component | The component itself | — | React Testing Library |
| Mocking fetch | Replace, assert, restore | — | \`jest.fn()\` / \`vi.fn()\` in real tools |
`,
  interviewQuestions: [
    "How do you decide whether something deserves a unit, integration, or E2E test?",
    "Why is testing a Server Component's rendered output awkward, and what's the practical alternative?",
    "How would you test a Server Action without spinning up a real HTTP request?",
    "What's the risk of not restoring a mocked fetch after a test finishes?",
    "Why might a suite with thousands of E2E tests and few unit tests be a warning sign?",
    "How does this platform's own exercise validation illustrate code-based vs. DOM-based test assertions?",
  ],
};

export default lesson;
