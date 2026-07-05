import { notFound } from "next/navigation";
import { curriculum, findLesson } from "@/lessons";
import { LessonClient } from "@/components/learn/LessonClient";

export function generateStaticParams() {
  return curriculum
    .filter((m) => !m.comingSoon)
    .flatMap((m) => m.lessons.map((l) => ({ moduleId: m.id, lessonId: l.id })));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { moduleId, lessonId } = await params;
  const found = findLesson(moduleId, lessonId);
  if (!found) notFound();

  return (
    <LessonClient
      moduleId={found.module.id}
      moduleTitle={found.module.title}
      lesson={found.lesson}
      prev={found.prev}
      next={found.next}
    />
  );
}
