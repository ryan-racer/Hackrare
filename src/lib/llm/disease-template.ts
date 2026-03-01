/**
 * Agent 4 — Disease-Specific Management
 *
 * Triggered when a diagnosis is confirmed or a working diagnosis is entered.
 * Generates disease-specific check-in templates and monitoring rules.
 */

import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type TemplateField = {
  id: string;
  label: string;
  type: "slider" | "boolean" | "text" | "select" | "checklist";
  required: boolean;
  options?: string[]; // for select / checklist
  min?: number; // for slider
  max?: number; // for slider
  redFlag?: boolean; // if true, this field triggers safety check
  redFlagThreshold?: number; // for sliders: value at or above triggers red flag
  hint?: string;
};

export type CheckinTemplateJson = {
  diseaseLabel: string;
  diseaseId?: string;
  cadence: "daily" | "weekly" | "flare";
  estimatedSeconds: number; // target <= 60 for daily
  sections: Array<{
    title: string;
    fields: TemplateField[];
  }>;
  redFlagScreen: string[]; // questions/statements to check at start
  redFlagInstructions: string; // what to display if red flag hit
};

export type AlertRule = {
  id: string;
  field: string; // field id to evaluate
  condition: "gte" | "lte" | "eq" | "missing_streak";
  threshold?: number;
  streakDays?: number; // for missing_streak
  severity: "info" | "watch" | "urgent";
  title: string;
  message: string;
};

export type DiseaseTemplateResult = {
  dailyTemplate: CheckinTemplateJson;
  flareTemplate: CheckinTemplateJson;
  weeklyTemplate: CheckinTemplateJson;
  alertRules: AlertRule[];
};

export async function generateDiseaseTemplate(
  diseaseLabel: string,
  diseaseId?: string | null
): Promise<DiseaseTemplateResult> {
  if (!openai) {
    return buildFallbackTemplate(diseaseLabel, diseaseId);
  }

  const systemPrompt = `You are SignalBridge, an AI copilot for rare disease management.
Your task is to generate structured check-in templates for patients with a confirmed (or working) diagnosis.
Templates must be renderable by a frontend form builder — use only the specified field types.
Keep daily templates <= 60 seconds (5–8 questions max).
Never include diagnostic or prescriptive language. Frame as "tracking" only.`;

  const userPrompt = `Disease: ${diseaseLabel}${diseaseId ? ` (${diseaseId})` : ""}

Generate a JSON object with this EXACT structure:
{
  "dailyTemplate": {
    "diseaseLabel": "${diseaseLabel}",
    "diseaseId": "${diseaseId ?? ""}",
    "cadence": "daily",
    "estimatedSeconds": <number, aim for 45-60>,
    "sections": [
      {
        "title": "section title",
        "fields": [
          {
            "id": "unique_snake_case_id",
            "label": "Question label",
            "type": "slider|boolean|text|select|checklist",
            "required": true|false,
            "options": ["opt1","opt2"] or null,
            "min": 0,
            "max": 10,
            "redFlag": true|false,
            "redFlagThreshold": <number or null>,
            "hint": "short helper text or null"
          }
        ]
      }
    ],
    "redFlagScreen": ["Severe chest pain", "Difficulty breathing", ...],
    "redFlagInstructions": "If you are experiencing any of the above, seek emergency care immediately or call emergency services."
  },
  "flareTemplate": { ...same structure, cadence: "flare", focused on flare characterization },
  "weeklyTemplate": { ...same structure, cadence: "weekly", broader review },
  "alertRules": [
    {
      "id": "unique_id",
      "field": "field_id_from_any_template",
      "condition": "gte|lte|eq|missing_streak",
      "threshold": <number or null>,
      "streakDays": <number or null>,
      "severity": "info|watch|urgent",
      "title": "Alert title",
      "message": "Alert message describing what was detected and what to consider"
    }
  ]
}

Only output valid JSON. No markdown fences. No extra text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as DiseaseTemplateResult;

    // Ensure cadence fields are set correctly
    if (parsed.dailyTemplate) parsed.dailyTemplate.cadence = "daily";
    if (parsed.flareTemplate) parsed.flareTemplate.cadence = "flare";
    if (parsed.weeklyTemplate) parsed.weeklyTemplate.cadence = "weekly";

    return parsed;
  } catch (e) {
    console.error("Disease template LLM error:", e);
    return buildFallbackTemplate(diseaseLabel, diseaseId);
  }
}

function buildFallbackTemplate(
  diseaseLabel: string,
  diseaseId?: string | null
): DiseaseTemplateResult {
  const base = (cadence: "daily" | "flare" | "weekly"): CheckinTemplateJson => ({
    diseaseLabel,
    diseaseId: diseaseId ?? undefined,
    cadence,
    estimatedSeconds: 60,
    sections: [
      {
        title: "Symptom Check",
        fields: [
          { id: "overall_severity", label: "Overall symptom severity today", type: "slider", required: true, min: 0, max: 10, redFlag: true, redFlagThreshold: 9 },
          { id: "fatigue", label: "Fatigue level", type: "slider", required: true, min: 0, max: 10 },
          { id: "pain", label: "Pain level (if applicable)", type: "slider", required: false, min: 0, max: 10, redFlag: true, redFlagThreshold: 9 },
          { id: "new_symptoms", label: "Any new or unusual symptoms?", type: "boolean", required: true },
          { id: "new_symptoms_detail", label: "Describe new symptoms (if yes)", type: "text", required: false },
        ],
      },
      {
        title: "Function",
        fields: [
          { id: "daily_activities", label: "Able to perform daily activities?", type: "select", options: ["Fully", "Partially", "Not at all"], required: true },
          { id: "sleep_quality", label: "Sleep quality last night", type: "slider", required: false, min: 0, max: 10 },
        ],
      },
    ],
    redFlagScreen: [
      "Severe chest pain or pressure",
      "Severe difficulty breathing",
      "Loss of consciousness or fainting",
      "Signs of allergic reaction (swelling, hives, throat tightening)",
      "Thoughts of self-harm",
    ],
    redFlagInstructions:
      "If you are experiencing any of the above, seek emergency care immediately or call your local emergency number. Do not continue this check-in.",
  });

  return {
    dailyTemplate: base("daily"),
    flareTemplate: { ...base("flare"), sections: [{ title: "Flare Details", fields: [
      { id: "flare_onset", label: "When did this flare start?", type: "text", required: true, hint: "e.g. 2 hours ago, yesterday morning" },
      { id: "flare_severity", label: "Flare severity", type: "slider", required: true, min: 0, max: 10, redFlag: true, redFlagThreshold: 8 },
      { id: "flare_triggers", label: "Any possible triggers?", type: "text", required: false },
      { id: "flare_meds_taken", label: "Any medications taken for this flare?", type: "text", required: false },
    ]}] },
    weeklyTemplate: base("weekly"),
    alertRules: [
      { id: "high_severity", field: "overall_severity", condition: "gte", threshold: 8, severity: "watch", title: "High symptom severity", message: "Patient reported severity ≥8. Consider reaching out if this persists." },
      { id: "urgent_severity", field: "overall_severity", condition: "gte", threshold: 10, severity: "urgent", title: "Maximum severity reported", message: "Patient reported maximum severity. Follow up immediately." },
      { id: "missed_checkins", field: "overall_severity", condition: "missing_streak", streakDays: 3, severity: "info", title: "Missed check-ins", message: "Patient has not completed a check-in in 3+ days." },
    ],
  };
}

/**
 * Evaluate alert rules against a set of check-in responses.
 * Returns triggered alert payloads.
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  recentResponses: Record<string, unknown>[], // array of rawData from CheckInResponse
  missedStreakDays: number
): Array<{ severity: "info" | "watch" | "urgent"; title: string; message: string }> {
  const triggered: Array<{ severity: "info" | "watch" | "urgent"; title: string; message: string }> = [];

  for (const rule of rules) {
    if (rule.condition === "missing_streak") {
      if (rule.streakDays && missedStreakDays >= rule.streakDays) {
        triggered.push({ severity: rule.severity, title: rule.title, message: rule.message });
      }
      continue;
    }

    for (const response of recentResponses) {
      const val = response[rule.field];
      if (val == null) continue;
      const num = Number(val);
      if (isNaN(num)) continue;
      if (rule.condition === "gte" && rule.threshold != null && num >= rule.threshold) {
        triggered.push({ severity: rule.severity, title: rule.title, message: rule.message });
        break;
      }
      if (rule.condition === "lte" && rule.threshold != null && num <= rule.threshold) {
        triggered.push({ severity: rule.severity, title: rule.title, message: rule.message });
        break;
      }
      if (rule.condition === "eq" && rule.threshold != null && num === rule.threshold) {
        triggered.push({ severity: rule.severity, title: rule.title, message: rule.message });
        break;
      }
    }
  }

  return triggered;
}
