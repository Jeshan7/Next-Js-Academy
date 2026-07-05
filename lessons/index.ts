import type { Module, Lesson } from "@/types/lesson";

import m1l1 from "./module-01/lesson-01";
import m1l2 from "./module-01/lesson-02";
import m1l3 from "./module-01/lesson-03";
import m2l1 from "./module-02/lesson-01";
import m2l2 from "./module-02/lesson-02";
import m2l3 from "./module-02/lesson-03";

/**
 * The full curriculum. Adding a lesson = create a file under /lessons and
 * import it here; no application code changes required.
 *
 * Modules marked comingSoon render in the sidebar as a roadmap (Phase 2).
 */
export const curriculum: Module[] = [
  {
    id: "module-01",
    title: "Foundations",
    description: "Why Next.js exists, the React it's built on, and how folders become an application.",
    lessons: [m1l1, m1l2, m1l3],
  },
  {
    id: "module-02",
    title: "Routing",
    description: "Navigation, persistent layouts, and URL patterns with dynamic segments.",
    lessons: [m2l1, m2l2, m2l3],
  },
  {
    id: "module-03",
    title: "Rendering",
    description: "Server & Client Components, SSR, SSG, ISR and streaming.",
    lessons: [],
    comingSoon: true,
    plannedLessons: [
      "Server Components in depth",
      "Client Components & the 'use client' boundary",
      "Composition patterns across the boundary",
      "Static rendering & generateStaticParams",
      "Dynamic rendering & streaming with Suspense",
      "loading.tsx and error.tsx",
    ],
  },
  {
    id: "module-04",
    title: "Data & Caching",
    description: "Fetching on the server, the caching layers, and revalidation.",
    lessons: [],
    comingSoon: true,
    plannedLessons: [
      "Data fetching in Server Components",
      "Request memoization & the data cache",
      "Time-based and on-demand revalidation",
      "The full router cache model",
      "Parallel & sequential data fetching",
    ],
  },
  {
    id: "module-05",
    title: "Mutations & Forms",
    description: "Server Actions, forms, optimistic UI and validation.",
    lessons: [],
    comingSoon: true,
    plannedLessons: [
      "Server Actions from first principles",
      "Forms with useActionState",
      "Optimistic updates with useOptimistic",
      "Validation & error handling",
      "Project: a full CRUD feature",
    ],
  },
  {
    id: "module-06",
    title: "Backend in Next.js",
    description: "Route Handlers, middleware, authentication and databases.",
    lessons: [],
    comingSoon: true,
    plannedLessons: [
      "Route Handlers (API endpoints)",
      "Middleware & the edge",
      "Authentication patterns & sessions",
      "Prisma & PostgreSQL integration",
      "Project: authenticated dashboard",
    ],
  },
  {
    id: "module-07",
    title: "Production",
    description: "Metadata & SEO, performance, testing, deployment and architecture.",
    lessons: [],
    comingSoon: true,
    plannedLessons: [
      "Metadata API & SEO",
      "Image, font and script optimization",
      "Testing Next.js applications",
      "Deployment & environments",
      "Production architecture patterns",
    ],
  },
];

export interface OrderedLesson {
  module: Module;
  lesson: Lesson;
  index: number;
}

export const orderedLessons: OrderedLesson[] = curriculum
  .filter((m) => !m.comingSoon)
  .flatMap((m) => m.lessons.map((lesson) => ({ module: m, lesson })))
  .map((entry, index) => ({ ...entry, index }));

export function findLesson(moduleId: string, lessonId: string) {
  const mod = curriculum.find((m) => m.id === moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);
  if (!mod || !lesson) return null;
  const flat = orderedLessons.find((o) => o.lesson.id === lesson.id);
  const prev = flat && flat.index > 0 ? orderedLessons[flat.index - 1] : null;
  const next =
    flat && flat.index < orderedLessons.length - 1 ? orderedLessons[flat.index + 1] : null;
  return { module: mod, lesson, prev, next };
}
