export type QuestionType = "boolean" | "choice" | "scale" | "duration" | "datetime" | "text";

export interface QuestionDef {
  id: string;
  type: QuestionType;
  prompt: string;
  showIf?: string; // question id; show only when that answer is truthy
  options?: string[];
  min?: number;
  max?: number;
}

export interface QuestionFlowDef {
  trigger?: string;
  questions: QuestionDef[];
}

export const MIGRAINE_QUESTION_FLOW: QuestionFlowDef = {
  trigger: "hadHeadache",
  questions: [
    {
      id: "hadHeadache",
      type: "boolean",
      prompt: "Did you have a headache since we last spoke?",
    },
    {
      id: "location",
      type: "choice",
      prompt: "Where was the pain located?",
      showIf: "hadHeadache",
      options: ["unilateral left", "unilateral right", "bilateral", "back of head", "other"],
    },
    {
      id: "intensity",
      type: "scale",
      prompt: "How strong was the pain (1-10)?",
      showIf: "hadHeadache",
      min: 1,
      max: 10,
    },
    {
      id: "quality",
      type: "choice",
      prompt: "What type of pain was it?",
      showIf: "hadHeadache",
      options: ["throbbing", "pressure", "stabbing", "burning", "other"],
    },
    {
      id: "duration",
      type: "text",
      prompt: "Approximately how long did it last? (e.g. 30 minutes, 2 hours)",
      showIf: "hadHeadache",
    },
    {
      id: "onset",
      type: "text",
      prompt: "When did it start? (e.g. this morning, yesterday evening)",
      showIf: "hadHeadache",
    },
    {
      id: "notes",
      type: "text",
      prompt: "Any other details you want to note? (triggers, aura, medication, etc.)",
      showIf: "hadHeadache",
    },
  ],
};
