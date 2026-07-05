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

export const diagramRegistry: Record<string, React.ComponentType> = {
  "rendering-spectrum": RenderingSpectrum,
  "component-tree": ComponentTree,
  "file-routing": FileRouting,
  "navigation-flow": NavigationFlow,
  "layout-nesting": LayoutNesting,
  "dynamic-matching": DynamicMatching,
};
