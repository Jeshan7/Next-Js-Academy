import type { Lesson } from "@/types/lesson";

const theory = `
## Introduction

A blog has one template and a thousand posts. You are not going to create a thousand folders. **Dynamic segments** — folders named \`[param]\` — let one \`page.tsx\` serve an entire family of URLs, receiving the variable part as a parameter.

## Why this exists

URLs are an interface. \`/blog/why-rsc-matters\` is shareable, bookmarkable, crawlable and readable; \`/blog?id=8231\` is none of those things gracefully. Every content-driven site needs *URL patterns*, and the file-system router needs a way to express "this segment is a variable". Square brackets are that way:

\`\`\`
app/blog/[slug]/page.tsx   →  /blog/anything
app/shop/[category]/[id]/page.tsx  →  /shop/shoes/42
\`\`\`

::diagram{dynamic-matching}

## How it works internally

### Matching: static beats dynamic

At request time the router splits the URL into segments and walks its compiled tree. At each level it tries, in order:

1. **Static segments** — an exact folder name match (\`blog\`, \`about\`).
2. **Dynamic segments** — \`[slug]\` matches any single segment.
3. **Catch-all** — \`[...parts]\` matches one or more remaining segments (as an array); \`[[...parts]]\` also matches zero.

So with both \`app/blog/featured/page.tsx\` and \`app/blog/[slug]/page.tsx\` present, \`/blog/featured\` deterministically hits the static one. Specificity wins; there is never ambiguity.

### Receiving params

The matched values arrive as the \`params\` prop of the page (and of layouts on the path):

\`\`\`tsx
// app/blog/[slug]/page.tsx
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;           // params is async in modern Next.js
  const post = await getPost(slug);        // fetch by the URL's variable part
  if (!post) notFound();                   // renders the nearest not-found.tsx
  return <article><h1>{post.title}</h1>{post.body}</article>;
}
\`\`\`

Client Components can instead read them with the \`useParams()\` hook.

### The lookup + not-found pattern

A dynamic route accepts *any* value — \`/blog/asdfgh\` matches too. So every dynamic page follows the same shape: **extract param → look up data → if missing, \`notFound()\`**. Skipping the third step is how sites end up rendering empty templates for garbage URLs (bad UX, and an SEO liability since each is a "valid" 200 page).

### Pre-rendering the family

Because one file represents many URLs, Next.js can't know them all — unless you tell it. \`generateStaticParams\` returns the list of param values to pre-render at build time:

\`\`\`tsx
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}
\`\`\`

This turns a dynamic route into a set of static pages — the foundation of static blogs and docs sites (explored fully in the Rendering Strategies module).

## The sandbox in this lesson

The read-only \`framework.tsx\` now implements real pattern matching: route keys may contain \`[param]\` segments, and matched values are passed to your page as a \`params\` prop — the same contract as Next.js.

## Common mistakes

- **No not-found handling** — dynamic pages must treat "data missing" as a first-class case.
- **Encoding state into deep paths** (\`/dashboard/tab2/sort-asc/page3\`) that belongs in **query strings**. Path = *which resource*; query = *how to view it*.
- **Shadowing surprises** — forgetting a static sibling exists and wondering why \`[slug]\` never receives that value.
- **Trusting params** — they're user input from the URL. Validate before using them in lookups.

## Best practices

- Use human-readable slugs over numeric IDs where content is public — better URLs, better SEO.
- Keep param names meaningful: \`[productId]\`, not \`[x]\` — the name becomes your params key.
- One dynamic level per concept; reach for catch-alls only for genuinely arbitrary depth (docs trees, file browsers).

## Performance considerations

Dynamic routes are matched against a precompiled tree — matching cost is negligible. The real performance story is *what renders*: combined with \`generateStaticParams\`, a dynamic route family becomes free-to-serve static files.
`;

const frameworkCode = `// framework.tsx — READ-ONLY. The router now supports [param] segments,
// implementing the same matching rules as Next.js:
// static segments win over dynamic ones, and matched values are
// delivered to the page as a "params" prop.
import React from "react";
import { usePathname } from "next/navigation";

export type PageComponent = React.ComponentType<{ params: Record<string, string> }>;

function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const u = pathname.split("/").filter(Boolean);
  if (p.length !== u.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    if (seg.startsWith("[") && seg.endsWith("]")) {
      params[seg.slice(1, -1)] = decodeURIComponent(u[i]);
    } else if (seg !== u[i]) {
      return null;
    }
  }
  return params;
}

export function Router({ routes }: { routes: Record<string, PageComponent> }) {
  const pathname = usePathname();
  const patterns = Object.keys(routes).sort(
    // Fewer dynamic segments first → static routes win, like Next.js.
    (a, b) => (a.match(/\\[/g)?.length ?? 0) - (b.match(/\\[/g)?.length ?? 0)
  );
  for (const pattern of patterns) {
    const params = match(pattern, pathname);
    if (params) {
      const Page = routes[pattern];
      return <Page params={params} />;
    }
  }
  return <div style={{ padding: 24 }}><h1>404</h1><p>No route matches “{pathname}”.</p></div>;
}
`;

const files = [
  {
    path: "/INSTRUCTIONS.md",
    readOnly: true,
    code: `Lesson 6 sandbox
================

framework.tsx now matches [param] patterns like Next.js.
data.ts holds a tiny "database" of posts.

Build /blog (a list) and /blog/[slug] (a detail page with a
not-found fallback). Route keys with [slug] stand in for the
folder app/blog/[slug]/page.tsx.
`,
  },
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/data.ts",
    readOnly: true,
    code: `export interface Post {
  slug: string;
  title: string;
  body: string;
}

export const posts: Post[] = [
  { slug: "hello-nextjs", title: "Hello, Next.js", body: "Folders are routes. Files are UI." },
  { slug: "server-components", title: "Server Components", body: "Ship less JavaScript." },
  { slug: "caching-explained", title: "Caching, explained", body: "Fast by default." },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
`,
  },
  {
    path: "/App.tsx",
    code: `import Link from "next/link";
import { Router, PageComponent } from "./framework";
import { posts, getPost } from "./data";

function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>My Site</h1>
      <Link href="/blog">Go to the blog →</Link>
    </main>
  );
}

// Exercise 1: BlogIndex — list every post as a Link to /blog/<slug>.
function BlogIndex() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Blog</h1>
      <ul className="post-list">{/* map posts here */}</ul>
    </main>
  );
}

// Exercise 2: PostPage — read params.slug, look up the post, render it.
// Exercise 3: if the post doesn't exist, render a .not-found message instead.

const routes: Record<string, PageComponent> = {
  "/": Home,
  "/blog": BlogIndex,
  // Exercise 2: register "/blog/[slug]" here
};

export default function App() {
  return <div style={{ fontFamily: "system-ui" }}><Router routes={routes} /></div>;
}
`,
  },
];

const solutionFiles = [
  { path: "/framework.tsx", readOnly: true, code: frameworkCode },
  {
    path: "/data.ts",
    readOnly: true,
    code: files[2].code,
  },
  {
    path: "/App.tsx",
    code: `import Link from "next/link";
import { Router, PageComponent } from "./framework";
import { posts, getPost } from "./data";

function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>My Site</h1>
      <Link href="/blog">Go to the blog →</Link>
    </main>
  );
}

function BlogIndex() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Blog</h1>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={"/blog/" + post.slug}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function PostPage({ params }: { params: Record<string, string> }) {
  const post = getPost(params.slug);
  if (!post) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="not-found">Post not found</h1>
        <Link href="/blog">← Back to the blog</Link>
      </main>
    );
  }
  return (
    <main style={{ padding: 24 }}>
      <article>
        <h1 className="post-title">{post.title}</h1>
        <p>{post.body}</p>
      </article>
      <Link href="/blog">← Back to the blog</Link>
    </main>
  );
}

const routes: Record<string, PageComponent> = {
  "/": Home,
  "/blog": BlogIndex,
  "/blog/[slug]": PostPage,
};

export default function App() {
  return <div style={{ fontFamily: "system-ui" }}><Router routes={routes} /></div>;
}
`,
  },
];

const lesson: Lesson = {
  id: "m2-l3",
  title: "Dynamic routes: [slug], params & not-found",
  description:
    "One file, a thousand URLs: matching rules, the params contract, the lookup + notFound pattern, and generateStaticParams.",
  durationMin: 40,
  theory,
  files,
  solutionFiles,
  exercises: [
    {
      id: "ex1",
      title: "The blog index",
      difficulty: "easy",
      instructions: `In \`BlogIndex\`, map over \`posts\` and render each as an \`<li>\` containing a \`<Link>\` to \`/blog/<slug>\`. Use the post title as the link text.`,
      validation: [
        { type: "dom-count", selector: "ul.post-list li a", min: 3, message: "The index links to all three posts" },
        { type: "code-includes", file: "/App.tsx", pattern: "posts.map", message: "The list is generated from the posts data" },
      ],
    },
    {
      id: "ex2",
      title: "The dynamic post page",
      difficulty: "medium",
      instructions: `Create a \`PostPage\` component that receives \`{ params }\`, looks up the post with \`getPost(params.slug)\`, and renders its title in \`<h1 className="post-title">\` plus the body. Register it under the pattern \`"/blog/[slug]"\` — the equivalent of \`app/blog/[slug]/page.tsx\`. Click a post in the preview to test it.`,
      validation: [
        { type: "code-regex", file: "/App.tsx", regex: "[\"']/blog/\\[slug\\][\"']", message: "The dynamic pattern /blog/[slug] is registered" },
        { type: "code-includes", file: "/App.tsx", pattern: "params.slug", message: "PostPage reads params.slug" },
        { type: "code-includes", file: "/App.tsx", pattern: "getPost(", message: "The post is looked up from data by slug" },
      ],
    },
    {
      id: "ex3",
      title: "Handle the missing post",
      difficulty: "hard",
      instructions: `Dynamic routes match *anything* — so handle failure: if \`getPost\` returns \`undefined\`, render an \`<h1 className="not-found">Post not found</h1>\` with a link back to \`/blog\` instead of the article. (In real Next.js you'd call \`notFound()\` to trigger \`not-found.tsx\`.) Test by adding a temporary link to \`/blog/does-not-exist\`.`,
      validation: [
        { type: "code-includes", file: "/App.tsx", pattern: "not-found", message: "A not-found branch exists for missing posts" },
        { type: "code-regex", file: "/App.tsx", regex: "if\\s*\\(\\s*!post\\s*\\)", message: "The missing-data case is checked before rendering" },
      ],
    },
  ],
  quiz: [
    {
      id: "q1",
      type: "mcq",
      question: "Both app/blog/featured/page.tsx and app/blog/[slug]/page.tsx exist. Which handles /blog/featured?",
      options: [
        "The dynamic [slug] page, with slug = 'featured'",
        "The static featured page — static segments beat dynamic ones",
        "A build error — the routes conflict",
        "Whichever file was created first",
      ],
      answerIndex: 1,
      explanation: "Matching is by specificity: static > dynamic > catch-all. Deterministic, never ambiguous.",
    },
    {
      id: "q2",
      type: "code-prediction",
      question: "For app/shop/[category]/[id]/page.tsx, what params does /shop/shoes/42 produce?",
      options: [
        "{ category: 'shoes', id: '42' } — both strings",
        "{ category: 'shoes', id: 42 } — id is a number",
        "['shoes', '42']",
        "{ slug: 'shoes/42' }",
      ],
      answerIndex: 0,
      explanation: "URL segments are always strings. Convert and validate them yourself.",
    },
    {
      id: "q3",
      type: "mcq",
      question: "What is generateStaticParams for?",
      options: [
        "Validating params at runtime",
        "Telling Next.js which param values to pre-render at build time",
        "Generating TypeScript types for params",
        "Creating query strings",
      ],
      answerIndex: 1,
      explanation:
        "It enumerates the URL family so a dynamic route can become static pages at build time.",
    },
    {
      id: "q4",
      type: "debugging",
      question: "Users visiting /products/999 (a deleted product) see an empty page with just the site header. What's missing?",
      options: [
        "A loading.tsx file",
        "The lookup result isn't checked — call notFound() when the product doesn't exist",
        "generateStaticParams",
        "A catch-all route",
      ],
      answerIndex: 1,
      explanation:
        "Extract → look up → notFound() on miss. Every dynamic page needs all three steps.",
    },
    {
      id: "q5",
      type: "mcq",
      question: "Which URL data belongs in the path vs the query string?",
      options: [
        "Everything in the path — queries are legacy",
        "Path identifies the resource (/products/42); query describes the view (?sort=price)",
        "Everything in the query — paths must be static",
        "It makes no technical difference",
      ],
      answerIndex: 1,
      explanation:
        "Resource identity → path (and dynamic segments). View state like sorting/filtering/pagination → query params.",
    },
  ],
  keyTakeaways: [
    "[param] folders make one page serve a URL family; the value arrives via params (always a string).",
    "Matching is deterministic: static > dynamic > catch-all.",
    "Every dynamic page: extract → look up → notFound() on miss.",
    "generateStaticParams turns a dynamic route into pre-rendered static pages.",
  ],
  cheatSheet: `
| Pattern | Matches | params |
| --- | --- | --- |
| \`[slug]\` | one segment | \`{ slug: "a" }\` |
| \`[...parts]\` | ≥1 segments | \`{ parts: ["a","b"] }\` |
| \`[[...parts]]\` | ≥0 segments | may be \`{}\` |
| static name | that name only | wins over dynamic |
`,
  interviewQuestions: [
    "How does the App Router resolve conflicts between static and dynamic segments?",
    "Why are route params always strings, and what should you do about it?",
    "Explain the notFound() pattern and what goes wrong without it.",
    "When would you use a catch-all segment? An optional catch-all?",
    "How does generateStaticParams interact with dynamic routes?",
    "Path segments vs query parameters — how do you decide where data belongs?",
  ],
};

export default lesson;
