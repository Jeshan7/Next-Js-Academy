import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Three of the most common performance killers in a web app are the same three things on nearly every page: an image that shifts the layout while it loads, a font that blocks text from painting until it downloads, and a third-party script that ties up the main thread before the page is interactive. Next.js ships a built-in answer to each — \`next/image\`, \`next/font\` and \`next/script\` — as framework primitives instead of manual tuning.

## Why this exists — the problem

A plain \`<img>\` tag has no idea how big the image will be until it downloads, so the browser reserves zero space for it — when it finally loads, everything below it jumps. A plain \`@import\` or \`<link>\` font request goes to an external host, blocking text render until that network round trip completes (and depends on that host staying up). A plain \`<script src="...">\` for a third-party widget parses and executes synchronously by default, delaying the point where the page responds to input. None of these are Next.js-specific problems, but Next.js is in a position to fix all three automatically, because it controls both the build and the render pipeline.

## How it works internally

### next/image: reserved space, automatic negotiation

\`\`\`tsx
import Image from "next/image";

<Image src="/hero.jpg" alt="Product hero" width={800} height={450} priority />
\`\`\`

\`next/image\` requires either **both \`width\` and \`height\`**, or \`fill\` (to size against a positioned parent). This isn't a style preference — it's the mechanism that prevents layout shift: the browser reserves the correct box for the image *before* any bytes arrive, so nothing else on the page has to move when it finishes loading. Behind the scenes, Next.js also resizes the image to the sizes actually needed and serves a modern format (like WebP or AVIF) when the browser supports it, without you maintaining multiple exported files by hand.

\`priority\` tells Next.js to skip lazy-loading and start fetching this image immediately — reserved for whatever image is above the fold on first paint (a hero image, an LCP candidate). Every other \`<Image>\` lazy-loads by default, which is the right default for anything the user has to scroll to see.

### next/font: self-hosting instead of an external request

\`\`\`tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
\`\`\`

This looks like it's fetching from Google Fonts at request time, but it isn't: \`next/font\` downloads the font file **at build time** and serves it from your own domain alongside your other static assets. That's the same "no CDN dependencies" principle this whole platform is built on (this app runs fully offline after install) — a font is just another asset your build owns outright, with no runtime request to a third party and no risk of that third party being slow or down. \`next/font/local\` does the same for a font file you already have.

### next/script: choosing when a third-party script runs

\`\`\`tsx
import Script from "next/script";

<Script src="https://widget.example.com/embed.js" strategy="lazyOnload" />
\`\`\`

Three loading strategies, in order of urgency:

- \`beforeInteractive\` — loads and executes before any page JavaScript is interactive. Reserve this for scripts the page genuinely can't function without (a critical polyfill, bot-detection required before rendering). Overusing it defeats the purpose — it blocks interactivity just like a naive \`<script>\` tag.
- \`afterInteractive\` (the default) — loads as soon as the page is interactive. Right for most analytics and tag-manager scripts that should run soon but don't gate anything visible.
- \`lazyOnload\' — loads during idle time, after everything else. Right for a chat widget, a social share button, or anything genuinely non-critical to the first interaction.

::diagram{asset-optimization-timeline}

Third-party scripts are a common performance killer specifically because they're usually added without this kind of intentionality — a marketing tag manager pulled in with a plain \`<script>\` tag executes exactly as urgently as your own application code, competing with it for the same main thread.

## The sandbox in this lesson

The sandbox's \`next/image\` shim (in \`lib/sandbox/runtime.ts\`) already exists — it renders a real \`<img>\` with whatever props you pass, stripping only \`priority\`/\`fill\` (which have no visual effect worth simulating here, since there's no real network to prioritize against). This lesson's exercises use that shim directly with explicit \`width\`/\`height\`. Since there's no real network timing to measure in the sandbox, the "layout shift" comparison is simulated visually instead: an unsized \`<img>\` example (no reserved space) sits next to a properly-sized \`next/image\` example (space reserved up front), so the difference is visible without needing real bytes to arrive slowly.

## Common mistakes

- **Marking every image \`priority\`.** If everything is high-priority, nothing is — reserve it for the one or two images visible without scrolling on first paint.
- **Loading an external font from a CDN instead of \`next/font\`.** That reintroduces exactly the external dependency (and render-blocking request) the API exists to remove.
- **Defaulting every third-party script to \`beforeInteractive\`.** That strategy should be rare; most scripts belong at \`afterInteractive\` or \`lazyOnload\`.
- **Omitting \`width\`/\`height\` on \`next/image\` because "the CSS handles sizing."** The dimensions aren't just styling — they're what lets the browser reserve space before the image has loaded at all.

## Best practices

- Use \`priority\` only for the actual largest-contentful-paint candidate, typically one image per page.
- Prefer \`next/font\` over any external font request, for both Google-hosted and local font files.
- Default third-party scripts to \`afterInteractive\`; move to \`lazyOnload\` for anything not needed immediately; reserve \`beforeInteractive\` for genuine blockers only.
- Always supply \`width\`/\`height\` (or \`fill\` with a sized parent) on every \`next/image\` — treat a missing pair as a bug, not a style choice.

## Performance considerations

These three APIs target three different metrics: \`next/image\`'s \`width\`/\`height\` contract targets **Cumulative Layout Shift**, \`next/font\`'s build-time self-hosting removes a render-blocking request that hurts **First Contentful Paint**, and \`next/script\`'s strategies target **Total Blocking Time** / **Interaction to Next Paint** by controlling when third-party code competes for the main thread. Optimizing one doesn't substitute for the others — a page can have a perfectly sized hero image and still feel slow because of a poorly-scheduled analytics script.
`;

const heroStarter = `// Hero.tsx
// next/image (sandbox shim) requires width + height (or fill) — that pair
// is what lets the browser reserve space before the image loads.
import Image from "next/image";

export default function Hero() {
  return (
    <div className="hero">
      {/* TODO Exercise 1: add width={800} height={450} so the image has a
          reserved box before it loads. */}
      <Image className="hero-image" src="/hero.jpg" alt="Product hero" priority />
    </div>
  );
}
`;

const heroSolution = `import Image from "next/image";

export default function Hero() {
  return (
    <div className="hero">
      <Image className="hero-image" src="/hero.jpg" alt="Product hero" width={800} height={450} priority />
    </div>
  );
}
`;

const scriptStarter = `// ScriptStrategy.tsx
// A chat widget is not needed for the first interaction — it should load
// during idle time, after everything else on the page.
type Strategy = "beforeInteractive" | "afterInteractive" | "lazyOnload";

// TODO Exercise 2: set this to the strategy appropriate for a non-critical
// chat widget script.
const chatWidgetStrategy: Strategy = "beforeInteractive";

export default function ScriptStrategy() {
  return (
    <p className="script-strategy">
      Chat widget loads with strategy: <strong>{chatWidgetStrategy}</strong>
    </p>
  );
}
`;

const scriptSolution = `type Strategy = "beforeInteractive" | "afterInteractive" | "lazyOnload";

const chatWidgetStrategy: Strategy = "lazyOnload";

export default function ScriptStrategy() {
  return (
    <p className="script-strategy">
      Chat widget loads with strategy: <strong>{chatWidgetStrategy}</strong>
    </p>
  );
}
`;

const shiftDemoStarter = `// LayoutShiftDemo.tsx
// Left panel: an unsized plain <img> — no reserved space, so the browser
// has nothing to lay out until the image loads (this panel is read-only,
// for contrast). Right panel: your job is to size it properly.
import Image from "next/image";

export default function LayoutShiftDemo() {
  return (
    <div className="shift-demo">
      <div className="shift-panel unsized">
        <p>Unoptimized — no width/height reserved</p>
        <img src="/thumb.jpg" alt="Unsized example" />
      </div>
      <div className="shift-panel sized">
        <p>Optimized — space reserved up front</p>
        {/* TODO Exercise 3: add width={300} height={200} to this Image so
            the box is reserved before the image ever loads. */}
        <Image className="sized-image" src="/thumb.jpg" alt="Sized example" />
      </div>
    </div>
  );
}
`;

const shiftDemoSolution = `import Image from "next/image";

export default function LayoutShiftDemo() {
  return (
    <div className="shift-demo">
      <div className="shift-panel unsized">
        <p>Unoptimized — no width/height reserved</p>
        <img src="/thumb.jpg" alt="Unsized example" />
      </div>
      <div className="shift-panel sized">
        <p>Optimized — space reserved up front</p>
        <Image className="sized-image" src="/thumb.jpg" alt="Sized example" width={300} height={200} />
      </div>
    </div>
  );
}
`;

const appCode = `import Hero from "./Hero";
import ScriptStrategy from "./ScriptStrategy";
import LayoutShiftDemo from "./LayoutShiftDemo";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Asset optimization</h1>
      <Hero />
      <ScriptStrategy />
      <LayoutShiftDemo />
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 7.2 sandbox
==================

next/image here is the sandbox's real shim from lib/sandbox/runtime.ts — it
renders an actual <img> and needs width/height like the real API. There's
no real network in the sandbox, so the layout-shift comparison is visual
(an unsized panel next to a sized one) rather than timed.

1. Add width/height to the hero Image so its box is reserved up front.
2. Set the correct next/script loading strategy for a non-critical widget.
3. Size the second LayoutShiftDemo panel's Image the same way as the hero.
`,
  },
  { path: "/Hero.tsx", code: heroStarter },
  { path: "/ScriptStrategy.tsx", code: scriptStarter },
  { path: "/LayoutShiftDemo.tsx", code: shiftDemoStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/Hero.tsx", code: heroSolution },
  { path: "/ScriptStrategy.tsx", code: scriptSolution },
  { path: "/LayoutShiftDemo.tsx", code: shiftDemoSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m7-l2",
  title: "Image, font and script optimization",
  description:
    "next/image's width/height contract and priority, next/font's build-time self-hosting, next/script's loading strategies, and why unmanaged third-party assets are a common performance killer.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Reserve space for the hero image",
      difficulty: "easy",
      instructions: `In \`Hero.tsx\`, add \`width={800}\` and \`height={450}\` to the \`<Image>\`. This is the pair that lets the browser reserve the image's box before it has loaded, preventing layout shift.`,
      validation: [
        { type: "code-regex", file: "/Hero.tsx", regex: "width=\\{800\\}", message: "The hero Image has an explicit width" },
        { type: "code-regex", file: "/Hero.tsx", regex: "height=\\{450\\}", message: "The hero Image has an explicit height" },
        { type: "dom-exists", selector: "img.hero-image[width]", message: "The rendered image carries a width attribute" },
      ],
      hint: `<Image className="hero-image" src="/hero.jpg" alt="Product hero" width={800} height={450} priority />`,
    },
    {
      id: "ex2",
      title: "Pick the right loading strategy",
      difficulty: "medium",
      instructions: `In \`ScriptStrategy.tsx\`, set \`chatWidgetStrategy\` to \`"lazyOnload"\` — a chat widget isn't needed for the first interaction, so it should load during idle time rather than competing with the page for the main thread early on.`,
      validation: [
        { type: "code-includes", file: "/ScriptStrategy.tsx", pattern: 'const chatWidgetStrategy: Strategy = "lazyOnload"', message: "chatWidgetStrategy is set to lazyOnload" },
        { type: "dom-text", selector: "p.script-strategy", includes: "lazyOnload", message: "The rendered strategy reflects lazyOnload" },
      ],
      hint: `const chatWidgetStrategy: Strategy = "lazyOnload";`,
    },
    {
      id: "ex3",
      title: "Fix the second layout-shift panel",
      difficulty: "hard",
      instructions: `In \`LayoutShiftDemo.tsx\`, add \`width={300}\` and \`height={200}\` to the "sized" panel's \`<Image>\`. Compare it against the unsized panel next to it, which has no reserved space at all.`,
      validation: [
        { type: "code-regex", file: "/LayoutShiftDemo.tsx", regex: "width=\\{300\\}", message: "The sized panel's Image has an explicit width" },
        { type: "code-regex", file: "/LayoutShiftDemo.tsx", regex: "height=\\{200\\}", message: "The sized panel's Image has an explicit height" },
        { type: "dom-exists", selector: "img.sized-image[height]", message: "The sized panel's image carries a height attribute" },
      ],
      hint: `<Image className="sized-image" src="/thumb.jpg" alt="Sized example" width={300} height={200} />`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Why does next/image require both width and height (or fill)?",
      options: [
        "It's purely a styling convenience",
        "So the browser can reserve the correct box for the image before it loads, preventing layout shift",
        "To generate a placeholder blur automatically, unrelated to layout",
        "Because next/image can't infer image dimensions at all",
      ],
      answerIndex: 1,
      explanation: "The width/height (or fill) contract is the mechanism that reserves space up front — the core fix for layout shift caused by images.",
    },
    {
      id: "q2",
      type: "tf",
      question: "next/font fetches font files from Google's servers at request time, the same as a <link> tag would.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "next/font downloads the font file at build time and self-hosts it from your own domain — no runtime request to an external font CDN.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "A non-critical analytics script is loaded with strategy=\"beforeInteractive\". What's the effect?",
      code: `<Script src="https://analytics.example.com/tag.js" strategy="beforeInteractive" />`,
      options: [
        "It loads lazily during idle time, same as lazyOnload",
        "It loads and executes before the page becomes interactive, delaying interactivity for a script that doesn't need that urgency",
        "It has no effect since beforeInteractive is the default",
        "It fails to load at all",
      ],
      answerIndex: 1,
      explanation: "beforeInteractive is reserved for scripts the page genuinely can't function without — using it for a non-critical script needlessly blocks interactivity.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "Every <Image> on a page is marked priority=\"true\" so images 'load faster.' What's wrong with this approach?",
      options: [
        "priority has no effect in Next.js",
        "If everything is marked priority, nothing is prioritized over anything else — it should be reserved for the actual above-the-fold LCP candidate",
        "priority only works on next/font, not next/image",
        "This is correct and recommended for every image",
      ],
      answerIndex: 1,
      explanation: "priority skips lazy-loading to fetch immediately — meant for the one or two images visible without scrolling. Applying it everywhere removes its usefulness.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Which Web Vitals metric does next/font's build-time self-hosting most directly help?",
      options: [
        "Cumulative Layout Shift, exclusively",
        "First Contentful Paint, by removing a render-blocking external font request",
        "Total Blocking Time, by deferring script execution",
        "It has no measurable effect on any metric",
      ],
      answerIndex: 1,
      explanation: "Self-hosting the font at build time removes the external network request that would otherwise block text from painting, helping First Contentful Paint.",
    },
  ],
  keyTakeaways: [
    "next/image's width/height (or fill) contract reserves layout space before the image loads, targeting Cumulative Layout Shift.",
    "priority should be reserved for the actual above-the-fold LCP image — overusing it defeats its purpose.",
    "next/font self-hosts font files at build time, removing an external, render-blocking font request entirely.",
    "next/script's beforeInteractive/afterInteractive/lazyOnload strategies control when third-party code competes with your own for the main thread.",
    "Each API targets a different performance metric — fixing one doesn't substitute for the others.",
  ],
  cheatSheet: `
| Concern | API | Key prop/detail |
| --- | --- | --- |
| Image layout shift | \`next/image\` | \`width\`/\`height\` or \`fill\` — required |
| Above-the-fold image | \`next/image\` | \`priority\` — use sparingly |
| Font render-blocking | \`next/font/google\` or \`next/font/local\` | self-hosted at build time |
| Script timing | \`next/script\` | \`strategy: "beforeInteractive" \\| "afterInteractive" \\| "lazyOnload"\` |
| Default script urgency | \`next/script\` | \`afterInteractive\` (the default) |
| Non-critical script | \`next/script\` | \`strategy="lazyOnload"\` |
`,
  interviewQuestions: [
    "Why does next/image require width/height or fill, and what specific problem does that solve?",
    "When would you use priority on an Image, and why shouldn't you use it on every image?",
    "How does next/font differ from linking a font from an external CDN?",
    "Walk through the three next/script loading strategies and when each is appropriate.",
    "Why are unmanaged third-party scripts a common performance killer, even though they're 'just a script tag'?",
    "Which specific Web Vitals metric does each of next/image, next/font, and next/script most directly target?",
  ],
};

export default lesson;
