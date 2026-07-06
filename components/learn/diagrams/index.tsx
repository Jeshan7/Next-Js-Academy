"use client";

import React from "react";

/**
 * Original SVG/CSS diagrams, registered by key and referenced from lesson
 * theory via ::diagram{key}. All animation is pure CSS (respects
 * prefers-reduced-motion via globals.css).
 */

const box = "fill-ink-800";
const boxStroke = "stroke-ink-600";
const label = "fill-mist-200 text-[11px] font-medium";
const small = "fill-mist-400 text-[10px]";
const ember = "fill-ember-500";

function Frame({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-5 rounded-xl border border-ink-600 bg-ink-900 p-4">
      <figcaption className="mb-2 text-[11px] uppercase tracking-widest text-ember-400">
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 640 ${height}`}
        className="w-full"
        role="img"
        aria-label={title}
        style={{ fontFamily: "ui-sans-serif, system-ui" }}
      >
        {children}
      </svg>
    </figure>
  );
}

function Node({
  x,
  y,
  w,
  h,
  text,
  sub,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        className={accent ? "fill-ember-500/15 stroke-ember-500" : `${box} ${boxStroke}`}
        strokeWidth={1}
      />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} textAnchor="middle" className={label}>
        {text}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" className={small}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ d, dashed }: { d: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      className="stroke-mist-500"
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 4" : undefined}
      markerEnd="url(#arrowhead)"
    />
  );
}

function Defs() {
  return (
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" className="fill-mist-500" />
      </marker>
    </defs>
  );
}

/** Moving dot along a path — the platform's signature motion element. */
function Pulse({ path, dur, delay = 0 }: { path: string; dur: number; delay?: number }) {
  return (
    <circle r={4} className={`${ember} diagram-pulse`}>
      <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" path={path} />
    </circle>
  );
}

// ---------------------------------------------------------------------------

function RenderingSpectrum() {
  return (
    <Frame title="Three ways to render a page" height={300}>
      <Defs />
      {/* MPA */}
      <text x={20} y={26} className={label}>Classic server app</text>
      <Node x={20} y={38} w={110} h={44} text="Server" sub="builds full HTML" />
      <Node x={220} y={38} w={110} h={44} text="Browser" sub="page appears fast" />
      <Arrow d="M132 60 H 216" />
      <text x={360} y={64} className={small}>every click = full reload, all state lost</text>

      {/* SPA */}
      <text x={20} y={128} className={label}>SPA (plain React)</text>
      <Node x={20} y={140} w={110} h={44} text="Server" sub="empty div + big JS" />
      <Node x={220} y={140} w={110} h={44} text="Browser" sub="blank until JS runs" />
      <Arrow d="M132 162 H 216" />
      <text x={360} y={166} className={small}>slow first paint, weak SEO, instant afterwards</text>

      {/* Next */}
      <text x={20} y={230} className={label}>Next.js</text>
      <Node x={20} y={242} w={110} h={44} text="Server" sub="real HTML first" accent />
      <Node x={220} y={242} w={110} h={44} text="Browser" sub="hydrates the parts that need JS" accent />
      <Arrow d="M132 264 H 216" />
      <text x={360} y={268} className={small}>fast first paint + app-like navigation</text>
      <Pulse path="M132 264 H 216" dur={2} />
    </Frame>
  );
}

function ComponentTree() {
  return (
    <Frame title="A UI is a tree of components; props flow down" height={260}>
      <Defs />
      <Node x={250} y={16} w={140} h={40} text="<App />" accent />
      <Node x={80} y={110} w={140} h={40} text="<Header />" />
      <Node x={420} y={110} w={140} h={40} text="<ProfileCard />" />
      <Node x={330} y={200} w={130} h={40} text="<Button />" />
      <Node x={480} y={200} w={130} h={40} text="<SkillList />" />
      <Arrow d="M290 58 L 165 106" />
      <Arrow d="M350 58 L 475 106" />
      <Arrow d="M465 152 L 405 196" />
      <Arrow d="M510 152 L 540 196" />
      <Pulse path="M350 58 L 475 106" dur={2} />
      <Pulse path="M465 152 L 405 196" dur={2} delay={1} />
      <text x={20} y={250} className={small}>props travel along the arrows — always downward, always read-only</text>
    </Frame>
  );
}

function FileRouting() {
  const mono = "fill-mist-200 text-[11px]";
  return (
    <Frame title="Folders are the route table" height={250}>
      <Defs />
      <rect x={16} y={16} width={280} height={214} rx={10} className={`${box} ${boxStroke}`} strokeWidth={1} />
      <text x={32} y={42} className={small}>app/</text>
      <text x={48} y={66} className={mono} style={{ fontFamily: "monospace" }}>layout.tsx</text>
      <text x={48} y={92} className={mono} style={{ fontFamily: "monospace" }}>page.tsx</text>
      <text x={48} y={118} className={small}>about/</text>
      <text x={68} y={142} className={mono} style={{ fontFamily: "monospace" }}>page.tsx</text>
      <text x={48} y={168} className={small}>blog/</text>
      <text x={68} y={192} className={small}>[slug]/</text>
      <text x={88} y={216} className={mono} style={{ fontFamily: "monospace" }}>page.tsx</text>

      <Node x={420} y={72} w={180} h={34} text="/" accent />
      <Node x={420} y={122} w={180} h={34} text="/about" accent />
      <Node x={420} y={196} w={180} h={34} text="/blog/:slug" accent />

      <Arrow d="M150 88 C 300 88, 340 89, 416 89" />
      <Arrow d="M150 138 C 300 138, 340 139, 416 139" />
      <Arrow d="M170 212 C 320 212, 340 213, 416 213" />
      <Pulse path="M150 88 C 300 88, 340 89, 416 89" dur={2.4} />
      <Pulse path="M170 212 C 320 212, 340 213, 416 213" dur={2.4} delay={1.2} />
    </Frame>
  );
}

function NavigationFlow() {
  return (
    <Frame title="What a <Link> click does" height={250}>
      <Defs />
      <Node x={20} y={30} w={130} h={44} text="Click <Link>" accent />
      <Node x={220} y={30} w={170} h={44} text="preventDefault()" sub="no full reload" />
      <Node x={460} y={30} w={160} h={44} text="pushState(url)" sub="URL + history update" />
      <Node x={460} y={150} w={160} h={44} text="Fetch RSC payload" sub="often already prefetched" />
      <Node x={220} y={150} w={170} h={44} text="Reconcile tree" sub="swap page, keep layouts" accent />
      <Node x={20} y={150} w={130} h={44} text="New page visible" accent />
      <Arrow d="M152 52 H 216" />
      <Arrow d="M392 52 H 456" />
      <Arrow d="M540 76 V 146" />
      <Arrow d="M458 172 H 394" />
      <Arrow d="M218 172 H 154" />
      <Pulse path="M152 52 H 456 M540 76 V146 M458 172 H154" dur={3.5} />
      <text x={20} y={236} className={small}>state in shared layouts survives — only the changed segment is replaced</text>
    </Frame>
  );
}

function LayoutNesting() {
  return (
    <Frame title="Layouts nest down the folder path" height={270}>
      <Defs />
      <rect x={40} y={20} width={560} height={230} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={56} y={44} className={label}>RootLayout — app/layout.tsx</text>
      <rect x={70} y={60} width={500} height={170} rx={10} className="fill-ink-700/60 stroke-ink-600" strokeWidth={1} />
      <text x={86} y={84} className={label}>DashboardLayout — app/dashboard/layout.tsx</text>
      <rect x={100} y={100} width={200} height={110} rx={8} className="fill-ember-500/10 stroke-ember-500" strokeWidth={1}>
        <animate attributeName="opacity" values="1;0.25;1" dur="3s" repeatCount="indefinite" />
      </rect>
      <text x={200} y={150} textAnchor="middle" className={label}>page: /dashboard/sales</text>
      <rect x={330} y={100} width={200} height={110} rx={8} className="fill-ember-500/10 stroke-ember-500" strokeWidth={1}>
        <animate attributeName="opacity" values="0.25;1;0.25" dur="3s" repeatCount="indefinite" />
      </rect>
      <text x={430} y={150} textAnchor="middle" className={label}>page: /dashboard/settings</text>
      <text x={100} y={196} className={small}>navigation swaps only the page slot —</text>
      <text x={100} y={210} className={small}>both layouts stay mounted, state intact</text>
    </Frame>
  );
}

function DynamicMatching() {
  return (
    <Frame title="Matching /blog/featured — specificity wins" height={230}>
      <Defs />
      <Node x={20} y={80} w={170} h={44} text="/blog/featured" sub="incoming URL" accent />
      <Node x={300} y={20} w={220} h={44} text="app/blog/featured/page.tsx" sub="static — checked first" accent />
      <Node x={300} y={90} w={220} h={44} text="app/blog/[slug]/page.tsx" sub="dynamic — only if static misses" />
      <Node x={300} y={160} w={220} h={44} text="app/blog/[...all]/page.tsx" sub="catch-all — last resort" />
      <Arrow d="M192 96 C 250 60, 260 44, 296 43" />
      <Arrow d="M192 104 H 296" dashed />
      <Arrow d="M192 112 C 250 150, 260 180, 296 181" dashed />
      <Pulse path="M192 96 C 250 60, 260 44, 296 43" dur={2} />
      <text x={300} y={222} className={small}>dashed paths are tried only when more specific routes don&apos;t match</text>
    </Frame>
  );
}

function ServerComponentBoundary() {
  return (
    <Frame title="The Server / Client render boundary" height={290}>
      <Defs />
      <rect x={20} y={20} width={280} height={250} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={36} y={44} className={label}>Server (runs once per request)</text>
      <Node x={40} y={58} w={240} h={40} text="<Page /> (Server Component)" accent />
      <Node x={40} y={112} w={240} h={40} text="<ProductInfo /> (Server)" sub="fetches data with await" />
      <Node x={40} y={166} w={240} h={40} text="ships as RSC payload" sub="HTML + serialized tree, 0 KB JS" />
      <text x={40} y={244} className={small}>console.log here → server terminal</text>

      <rect x={340} y={20} width={280} height={250} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={356} y={44} className={label}>Browser (hydrates)</text>
      <Node x={360} y={58} w={240} h={40} text="Static HTML paints immediately" />
      <Node x={360} y={112} w={240} h={40} text="<AddToCart /> (Client)" sub={'"use client" — hydrated'} accent />
      <Node x={360} y={166} w={240} h={40} text="useState / onClick work here" />
      <text x={360} y={244} className={small}>console.log here → DevTools console</text>

      <Arrow d="M280 132 H 356" />
      <Pulse path="M280 132 H 356" dur={2.2} />
      <text x={210} y={280} textAnchor="middle" className={small}>crossing the boundary = serializable props only</text>
    </Frame>
  );
}

function ClientBoundaryProps() {
  return (
    <Frame title="Props cross down; behavior stays client-side" height={280}>
      <Defs />
      <Node x={220} y={16} w={200} h={40} text="<Page /> (Server)" accent />
      <Node x={220} y={90} w={200} h={40} text="<PostCard /> (Server)" sub="reads post from the database" />
      <Node x={220} y={170} w={200} h={50} text={'<LikeButton /> ("use client")'} sub="receives initialLikes: number" accent />
      <Arrow d="M320 56 V 86" />
      <Arrow d="M320 130 V 166" />
      <text x={340} y={148} className={small}>serializable props only</text>
      <rect x={220} y={232} width={200} height={34} rx={6} className="fill-ember-500/10 stroke-ember-500" strokeWidth={1} />
      <text x={320} y={253} textAnchor="middle" className={small}>onClick / useState live only here</text>
      <text x={40} y={200} className={small}>a function or class instance</text>
      <text x={40} y={214} className={small}>can&apos;t be passed as a prop —</text>
      <text x={40} y={228} className={small}>only plain, serializable data crosses</text>
      <Pulse path="M320 56 V 86 M320 130 V 166" dur={2.4} />
    </Frame>
  );
}

function CompositionChildrenSlot() {
  return (
    <Frame title="Slotting a Server Component in via children" height={280}>
      <Defs />
      <Node x={230} y={16} w={200} h={40} text="<Page /> (Server)" accent />
      <Node x={40} y={100} w={190} h={50} text="<ServerContent />" sub="rendered fully on the server" accent />
      <Node x={330} y={100} w={220} h={50} text={'<Panel> ("use client")'} sub="never imports ServerContent" />
      <Arrow d="M230 56 C 180 70, 150 80, 135 96" />
      <Arrow d="M230 56 C 300 70, 380 80, 420 96" />
      <rect x={330} y={170} width={220} height={70} rx={8} className="fill-ink-700/60 stroke-ink-600" strokeWidth={1} />
      <text x={440} y={192} textAnchor="middle" className={label}>children slot</text>
      <text x={440} y={212} textAnchor="middle" className={small}>holds the already-rendered</text>
      <text x={440} y={226} textAnchor="middle" className={small}>ServerContent output</text>
      <Arrow d="M135 150 C 200 190, 260 200, 326 200" dashed />
      <Pulse path="M135 150 C 200 190, 260 200, 326 200" dur={2.4} />
      <text x={40} y={260} className={small}>Page passes ServerContent as {`{children}`} — Panel.tsx has zero server imports</text>
    </Frame>
  );
}

function BuildVsRequestTime() {
  return (
    <Frame title="Build time vs request time" height={290}>
      <Defs />
      <text x={20} y={26} className={label}>Build time — generateStaticParams runs once</text>
      <Node x={20} y={38} w={160} h={40} text="/docs/intro" sub="pre-rendered HTML" accent />
      <Node x={196} y={38} w={160} h={40} text="/docs/routing" sub="pre-rendered HTML" accent />
      <Node x={372} y={38} w={160} h={40} text="/docs/caching" sub="pre-rendered HTML" accent />
      <text x={20} y={104} className={small}>known params → one static file each, served instantly, cached at the edge</text>

      <text x={20} y={150} className={label}>Request time — an unlisted param arrives</text>
      <Node x={20} y={162} w={170} h={44} text="/docs/changelog" sub="not in generateStaticParams" />
      <Arrow d="M192 184 H 296" />
      <Node x={300} y={162} w={170} h={44} text="Rendered on demand" sub="dynamicParams: true (default)" accent />
      <Pulse path="M192 184 H 296" dur={2} />
      <text x={20} y={236} className={small}>the result can still be cached after first render —</text>
      <text x={20} y={250} className={small}>"static" vs "dynamic" describes *when*, not *whether ever* cached</text>
    </Frame>
  );
}

function StreamingTimeline() {
  return (
    <Frame title="Streaming: the shell arrives first, chunks fill in as they're ready" height={280}>
      <Defs />
      <text x={20} y={26} className={label}>t = 0ms</text>
      <Node x={20} y={38} w={170} h={44} text="Shell HTML sent" sub="header, nav, static parts" accent />
      <text x={210} y={26} className={label}>t = 800ms</text>
      <Node x={210} y={38} w={170} h={44} text="UserCard chunk streams in" sub="Suspense boundary #1 resolves" />
      <text x={400} y={26} className={label}>t = 2000ms</text>
      <Node x={400} y={38} w={200} h={44} text="Recommendations chunk streams in" sub="Suspense boundary #2 resolves" />

      <rect x={20} y={110} width={580} height={4} rx={2} className="fill-mist-500/40" />
      <circle cx={30} cy={112} r={5} className={ember} />
      <circle cx={230} cy={112} r={5} className={ember} />
      <circle cx={480} cy={112} r={5} className={ember} />
      <Pulse path="M30 112 H 480" dur={3} />

      <text x={20} y={150} className={small}>Without streaming: the browser waits for ALL data before showing anything.</text>
      <text x={20} y={168} className={small}>With Suspense: the shell paints at 0ms; each boundary fills in independently —</text>
      <text x={20} y={186} className={small}>a slow section never blocks a fast one from appearing.</text>
      <text x={20} y={220} className={small}>Perceived performance wins even when total data-fetch time is unchanged.</text>
    </Frame>
  );
}

function LoadingErrorBoundaries() {
  return (
    <Frame title="Files map to automatic boundaries per segment" height={290}>
      <Defs />
      <rect x={20} y={16} width={220} height={250} rx={10} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={36} y={40} className={small}>app/dashboard/</text>
      <text x={52} y={64} className={label} style={{ fontFamily: "monospace" }}>layout.tsx</text>
      <text x={52} y={90} className={label} style={{ fontFamily: "monospace" }}>error.tsx</text>
      <text x={52} y={116} className={label} style={{ fontFamily: "monospace" }}>loading.tsx</text>
      <text x={52} y={142} className={label} style={{ fontFamily: "monospace" }}>page.tsx</text>

      <rect x={300} y={16} width={300} height={250} rx={10} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={316} y={38} className={label}>Rendered boundary nesting</text>
      <rect x={316} y={50} width={268} height={200} rx={8} className="fill-ink-700/60 stroke-ink-600" strokeWidth={1} />
      <text x={330} y={70} className={small}>Layout</text>
      <rect x={330} y={80} width={240} height={160} rx={8} className="fill-ember-500/10 stroke-ember-500" strokeWidth={1} />
      <text x={344} y={100} className={small}>Error boundary (error.tsx)</text>
      <rect x={344} y={110} width={212} height={116} rx={8} className="fill-ink-700/60 stroke-ink-600" strokeWidth={1} />
      <text x={358} y={130} className={small}>Suspense (loading.tsx fallback)</text>
      <rect x={358} y={140} width={184} height={72} rx={8} className="fill-ember-500/15 stroke-ember-500" strokeWidth={1} />
      <text x={450} y={182} textAnchor="middle" className={label}>page.tsx</text>

      <Arrow d="M240 90 C 270 90, 280 100, 296 100" />
      <Arrow d="M240 116 C 270 116, 280 130, 296 130" />
      <Arrow d="M240 142 C 270 142, 280 175, 296 178" />
      <Pulse path="M240 142 C 270 142, 280 175, 296 178" dur={2.2} />
    </Frame>
  );
}

function FetchWaterfall() {
  return (
    <Frame title="Sequential awaits vs Promise.all" height={300}>
      <Defs />
      <text x={20} y={26} className={label}>Sequential — each await blocks the next fetch from starting</text>
      <Node x={20} y={38} w={140} h={40} text="await getUser()" sub="0–300ms" accent />
      <Node x={190} y={38} w={140} h={40} text="await getPosts()" sub="300–600ms" />
      <Node x={360} y={38} w={140} h={40} text="await getStats()" sub="600–900ms" />
      <Arrow d="M160 58 H 186" />
      <Arrow d="M330 58 H 356" />
      <text x={510} y={62} className={small}>total ≈ 900ms</text>
      <Pulse path="M20 58 H 500" dur={3} />

      <text x={20} y={130} className={label}>Parallel — Promise.all fires all three at once</text>
      <Node x={20} y={142} w={170} h={36} text="getUser()" sub="0–300ms" accent />
      <Node x={20} y={184} w={170} h={36} text="getPosts()" sub="0–300ms" accent />
      <Node x={20} y={226} w={170} h={36} text="getStats()" sub="0–300ms" accent />
      <Node x={280} y={184} w={200} h={36} text="Promise.all resolves" sub="total ≈ 300ms" accent />
      <Arrow d="M190 160 C 230 160, 250 175, 276 190" />
      <Arrow d="M190 202 H 276" />
      <Arrow d="M190 244 C 230 244, 250 220, 276 202" />
      <Pulse path="M190 202 H 276" dur={2} />
      <text x={20} y={286} className={small}>same three fetches, ~3× faster total time — because none of them depend on each other&apos;s result</text>
    </Frame>
  );
}

function CacheScopes() {
  return (
    <Frame title="Two different caches, two different scopes" height={300}>
      <Defs />
      <rect x={20} y={20} width={280} height={250} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={36} y={44} className={label}>Request memoization</text>
      <text x={36} y={62} className={small}>scope: one render pass only</text>
      <Node x={40} y={76} w={240} h={36} text="fetch('/api/user') — call #1" accent />
      <Node x={40} y={118} w={240} h={36} text="fetch('/api/user') — call #2" />
      <Node x={40} y={160} w={240} h={36} text="fetch('/api/user') — call #3" />
      <Arrow d="M160 112 V 116" />
      <Arrow d="M160 154 V 158" />
      <text x={40} y={210} className={small}>same URL + options, same render →</text>
      <text x={40} y={224} className={small}>only call #1 hits the network</text>
      <text x={40} y={246} className={small}>gone after this render finishes</text>

      <rect x={340} y={20} width={280} height={250} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={356} y={44} className={label}>Data cache</text>
      <text x={356} y={62} className={small}>scope: across requests, deployments, time</text>
      <Node x={360} y={76} w={240} h={36} text="Request A (Monday)" sub="fetch → cache miss, stores result" accent />
      <Node x={360} y={128} w={240} h={36} text="Request B (Tuesday)" sub="fetch → cache hit, no network call" accent />
      <Node x={360} y={180} w={240} h={36} text="tagged: 'products'" sub="revalidateTag('products') clears it" />
      <Pulse path="M480 112 V 126" dur={2} />
      <text x={360} y={236} className={small}>persists until time-based or on-demand</text>
      <text x={360} y={250} className={small}>revalidation invalidates it</text>
    </Frame>
  );
}

function RevalidationTimeline() {
  return (
    <Frame title="Stale-while-revalidate, on a timeline" height={280}>
      <Defs />
      <rect x={20} y={100} width={580} height={4} rx={2} className="fill-mist-500/40" />
      <circle cx={40} cy={102} r={5} className={ember} />
      <circle cx={260} cy={102} r={5} className={ember} />
      <circle cx={520} cy={102} r={5} className={ember} />

      <text x={20} y={30} className={label}>t = 0s — data cached, revalidate: 60 set</text>
      <Node x={20} y={40} w={200} h={40} text="Request #1" sub="cache hit — instant" accent />

      <text x={230} y={30} className={label}>t = 65s — first request after staleness</text>
      <Node x={230} y={40} w={230} h={50} text="Request #2" sub="serves STALE value, triggers background refetch" accent />

      <text x={490} y={30} className={label}>t = 66s</text>
      <Node x={460} y={130} w={160} h={40} text="Background fetch completes" sub="cache updated" />

      <text x={20} y={190} className={label}>t = 90s — any request after refresh</text>
      <Node x={20} y={200} w={230} h={40} text="Request #3" sub="cache hit — fresh value" accent />

      <Arrow d="M340 90 C 400 100, 420 110, 458 128" />
      <Pulse path="M340 90 C 400 100, 420 110, 458 128" dur={2} />
      <text x={20} y={260} className={small}>nobody waits on the refresh — the stale response ships immediately, the next request benefits</text>
    </Frame>
  );
}

function CachingLayersStack() {
  return (
    <Frame title="The four caching layers, stacked" height={360}>
      <Defs />
      <Node x={40} y={20} w={560} h={56} text="1. Request memoization" sub="server · one render pass · dedupes identical fetch() calls" accent />
      <Node x={40} y={92} w={560} h={56} text="2. Data cache" sub="server · persists across requests & deployments · revalidate / revalidateTag / revalidatePath" accent />
      <Node x={40} y={164} w={560} h={56} text="3. Full route cache" sub="server · cached HTML + RSC payload per route · built at build/first-request time" accent />
      <Node x={40} y={236} w={560} h={56} text="4. Router cache" sub="client · in-memory per session · caches visited segments for instant back/forward nav" accent />
      <Arrow d="M320 76 V 90" />
      <Arrow d="M320 148 V 162" />
      <Arrow d="M320 220 V 234" />
      <Pulse path="M320 76 V 292" dur={3} />
      <text x={40} y={316} className={small}>1–2 govern what data gets fetched; 3 governs what HTML/RSC is served; 4 governs what the browser reuses without asking the server at all</text>
      <text x={40} y={334} className={small}>a change can be invisible until you clear the right layer — that&apos;s why &quot;stale after deploy&quot; bugs often need revalidateTag, not just a refresh</text>
    </Frame>
  );
}

function ParallelVsSequential() {
  return (
    <Frame title="Two 400ms fetches: sequential vs parallel" height={260}>
      <Defs />
      <text x={20} y={26} className={label}>Sequential</text>
      <rect x={20} y={38} width={580} height={4} rx={2} className="fill-mist-500/40" />
      <Node x={20} y={50} w={280} h={36} text="await getUser()" sub="0–400ms" accent />
      <Node x={300} y={50} w={280} h={36} text="await getOrders()" sub="400–800ms" />
      <text x={480} y={104} className={small}>total: 800ms</text>

      <text x={20} y={140} className={label}>Parallel — Promise.all</text>
      <rect x={20} y={152} width={580} height={4} rx={2} className="fill-mist-500/40" />
      <Node x={20} y={164} w={280} h={36} text="getUser()" sub="0–400ms" accent />
      <Node x={20} y={206} w={280} h={36} text="getOrders()" sub="0–400ms" accent />
      <text x={320} y={188} className={small}>total: 400ms — same data, half the wait</text>
      <Pulse path="M20 68 H 580" dur={2.5} />
    </Frame>
  );
}

function ServerActionFlow() {
  return (
    <Frame title="From form submit to updated UI" height={260}>
      <Defs />
      <Node x={10} y={100} w={130} h={50} text="Form submit" sub="action={serverFn}" accent />
      <Node x={170} y={100} w={140} h={50} text="Server Action runs" sub="on the server, not the client" accent />
      <Node x={340} y={100} w={130} h={50} text="Mutation" sub="database write" />
      <Node x={340} y={20} w={260} h={40} text="revalidatePath / revalidateTag" sub="marks cached data stale" />
      <Node x={500} y={100} w={130} h={50} text="UI reflects new data" sub="re-render with fresh data" accent />
      <Arrow d="M140 125 H 166" />
      <Arrow d="M310 125 H 336" />
      <Arrow d="M405 100 V 60" />
      <Arrow d="M470 125 H 496" />
      <Pulse path="M140 125 H 496" dur={3} />
      <text x={20} y={200} className={small}>no separate API route: the client calls the server function directly — the network request is</text>
      <text x={20} y={216} className={small}>an implementation detail Next.js generates for you (a POST to the action's endpoint under the hood)</text>
      <text x={20} y={238} className={small}>because a Server Action is reachable the instant it exists, it must validate/authorize like any public endpoint</text>
    </Frame>
  );
}

function ActionStateMachine() {
  return (
    <Frame title="useActionState drives a small state machine" height={260}>
      <Defs />
      <Node x={30} y={30} w={150} h={50} text="idle" sub="form ready, no request in flight" accent />
      <Node x={250} y={30} w={150} h={50} text="pending" sub="isPending === true" accent />
      <Node x={470} y={0} w={150} h={50} text="success" sub="state holds new data" />
      <Node x={470} y={90} w={150} h={50} text="error" sub="state holds field errors" />
      <Arrow d="M180 55 H 246" />
      <Arrow d="M400 45 C 430 30, 440 25, 466 25" />
      <Arrow d="M400 65 C 430 90, 440 100, 466 110" />
      <Arrow d="M470 30 C 350 0, 200 -10, 105 26" dashed />
      <Arrow d="M470 120 C 350 160, 200 150, 105 60" dashed />
      <Pulse path="M180 55 H 246" dur={2} />
      <text x={20} y={190} className={small}>formAction() moves idle → pending immediately; the action function's return value becomes the</text>
      <text x={20} y={206} className={small}>next state — success or error — without ever throwing or needing separate loading/error useState</text>
      <text x={20} y={228} className={small}>dashed arrows: submitting again from success/error returns to pending, restarting the cycle</text>
    </Frame>
  );
}

function OptimisticVsPessimistic() {
  return (
    <Frame title="Optimistic vs pessimistic UI, on the same timeline" height={280}>
      <Defs />
      <text x={20} y={26} className={label}>Optimistic — useOptimistic</text>
      <Node x={20} y={38} w={160} h={44} text="Click 'Like'" accent />
      <Node x={200} y={38} w={200} h={44} text="UI updates instantly" sub="temporary optimistic value" accent />
      <Node x={420} y={38} w={200} h={44} text="Server confirms (or fails)" sub="reconciles or rolls back" />
      <Arrow d="M182 60 H 196" />
      <Arrow d="M402 60 H 416" />
      <Pulse path="M182 60 H 600" dur={2.6} />
      <text x={20} y={104} className={small}>the user never waits — the risk is a brief flash back if the server rejects the action</text>

      <text x={20} y={150} className={label}>Pessimistic — wait for confirmation</text>
      <Node x={20} y={162} w={160} h={44} text="Click 'Delete'" />
      <Node x={200} y={162} w={200} h={44} text="UI shows a pending state" sub="spinner, disabled button" />
      <Node x={420} y={162} w={200} h={44} text="UI updates only after confirmation" accent />
      <Arrow d="M182 184 H 196" />
      <Arrow d="M402 184 H 416" />
      <text x={20} y={228} className={small}>slower to feel, but the UI is never wrong — the right default for destructive or failure-prone actions</text>
    </Frame>
  );
}

function ValidationLayers() {
  return (
    <Frame title="Two validation layers between input and mutation" height={260}>
      <Defs />
      <Node x={20} y={90} w={150} h={50} text="User input" accent />
      <Node x={210} y={20} w={200} h={50} text="Client-side check" sub="fast, instant feedback — skippable" />
      <Node x={210} y={130} w={200} h={50} text="Server-side check" sub="authoritative — cannot be bypassed" accent />
      <Node x={470} y={130} w={150} h={50} text="Mutation allowed" accent />
      <Arrow d="M170 100 C 190 70, 195 50, 206 45" />
      <Arrow d="M170 120 C 190 130, 195 145, 206 155" />
      <Arrow d="M310 70 C 340 90, 350 100, 360 120" dashed />
      <Arrow d="M410 155 H 466" />
      <Pulse path="M170 120 C 190 130, 195 145, 206 155 M410 155 H 466" dur={2.8} />
      <text x={20} y={210} className={small}>a request can skip the client check entirely (disabled JS, a direct fetch, curl) — it can never skip the server check</text>
      <text x={20} y={228} className={small}>treat client validation as UX polish only; treat server validation as the actual security boundary</text>
    </Frame>
  );
}

function CrudDataFlow() {
  return (
    <Frame title="A CRUD feature end to end" height={320}>
      <Defs />
      <Node x={20} y={20} w={160} h={50} text="UI action" sub="create / edit / delete / toggle" accent />
      <Node x={220} y={20} w={160} h={50} text="Server Action" sub="validates + authorizes" accent />
      <Node x={420} y={20} w={180} h={50} text="Simulated persistence" sub="in-memory task list" />
      <Node x={420} y={110} w={180} h={50} text="revalidate" sub="marks list stale" />
      <Node x={220} y={110} w={160} h={50} text="UI update" sub="fresh state rendered" accent />
      <Arrow d="M182 45 H 216" />
      <Arrow d="M382 45 H 416" />
      <Arrow d="M510 72 V 106" />
      <Arrow d="M418 135 H 384" />
      <Arrow d="M218 135 H 184" dashed />
      <Pulse path="M182 45 H 510 V106 H384 H218" dur={3.4} />
      <Node x={20} y={200} w={340} h={60} text="Optimistic layer" sub="toggle-complete updates the UI before the action resolves, rolls back on failure" accent />
      <Node x={380} y={200} w={220} h={60} text="Validation layer" sub="delete requires confirmation + server-side check before it runs" />
      <text x={20} y={296} className={small}>dashed arrow: the UI can update optimistically ahead of the persistence step confirming</text>
    </Frame>
  );
}

function RouteHandlerFlow() {
  return (
    <Frame title="Request → route.ts → handler function → response" height={260}>
      <Defs />
      <Node x={10} y={100} w={130} h={50} text="GET /api/tasks" sub="incoming request" accent />
      <Node x={170} y={100} w={170} h={50} text="app/api/tasks/route.ts" sub="matched by folder path" accent />
      <Node x={370} y={40} w={220} h={44} text="export async function GET(request)" sub="method → function name" />
      <Node x={370} y={148} w={220} h={44} text="export async function POST(request)" sub="only called for POST" />
      <Node x={620 - 130} y={220} w={130} h={40} text="Response.json(...)" sub="sent back to the caller" accent />
      <Arrow d="M140 125 H 166" />
      <Arrow d="M340 112 C 355 90, 360 70, 366 62" />
      <Arrow d="M340 138 C 355 155, 360 165, 366 170" />
      <Arrow d="M480 84 V 216" dashed />
      <Pulse path="M140 125 H 340" dur={2.4} />
      <text x={10} y={200} className={small}>same folder-to-URL mapping as page.tsx — only the file name and export shape differ</text>
      <text x={10} y={216} className={small}>a method with no matching export automatically responds 405, with nothing extra to write</text>
    </Frame>
  );
}

function MiddlewarePipeline() {
  return (
    <Frame title="Middleware intercepts before the router ever matches a route" height={280}>
      <Defs />
      <Node x={10} y={100} w={140} h={50} text="Incoming request" accent />
      <Node x={190} y={100} w={160} h={50} text="middleware.ts" sub="Edge Runtime, matcher-scoped" accent />
      <Node x={400} y={20} w={210} h={44} text="Pass through" sub="NextResponse.next()" />
      <Node x={400} y={100} w={210} h={44} text="Redirect" sub="URL changes" />
      <Node x={400} y={180} w={210} h={44} text="Rewrite" sub="URL stays, content changes" />
      <Arrow d="M150 125 H 186" />
      <Arrow d="M350 108 C 370 80, 380 60, 396 44" />
      <Arrow d="M350 120 H 396" />
      <Arrow d="M350 132 C 370 160, 380 180, 396 198" />
      <text x={620} y={44} className={small} textAnchor="end">→ router</text>
      <Pulse path="M150 125 H 350" dur={2.2} />
      <text x={10} y={240} className={small}>the Edge Runtime trades full Node.js APIs for a fast start — middleware sits on the hot path of every matched request</text>
      <text x={10} y={256} className={small}>a missing or overly broad matcher means this cost is paid by requests that never needed it</text>
    </Frame>
  );
}

function AuthSessionFlow() {
  return (
    <Frame title="Login to protected access, and the checks along the way" height={280}>
      <Defs />
      <Node x={10} y={20} w={150} h={44} text="Login succeeds" sub="session created" accent />
      <Node x={210} y={20} w={200} h={44} text="Session cookie" sub="attached automatically by the browser" accent />
      <Node x={10} y={110} w={150} h={50} text="Later request" sub="carries the session cookie" />
      <Node x={210} y={110} w={200} h={50} text="Middleware check" sub="fast, coarse gate" />
      <Node x={460} y={110} w={160} h={50} text="Server Component" sub="authoritative check" accent />
      <Node x={210} y={200} w={200} h={44} text="Redirect to /login" sub="if no session" />
      <Node x={460} y={200} w={160} h={44} text="Access granted" sub="data fetched, scoped to user" accent />
      <Arrow d="M160 42 H 206" />
      <Arrow d="M160 135 H 206" />
      <Arrow d="M410 135 H 456" />
      <Arrow d="M310 154 V 196" dashed />
      <Arrow d="M540 154 V 196" />
      <Pulse path="M160 135 H 540" dur={2.6} />
      <text x={10} y={260} className={small}>client-side conditionals never appear in this diagram on purpose — hiding UI is not one of the real checks</text>
    </Frame>
  );
}

function PrismaConnectionFlow() {
  return (
    <Frame title="Prisma Client → connection pool → PostgreSQL" height={260}>
      <Defs />
      <Node x={10} y={100} w={170} h={50} text="Server Component / Action" sub="await db.post.findMany()" accent />
      <Node x={230} y={100} w={150} h={50} text="Prisma Client" sub="generated from schema.prisma" accent />
      <Node x={430} y={100} w={170} h={50} text="Connection pool" sub="bounded, reused connections" />
      <Node x={430} y={20} w={170} h={40} text="PostgreSQL" sub="hard limit on connections" accent />
      <Arrow d="M180 125 H 226" />
      <Arrow d="M380 125 H 426" />
      <Arrow d="M515 96 V 64" />
      <Pulse path="M180 125 H 515 V64" dur={2.8} />
      <text x={10} y={200} className={small}>Client Components never appear here — database access is server-only, so this diagram has no client-side branch</text>
      <text x={10} y={216} className={small}>serverless/edge: many short-lived function instances share the pool instead of each holding its own open connection</text>
    </Frame>
  );
}

function ProtectedDashboardLifecycle() {
  return (
    <Frame title="One protected page, four steps in order" height={300}>
      <Defs />
      <Node x={10} y={20} w={170} h={44} text="Request: /dashboard" accent />
      <Node x={210} y={20} w={190} h={44} text="Middleware check" sub="fast, coarse gate" />
      <Node x={430} y={20} w={180} h={44} text="Redirect to /login" sub="if no session" />
      <Node x={210} y={100} w={190} h={50} text="Server Component" sub="re-checks the session — authoritative" accent />
      <Node x={430} y={100} w={180} h={50} text="Scoped query" sub="where: userId = session.userId" accent />
      <Node x={210} y={190} w={400} h={50} text="Server Action available" sub="re-checks session, validates, writes scoped, revalidates" accent />
      <Arrow d="M180 42 H 206" />
      <Arrow d="M400 32 C 415 32, 420 32, 426 32" dashed />
      <Arrow d="M305 64 V 96" />
      <Arrow d="M400 125 H 426" />
      <Arrow d="M310 150 V 186" />
      <Pulse path="M180 42 H 400 V32 M305 64 V96 H400" dur={3} />
      <text x={10} y={260} className={small}>middleware being present never removes the Server Component's own check — both exist for different reasons</text>
      <text x={10} y={276} className={small}>the same session identity is re-derived at every step rather than trusted from the previous one</text>
    </Frame>
  );
}

function MetadataResolution() {
  return (
    <Frame title="Metadata merges down the layout tree, same nesting as UI" height={300}>
      <Defs />
      <rect x={20} y={16} width={600} height={260} rx={12} className="fill-ink-800 stroke-ink-600" strokeWidth={1} />
      <text x={36} y={40} className={label}>app/layout.tsx</text>
      <text x={36} y={58} className={small}>title: template "%s | Acme", openGraph.siteName: "Acme"</text>
      <rect x={56} y={70} width={540} height={180} rx={10} className="fill-ink-700/60 stroke-ink-600" strokeWidth={1} />
      <text x={72} y={94} className={label}>app/blog/layout.tsx</text>
      <text x={72} y={112} className={small}>openGraph.images: default blog image</text>
      <rect x={92} y={124} width={200} height={100} rx={8} className="fill-ember-500/10 stroke-ember-500" strokeWidth={1} />
      <text x={192} y={148} textAnchor="middle" className={label}>page.tsx</text>
      <text x={192} y={166} textAnchor="middle" className={small}>title: "Post title"</text>
      <text x={192} y={182} textAnchor="middle" className={small}>openGraph.images: post image</text>
      <Node x={340} y={124} w={230} h={100} text="Resolved <head>" sub="title templated + own image wins" accent />
      <Arrow d="M292 174 H 336" />
      <Pulse path="M292 174 H 336" dur={2} />
      <text x={36} y={270} className={small}>each layer contributes fields; the most specific layer wins per field, not per object</text>
    </Frame>
  );
}

function AssetOptimizationTimeline() {
  return (
    <Frame title="Loading timeline: unoptimized vs optimized" height={300}>
      <Defs />
      <text x={20} y={26} className={label}>Unoptimized</text>
      <Node x={20} y={38} w={170} h={44} text="Unsized <img>" sub="layout shift when it loads" />
      <Node x={210} y={38} w={190} h={44} text="Render-blocking font request" sub="external font CDN" />
      <Node x={420} y={38} w={180} h={44} text="Blocking 3rd-party <script>" sub="delays interactivity" />
      <text x={20} y={104} className={small}>visible content jumps as each resource arrives late and unannounced</text>

      <text x={20} y={150} className={label}>Optimized — next/image, next/font, next/script</text>
      <Node x={20} y={162} w={170} h={44} text="next/image" sub="width/height reserved — no shift" accent />
      <Node x={210} y={162} w={190} h={44} text="next/font" sub="self-hosted at build time" accent />
      <Node x={420} y={162} w={180} h={44} text="next/script lazyOnload" sub="loads after page is interactive" accent />
      <rect x={20} y={220} width={580} height={4} rx={2} className="fill-mist-500/40" />
      <circle cx={30} cy={222} r={5} className={ember} />
      <circle cx={300} cy={222} r={5} className={ember} />
      <circle cx={570} cy={222} r={5} className={ember} />
      <Pulse path="M30 222 H 570" dur={3} />
      <text x={20} y={256} className={small}>reserved space + self-hosted assets + deferred scripts — nothing shifts, nothing blocks the main thread early</text>
    </Frame>
  );
}

function TestingPyramid() {
  return (
    <Frame title="The testing pyramid, mapped to Next.js concepts" height={320}>
      <Defs />
      <Node x={220} y={20} w={200} h={50} text="E2E" sub="Playwright — full user flows across real pages" accent />
      <Node x={140} y={100} w={360} h={50} text="Integration" sub="component behavior, Client Components, forms" />
      <Node x={60} y={180} w={520} h={50} text="Unit" sub="pure functions, utilities, the logic Server Components call" accent />
      <Arrow d="M320 70 V 96" />
      <Arrow d="M320 150 V 176" />
      <Pulse path="M320 70 V 230" dur={2.6} />
      <text x={20} y={260} className={small}>Server Components are awkward to render in a unit test — test the data/logic functions they call instead</text>
      <text x={20} y={278} className={small}>Client Components test like ordinary React components; full flows (login, checkout) belong at the E2E layer</text>
      <text x={20} y={296} className={small}>more tests at the base, fewer (but higher-value) tests at the top — cost and confidence trade off by layer</text>
    </Frame>
  );
}

function EnvironmentPipeline() {
  return (
    <Frame title="One build artifact, promoted through environments" height={280}>
      <Defs />
      <Node x={10} y={100} w={130} h={50} text="Local" sub="next dev, .env.local" accent />
      <Node x={180} y={100} w={130} h={50} text="Preview" sub="per-PR deploy" />
      <Node x={350} y={100} w={130} h={50} text="Staging" sub="pre-prod checks" />
      <Node x={520} y={100} w={100} h={50} text="Production" sub="live traffic" accent />
      <Arrow d="M140 125 H 176" />
      <Arrow d="M310 125 H 346" />
      <Arrow d="M480 125 H 516" />
      <Pulse path="M140 125 H 516" dur={3} />
      <Node x={180} y={20} w={440} h={44} text="next build output" sub="the same static assets + server bundle flow through every stage" accent />
      <Arrow d="M400 64 V 96" dashed />
      <text x={10} y={200} className={small}>env vars are injected per stage, not baked into the artifact — the same build promotes forward unchanged</text>
      <text x={10} y={218} className={small}>NEXT_PUBLIC_* vars are bundled into client code at build time; a missing var per-stage is a common deploy bug</text>
    </Frame>
  );
}

function ProductionArchitectureOverview() {
  return (
    <Frame title="A request's full journey through a production Next.js app" height={420}>
      <Defs />
      <Node x={10} y={10} w={160} h={50} text="Incoming request" sub="/dashboard/reports" accent />
      <Node x={200} y={10} w={170} h={50} text="Middleware" sub="Edge — auth gate, redirects" />
      <Node x={400} y={10} w={220} h={50} text="Rendering strategy per route" sub="static / dynamic / streaming (Module 3)" accent />

      <Node x={400} y={90} w={220} h={56} text="Caching layers" sub="request memo → data cache → route cache → router cache (Module 4)" accent />
      <Node x={200} y={90} w={170} h={56} text="Server Component" sub="re-checks session, fetches scoped data" />

      <Node x={10} y={190} w={160} h={56} text="Mutation path" sub="Server Action or Route Handler (Modules 5–6)" accent />
      <Node x={200} y={190} w={170} h={56} text="Validation" sub="client = UX polish, server = real boundary" />
      <Node x={400} y={190} w={220} h={56} text="Revalidation" sub="revalidatePath/Tag clears the right cache layer" accent />

      <Node x={150} y={280} w={340} h={56} text="Folder structure" sub="colocation near features vs central shared folders (Module 1)" />

      <Arrow d="M170 35 H 196" />
      <Arrow d="M370 35 H 396" />
      <Arrow d="M480 60 V 86" />
      <Arrow d="M370 118 H 396" />
      <Arrow d="M200 146 C 150 160, 100 175, 90 186" />
      <Arrow d="M170 218 H 196" />
      <Arrow d="M370 218 H 396" />
      <Pulse path="M170 35 H 480 V146 H90 V218 H480" dur={4} />
      <text x={10} y={370} className={small}>every route makes its own rendering + caching + mutation choices; folder structure is the organizing layer that keeps</text>
      <text x={10} y={388} className={small}>hundreds of such routes navigable at real scale — none of these decisions are made in isolation from the others</text>
    </Frame>
  );
}

export const diagramRegistry: Record<string, React.ComponentType> = {
  "rendering-spectrum": RenderingSpectrum,
  "component-tree": ComponentTree,
  "file-routing": FileRouting,
  "navigation-flow": NavigationFlow,
  "layout-nesting": LayoutNesting,
  "dynamic-matching": DynamicMatching,
  "server-component-boundary": ServerComponentBoundary,
  "client-boundary-props": ClientBoundaryProps,
  "composition-children-slot": CompositionChildrenSlot,
  "build-vs-request-time": BuildVsRequestTime,
  "streaming-timeline": StreamingTimeline,
  "loading-error-boundaries": LoadingErrorBoundaries,
  "fetch-waterfall": FetchWaterfall,
  "cache-scopes": CacheScopes,
  "revalidation-timeline": RevalidationTimeline,
  "caching-layers-stack": CachingLayersStack,
  "parallel-vs-sequential": ParallelVsSequential,
  "server-action-flow": ServerActionFlow,
  "action-state-machine": ActionStateMachine,
  "optimistic-vs-pessimistic": OptimisticVsPessimistic,
  "validation-layers": ValidationLayers,
  "crud-data-flow": CrudDataFlow,
  "route-handler-flow": RouteHandlerFlow,
  "middleware-pipeline": MiddlewarePipeline,
  "auth-session-flow": AuthSessionFlow,
  "prisma-connection-flow": PrismaConnectionFlow,
  "protected-dashboard-lifecycle": ProtectedDashboardLifecycle,
  "metadata-resolution": MetadataResolution,
  "asset-optimization-timeline": AssetOptimizationTimeline,
  "testing-pyramid": TestingPyramid,
  "environment-pipeline": EnvironmentPipeline,
  "production-architecture-overview": ProductionArchitectureOverview,
};
