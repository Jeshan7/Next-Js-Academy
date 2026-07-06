import type { Module, Lesson } from "@/types/lesson";

import m1l1 from "./module-01/lesson-01";
import m1l2 from "./module-01/lesson-02";
import m1l3 from "./module-01/lesson-03";
import m2l1 from "./module-02/lesson-01";
import m2l2 from "./module-02/lesson-02";
import m2l3 from "./module-02/lesson-03";
import m3l1 from "./module-03/lesson-01";
import m3l2 from "./module-03/lesson-02";
import m3l3 from "./module-03/lesson-03";
import m3l4 from "./module-03/lesson-04";
import m3l5 from "./module-03/lesson-05";
import m3l6 from "./module-03/lesson-06";
import m4l1 from "./module-04/lesson-01";
import m4l2 from "./module-04/lesson-02";
import m4l3 from "./module-04/lesson-03";
import m4l4 from "./module-04/lesson-04";
import m4l5 from "./module-04/lesson-05";
import m5l1 from "./module-05/lesson-01";
import m5l2 from "./module-05/lesson-02";
import m5l3 from "./module-05/lesson-03";
import m5l4 from "./module-05/lesson-04";
import m5l5 from "./module-05/lesson-05";
import m6l1 from "./module-06/lesson-01";
import m6l2 from "./module-06/lesson-02";
import m6l3 from "./module-06/lesson-03";
import m6l4 from "./module-06/lesson-04";
import m6l5 from "./module-06/lesson-05";
import m7l1 from "./module-07/lesson-01";
import m7l2 from "./module-07/lesson-02";
import m7l3 from "./module-07/lesson-03";
import m7l4 from "./module-07/lesson-04";
import m7l5 from "./module-07/lesson-05";

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
    lessons: [m3l1, m3l2, m3l3, m3l4, m3l5, m3l6],
  },
  {
    id: "module-04",
    title: "Data & Caching",
    description: "Fetching on the server, the caching layers, and revalidation.",
    lessons: [m4l1, m4l2, m4l3, m4l4, m4l5],
  },
  {
    id: "module-05",
    title: "Mutations & Forms",
    description: "Server Actions, forms, optimistic UI and validation.",
    lessons: [m5l1, m5l2, m5l3, m5l4, m5l5],
  },
  {
    id: "module-06",
    title: "Backend in Next.js",
    description: "Route Handlers, middleware, authentication and databases.",
    lessons: [m6l1, m6l2, m6l3, m6l4, m6l5],
  },
  {
    id: "module-07",
    title: "Production",
    description: "Metadata & SEO, performance, testing, deployment and architecture.",
    lessons: [m7l1, m7l2, m7l3, m7l4, m7l5],
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
