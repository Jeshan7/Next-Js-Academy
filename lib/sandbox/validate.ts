import type { ValidationRule, ValidationResult } from "@/types/lesson";

/**
 * Deterministic validation — no AI involved.
 *
 * Code rules run against the learner's source files.
 * DOM rules run against the live preview document (the srcdoc iframe is
 * same-origin, so we can query it directly).
 */
export function runValidation(
  rules: ValidationRule[],
  files: Record<string, string>,
  doc: Document | null
): ValidationResult[] {
  return rules.map((rule) => {
    let passed = false;
    try {
      switch (rule.type) {
        case "code-includes": {
          const code = files[rule.file] ?? "";
          passed = code.includes(rule.pattern);
          break;
        }
        case "code-regex": {
          const code = files[rule.file] ?? "";
          passed = new RegExp(rule.regex, rule.flags ?? "m").test(code);
          break;
        }
        case "dom-exists": {
          passed = !!doc?.querySelector(rule.selector);
          break;
        }
        case "dom-text": {
          const el = doc?.querySelector(rule.selector);
          passed = !!el && (el.textContent ?? "").includes(rule.includes);
          break;
        }
        case "dom-count": {
          const count = doc?.querySelectorAll(rule.selector).length ?? 0;
          passed = count >= rule.min;
          break;
        }
      }
    } catch {
      passed = false;
    }
    return { rule, passed };
  });
}
