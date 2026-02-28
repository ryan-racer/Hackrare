import type { QuestionFlowDef, QuestionDef } from "@/lib/journal-types";

export function getNextQuestion(
  flow: QuestionFlowDef,
  answers: Record<string, unknown>
): QuestionDef | null {
  for (const q of flow.questions) {
    if (answers[q.id] !== undefined && answers[q.id] !== null) continue;
    if (q.showIf !== undefined) {
      const cond = answers[q.showIf];
      if (!cond) return null; // skip this and rest of conditional block; flow done for "no headache"
      if (cond !== true && cond !== "yes" && (typeof cond !== "string" || cond.length === 0))
        return null;
    }
    return q;
  }
  return null;
}

export function isFlowComplete(flow: QuestionFlowDef, answers: Record<string, unknown>): boolean {
  return getNextQuestion(flow, answers) === null;
}

/** Parse user message into a value for the current question type */
export function parseAnswer(question: QuestionDef, message: string): unknown {
  const raw = message.trim().toLowerCase();
  switch (question.type) {
    case "boolean":
      if (["yes", "y", "true", "1", "had headache", "yes i did"].includes(raw)) return true;
      if (["no", "n", "false", "0", "no i didn't", "nope"].includes(raw)) return false;
      return raw.length > 0 ? true : null; // treat other as yes for "had headache"
    case "scale":
      const n = parseInt(message.trim(), 10);
      if (isNaN(n)) return null;
      const min = question.min ?? 0;
      const max = question.max ?? 10;
      return Math.min(max, Math.max(min, n));
    case "choice":
      if (question.options?.some((o) => o.toLowerCase() === raw)) return message.trim();
      const idx = question.options?.findIndex((o) => o.toLowerCase().startsWith(raw) || raw.startsWith(o.toLowerCase()));
      if (idx !== undefined && idx >= 0) return question.options![idx];
      return message.trim();
    case "duration":
    case "datetime":
    case "text":
    default:
      return message.trim() || null;
  }
}
