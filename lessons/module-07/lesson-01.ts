import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

Every page you've built in this curriculum eventually ships as HTML. The \`<head>\` of that HTML — title, description, Open Graph tags, canonical URLs — is what search engines index and what social platforms read when a link gets pasted into a chat. The **Metadata API** is how the App Router generates that \`<head>\`, using the same file-and-component model you already know instead of hand-written \`<title>\` and \`<meta>\` tags scattered through your JSX.

## Why this exists — the problem

In the pages router, \`<head>\` content meant a \`next/head\` component manually placed inside each page, easy to forget, easy to duplicate, and awkward to merge across a shared layout. Worse, because it lived inside client-rendered JSX, search engine crawlers historically had to execute JavaScript to see it at all.

The App Router treats metadata as **data**, not markup: a page or layout exports a \`metadata\` object (or a \`generateMetadata\` function), and Next.js resolves the final \`<head>\` on the server before any HTML is sent. There's no tag to forget to render — the framework assembles it for you from whatever every layout and page on the path contributed.

## How it works internally

### Static metadata: the \`metadata\` export

\`\`\`tsx
// app/blog/page.tsx
export const metadata = {
  title: "Blog",
  description: "Engineering notes from the Acme team.",
};

export default function BlogPage() { /* ... */ }
\`\`\`

This works when the metadata doesn't depend on any data fetch or route param — it's known at build time, same spirit as a statically rendered page (Module 3).

### Dynamic metadata: \`generateMetadata\`

When metadata depends on the same \`params\` or data a page needs — a blog post's title, a product's description — export an async \`generateMetadata\` function instead of a static object. It receives the same \`params\` the page component receives, and can \`await\` the same data source:

\`\`\`tsx
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug); // the same fetch the page itself will make
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug); // deduped by request memoization (Module 4) — not a second network call
  return <article>{/* ... */}</article>;
}
\`\`\`

This mirrors the page's own data-fetching pattern exactly — it's an async function, it awaits \`params\`, and any \`fetch\` call inside it is deduped against the identical call in the page component by request memoization (Module 4's lesson on caching), so you don't pay for the data twice.

### Merging down the layout tree

::diagram{metadata-resolution}

This is the **same nesting model as Layouts** (Module 2): every \`layout.tsx\` and \`page.tsx\` on the path from the root can export metadata, and Next.js walks that path top-down, **merging** as it goes — a child's fields override a parent's fields of the same name, but fields the child doesn't specify are inherited untouched.

\`\`\`
app/layout.tsx        title: { template: "%s | Acme", default: "Acme" }, openGraph: { siteName: "Acme" }
  app/blog/layout.tsx  openGraph: { images: ["/og/blog-default.png"] }
    app/blog/[slug]/page.tsx  title: "Why Next.js Ships Less JavaScript", openGraph: { images: ["/og/post-123.png"] }
\`\`\`

The resolved result for that post's page: \`title\` becomes \`"Why Next.js Ships Less JavaScript | Acme"\` (the root's \`template\` wraps the page's plain string), \`openGraph.siteName\` is inherited from the root untouched, and \`openGraph.images\` is the post's own value — the more specific layer wins per field, not per object. Fields aren't merged deep by Next.js beyond one level for most keys — a child's \`openGraph\` object replaces the parent's key-by-key, which is exactly what the sandbox below reproduces.

### Open Graph and Twitter cards

\`openGraph\` and \`twitter\` fields describe how a shared link is unfurled by social platforms and chat apps:

\`\`\`ts
export const metadata = {
  title: "Why Next.js Ships Less JavaScript",
  openGraph: {
    title: "Why Next.js Ships Less JavaScript",
    images: ["/og/post-123.png"],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
  },
};
\`\`\`

These are just more metadata fields — they merge down the tree exactly the same way \`title\` and \`description\` do.

### \`sitemap.ts\` and \`robots.ts\`

Two more file conventions round out SEO, both living at the root of \`app/\`:

- \`app/sitemap.ts\` exports a function returning an array of \`{ url, lastModified, ... }\` entries — Next.js serves it as \`/sitemap.xml\`.
- \`app/robots.ts\` exports a function returning crawl rules — served as \`/robots.txt\`.

Both are plain TypeScript functions, not markup — for a route with hundreds of dynamic pages (blog posts, products), \`sitemap.ts\` typically awaits the same data source the pages use to build the full URL list.

### Why SEO here is mostly "get the HTML right"

Because Server Components render real HTML on the server *before* anything reaches the browser (Module 3), a crawler requesting any page gets the fully-formed \`<head>\` and body on the very first response — no JavaScript execution required to see it. SEO for this kind of app is less about bolting on crawler-specific tricks and more about the metadata resolution described above being correct: right title, right description, right canonical URL, per route.

## The sandbox in this lesson

A real \`<head>\` can't be inspected by a crawler inside this browser tab, and there's no real search engine to submit a sitemap to. Instead, this sandbox simulates **metadata resolution as a plain object merge**: \`layouts.ts\` (read-only) defines a fake layout tree as an array of metadata objects, and you'll implement \`resolveMetadata\`, a function that walks that array top-down and merges each layer — the exact algorithm Next.js runs internally, made inspectable as ordinary data. Validation asserts on the shape of the resulting object, not on any DOM query against a real \`<head>\`.

## Common mistakes

- **Repeating the page's data fetch just for metadata, unaware it's deduped.** \`generateMetadata\` and the page component can both \`await\` the same \`fetch\` call — request memoization (Module 4) collapses it to one network call, not two.
- **Expecting a child layer's \`openGraph\` object to deep-merge every nested field.** It replaces the parent's \`openGraph\` key-by-key at the top level — if a child sets \`openGraph.images\` but omits \`openGraph.siteName\`, the parent's \`siteName\` is inherited, but assuming *everything* nested merges automatically leads to surprises.
- **Forgetting the title template only applies to a plain string \`title\`.** A layer that sets \`title: { default: "..." }\` without a page ever supplying its own string title falls back to \`default\`, not a doubly-wrapped template.
- **Treating \`sitemap.ts\`/\`robots.ts\` as static files to hand-edit.** They're functions — for a route with dynamic pages, they should await the same data used to generate the routes themselves, so the sitemap never drifts out of sync with what actually exists.

## Best practices

- Put metadata that's true for an entire section (site name, title template, default Open Graph image) in that section's \`layout.tsx\`; put page-specific overrides (a post's own title and description) in \`generateMetadata\` on the page.
- Reuse the exact same data-fetching function in \`generateMetadata\` and the page component — let request memoization handle deduplication rather than avoiding the "duplicate" call yourself.
- Set a \`title.template\` once at the root instead of repeating the site name string in every page's title.
- Keep \`sitemap.ts\`/\`robots.ts\` driven by the same data source as your routes, not a hand-maintained list.

## Performance considerations

\`generateMetadata\` runs on the server alongside the page's own render — it doesn't add a client-side round trip. Because it commonly shares a data-fetching call with the page component, and that call is deduped by request memoization, resolving metadata is close to free once the page's own data fetch has already been accounted for.
`;

const layoutsCode = `// layouts.ts — READ-ONLY. A fake layout tree, root to leaf, mirroring how
// Next.js walks app/layout.tsx -> app/blog/layout.tsx -> app/blog/[slug]/page.tsx
// and merges each layer's metadata export in order.

export type OpenGraph = {
  siteName?: string;
  locale?: string;
  title?: string;
  images?: string[];
};

export type MetadataLayer = {
  title?: string | { template: string; default?: string };
  description?: string;
  openGraph?: OpenGraph;
};

export const LAYOUT_TREE: MetadataLayer[] = [
  {
    // app/layout.tsx
    title: { template: "%s | Acme Blog", default: "Acme Blog" },
    description: "The official Acme company blog.",
    openGraph: { siteName: "Acme Blog", locale: "en_US" },
  },
  {
    // app/blog/layout.tsx
    openGraph: { images: ["/og/blog-default.png"] },
  },
  {
    // app/blog/[slug]/page.tsx — generateMetadata's return value
    title: "Why Next.js Ships Less JavaScript",
    description: "A deep dive into Server Components and the RSC payload.",
    openGraph: { title: "Why Next.js Ships Less JavaScript", images: ["/og/post-123.png"] },
  },
];

export type ResolvedMetadata = {
  title?: string;
  description?: string;
  openGraph?: OpenGraph;
};
`;

const resolveStarter = `// resolveMetadata.ts
// Walk LAYOUT_TREE top-down (root first, page last) and merge each layer,
// reproducing the same rules Next.js applies when it builds the final <head>.
import { LAYOUT_TREE, type MetadataLayer, type ResolvedMetadata } from "./layouts";

export function resolveMetadata(layers: MetadataLayer[]): ResolvedMetadata {
  const result: ResolvedMetadata = {};
  let titleTemplate: string | null = null;

  for (const layer of layers) {
    // TODO Exercise 1: if layer.description is defined, it overrides
    // result.description (a child's description always wins over a parent's).

    // TODO Exercise 2: if layer.openGraph is defined, shallow-merge it into
    // result.openGraph — result.openGraph = { ...result.openGraph, ...layer.openGraph }
    // (each field the child sets overrides that field only; fields it omits
    // stay inherited from the parent).

    // TODO Exercise 3: handle title.
    // - If layer.title is an object ({ template, default }), remember its
    //   template for later layers, and set result.title to its default (if any).
    // - If layer.title is a plain string, apply the nearest ancestor's
    //   template (titleTemplate.replace("%s", layer.title)) if one was seen,
    //   otherwise use the string as-is.
  }

  return result;
}

export const resolved = resolveMetadata(LAYOUT_TREE);
`;

const resolveSolution = `import { LAYOUT_TREE, type MetadataLayer, type ResolvedMetadata } from "./layouts";

export function resolveMetadata(layers: MetadataLayer[]): ResolvedMetadata {
  const result: ResolvedMetadata = {};
  let titleTemplate: string | null = null;

  for (const layer of layers) {
    if (layer.description !== undefined) {
      result.description = layer.description;
    }

    if (layer.openGraph !== undefined) {
      result.openGraph = { ...result.openGraph, ...layer.openGraph };
    }

    if (layer.title !== undefined) {
      if (typeof layer.title === "object") {
        titleTemplate = layer.title.template;
        if (layer.title.default !== undefined) {
          result.title = layer.title.default;
        }
      } else {
        result.title = titleTemplate ? titleTemplate.replace("%s", layer.title) : layer.title;
      }
    }
  }

  return result;
}

export const resolved = resolveMetadata(LAYOUT_TREE);
`;

const appCode = `import { resolved } from "./resolveMetadata";

export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Resolved &lt;head&gt; metadata (simulated)</h1>
      <p className="resolved-title">{resolved.title ?? "(no title)"}</p>
      <p className="resolved-description">{resolved.description ?? "(no description)"}</p>
      <p className="resolved-og-sitename">{resolved.openGraph?.siteName ?? "(no siteName)"}</p>
      <p className="resolved-og-image">{resolved.openGraph?.images?.[0] ?? "(no image)"}</p>
    </main>
  );
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 7.1 sandbox
==================

There's no real crawler or <head> to inspect in this browser tab, so
layouts.ts (read-only) models a layout tree as a plain array of metadata
objects — the same three layers a real app would have as app/layout.tsx,
app/blog/layout.tsx and app/blog/[slug]/page.tsx (via generateMetadata).

1. Merge description: a child layer's description overrides a parent's.
2. Merge openGraph: shallow-merge each layer's openGraph object in, field
   by field.
3. Resolve title: track the nearest template and apply it to the next
   plain-string title; fall back to a layer's default when no page title
   is set yet.
`,
  },
  { path: "/layouts.ts", readOnly: true, code: layoutsCode },
  { path: "/resolveMetadata.ts", code: resolveStarter },
  { path: "/App.tsx", code: appCode },
];

const solutionFiles = [
  { path: "/layouts.ts", readOnly: true, code: layoutsCode },
  { path: "/resolveMetadata.ts", code: resolveSolution },
  { path: "/App.tsx", code: appCode },
];

const lesson: Lesson = {
  id: "m7-l1",
  title: "Metadata API & SEO",
  description:
    "The metadata export and generateMetadata, how metadata merges down the layout tree, Open Graph/Twitter cards, sitemap.ts/robots.ts, and why Server Components make SEO mostly about correct HTML rather than a bolt-on concern.",
  durationMin: 30,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "Merge description down the tree",
      difficulty: "easy",
      instructions: `In \`resolveMetadata.ts\`, inside the loop, set \`result.description = layer.description\` whenever \`layer.description !== undefined\` so the most specific layer's description wins. Confirm the preview shows the post's own description, not the root layout's.`,
      validation: [
        { type: "code-includes", file: "/resolveMetadata.ts", pattern: "result.description = layer.description", message: "The loop overwrites result.description from each layer that defines one" },
        { type: "dom-text", selector: "p.resolved-description", includes: "Server Components and the RSC payload", message: "The rendered description is the post's own, not the root layout's" },
      ],
      hint: `if (layer.description !== undefined) {\n  result.description = layer.description;\n}`,
    },
    {
      id: "ex2",
      title: "Shallow-merge openGraph",
      difficulty: "medium",
      instructions: `Still inside the loop, shallow-merge \`layer.openGraph\` into \`result.openGraph\` with \`result.openGraph = { ...result.openGraph, ...layer.openGraph }\` whenever it's defined. Confirm the preview shows both the root's \`siteName\` (inherited) and the post's own \`images\` entry (overridden) at the same time.`,
      validation: [
        { type: "code-regex", file: "/resolveMetadata.ts", regex: "result\\.openGraph\\s*=\\s*\\{\\s*\\.\\.\\.result\\.openGraph", message: "openGraph is shallow-merged, not replaced wholesale" },
        { type: "dom-text", selector: "p.resolved-og-sitename", includes: "Acme Blog", message: "siteName is inherited from the root layout" },
        { type: "dom-text", selector: "p.resolved-og-image", includes: "post-123", message: "images is overridden by the most specific layer" },
      ],
      hint: `if (layer.openGraph !== undefined) {\n  result.openGraph = { ...result.openGraph, ...layer.openGraph };\n}`,
    },
    {
      id: "ex3",
      title: "Resolve the title template",
      difficulty: "hard",
      instructions: `Handle \`layer.title\`: when it's an object, remember its \`template\` in \`titleTemplate\` and set \`result.title\` to its \`default\` if present. When it's a plain string, apply \`titleTemplate\` (via \`.replace("%s", layer.title)\`) if one has been seen, otherwise use the string directly. Confirm the final title reads \`"Why Next.js Ships Less JavaScript | Acme Blog"\`.`,
      validation: [
        { type: "code-includes", file: "/resolveMetadata.ts", pattern: "titleTemplate = layer.title.template", message: "The layer's template is captured for later layers to use" },
        { type: "code-includes", file: "/resolveMetadata.ts", pattern: ".replace(\"%s\"", message: "A plain string title is applied against the captured template" },
        { type: "dom-text", selector: "p.resolved-title", includes: "Why Next.js Ships Less JavaScript | Acme Blog", message: "The resolved title combines the page's title with the root's template" },
      ],
      hint: `if (typeof layer.title === "object") {\n  titleTemplate = layer.title.template;\n  if (layer.title.default !== undefined) result.title = layer.title.default;\n} else {\n  result.title = titleTemplate ? titleTemplate.replace("%s", layer.title) : layer.title;\n}`,
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "When should a page use generateMetadata instead of a static metadata export?",
      options: [
        "Always — generateMetadata is strictly newer and preferred",
        "When the metadata depends on the same params or data the page itself fetches",
        "Only for the root layout",
        "Never — metadata should always be a static object",
      ],
      answerIndex: 1,
      explanation: "generateMetadata is an async function that receives the same params as the page and can await the same data source — needed whenever metadata isn't known statically.",
    },
    {
      id: "q2",
      type: "tf",
      question: "If both generateMetadata and the page component fetch the same URL, that results in two separate network calls.",
      options: ["True", "False"],
      answerIndex: 1,
      explanation: "Request memoization (Module 4) dedupes identical fetch calls within the same render — the second call reuses the first's result.",
    },
    {
      id: "q3",
      type: "code-prediction",
      question: "Root layout sets title: { template: \"%s | Acme\", default: \"Acme\" }. A nested page sets no title at all. What title renders?",
      code: `export const metadata = {\n  title: { template: "%s | Acme", default: "Acme" },\n};`,
      options: [
        "\"Acme | Acme\"",
        "\"Acme\" — the default, since no page supplied a string to insert into the template",
        "An empty title",
        "A build error",
      ],
      answerIndex: 1,
      explanation: "The template only applies when a descendant provides its own plain string title. With none, the default is used as-is.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "A blog section layout sets openGraph: { images: [...] }, and a post page sets openGraph: { title: \"...\" } but no images. The rendered page ends up with no OG image at all. What's the likely bug?",
      options: [
        "openGraph merging is fundamentally broken in Next.js",
        "Somewhere the merge replaced the whole openGraph object instead of merging field-by-field, dropping the inherited images",
        "images can only be set at the root layout",
        "The page needs a generateMetadata function to inherit anything",
      ],
      answerIndex: 1,
      explanation: "A correct merge does result.openGraph = { ...result.openGraph, ...layer.openGraph } — replacing the whole object instead loses fields the child didn't specify.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Why is SEO for an app built on Server Components mostly \"get the HTML right\" rather than a bolt-on concern?",
      options: [
        "Because crawlers only index apps with a sitemap.ts",
        "Because Server Components render real HTML on the server before anything reaches the browser, so a crawler sees the full <head> and body on the first response without executing JavaScript",
        "Because Next.js submits pages to search engines automatically",
        "Because metadata is optional for Server Components",
      ],
      answerIndex: 1,
      explanation: "Server-rendered HTML means the metadata resolved for a route is present in the very first response — there's no separate crawler-specific rendering path to get right.",
    },
  ],
  keyTakeaways: [
    "Static metadata is a plain metadata export; dynamic metadata is an async generateMetadata function using the same params/data-fetching pattern as the page.",
    "Metadata merges down the layout tree exactly like Layouts (Module 2) nest — a child's fields override a parent's, field by field, not object by object.",
    "generateMetadata and the page component can safely share a fetch call — request memoization dedupes it to one network call.",
    "sitemap.ts and robots.ts are functions, not static files — drive them from the same data source as your routes.",
    "Server-rendered HTML means SEO is mostly about correct metadata resolution, not a separate crawler-specific concern.",
  ],
  cheatSheet: `
| Concept | API |
| --- | --- |
| Static metadata | \`export const metadata = { title, description, ... }\` |
| Dynamic metadata | \`export async function generateMetadata({ params }) {}\` |
| Title template | \`title: { template: "%s | Site", default: "Site" }\` |
| Open Graph | \`openGraph: { title, images, type }\` |
| Twitter card | \`twitter: { card: "summary_large_image" }\` |
| Sitemap | \`app/sitemap.ts\` → served at \`/sitemap.xml\` |
| Robots rules | \`app/robots.ts\` → served at \`/robots.txt\` |
| Merge direction | Root layout → nested layouts → page, most specific field wins |
`,
  interviewQuestions: [
    "When do you reach for generateMetadata instead of a static metadata export?",
    "How does metadata merge down the layout tree, and how does that mirror layout nesting itself?",
    "If generateMetadata and the page component both fetch the same resource, does that cost two network calls? Why or why not?",
    "What do sitemap.ts and robots.ts produce, and why should they be driven by the same data as your routes?",
    "Why does building on Server Components change the SEO story compared to a client-rendered SPA?",
    "How does a title template interact with a page that sets no title of its own?",
  ],
};

export default lesson;
