/**
 * Every lesson is pure data. The app renders lessons generically, so new
 * lessons can be added under /lessons without touching application code.
 */

export interface LessonFile {
  /** Absolute sandbox path, e.g. "/App.tsx" */
  path: string;
  code: string;
  /** Read-only files (instructions, framework shims) can't be edited. */
  readOnly?: boolean;
  /** Hidden files run in the sandbox but don't show in the file explorer. */
  hidden?: boolean;
}

export type ValidationRule =
  | { type: "code-includes"; file: string; pattern: string; message: string }
  | { type: "code-regex"; file: string; regex: string; flags?: string; message: string }
  | { type: "dom-exists"; selector: string; message: string }
  | { type: "dom-text"; selector: string; includes: string; message: string }
  | { type: "dom-count"; selector: string; min: number; message: string };

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  /** Markdown instructions shown in the theory panel. */
  instructions: string;
  validation: ValidationRule[];
  hint?: string;
}

export type QuizQuestion = {
  id: string;
  type: "mcq" | "tf" | "code-prediction" | "debugging";
  question: string;
  /** Optional code block shown with the question. */
  code?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export interface Lesson {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  /** Markdown. Supports ::diagram{key} lines that render registered SVG diagrams. */
  theory: string;
  files: LessonFile[];
  solutionFiles: LessonFile[];
  exercises: Exercise[];
  quiz: QuizQuestion[];
  keyTakeaways: string[];
  cheatSheet: string;
  interviewQuestions: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  /** Phase-2 modules: shown in the sidebar as a roadmap, not yet clickable. */
  comingSoon?: boolean;
  plannedLessons?: string[];
}
