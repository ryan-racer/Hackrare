/**
 * Agent 3 — Rare Disease Evidence Pack Builder
 *
 * Takes longitudinal symptom data, maps to HPO terms, assembles candidate
 * conditions to consider (NOT a diagnosis), and generates a clinician-facing
 * markdown Evidence Pack.
 */

import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type HpoTerm = {
  label: string;
  hpoId?: string; // e.g. "HP:0001250" — only set if model is confident
  verified: boolean;
};

export type CandidateCondition = {
  name: string;
  orphaCode?: string; // e.g. "ORPHA:231" — only if model has it
  matchedTerms: string[]; // HPO labels that match
  discriminators: {
    strengthen: string[];
    weaken: string[];
  };
  references: Array<{
    label: string;
    url?: string;
    pmid?: string;
    verified: boolean;
  }>;
};

export type EvidencePackResult = {
  reportMd: string;
  hpoTerms: HpoTerm[];
  candidateConditions: CandidateCondition[];
};

export type SymptomEntry = {
  date: string;
  symptoms: Array<{
    name: string;
    severity?: number;
    duration?: string;
    frequency?: string;
    location?: string;
    character?: string;
    triggers?: string;
    alleviating?: string;
    associated?: string;
    dailyImpact?: string;
  }>;
  source: "checkin" | "chat";
};

export type PatientContext = {
  name: string;
  dateOfBirth?: string | null;
  currentDiagnoses?: string[]; // existing known diagnoses
  currentMedications?: Array<{ name: string; dose?: string; frequency?: string }>;
  allergies?: string | null;
};

export async function buildEvidencePack(
  patient: PatientContext,
  symptoms: SymptomEntry[],
  periodDays: number
): Promise<EvidencePackResult> {
  if (!openai) {
    return {
      reportMd: "[Evidence pack unavailable: OPENAI_API_KEY not set]",
      hpoTerms: [],
      candidateConditions: [],
    };
  }

  const symptomSummary = symptoms
    .map((e) => {
      const s = e.symptoms
        .map((sym) => {
          const parts = [sym.name];
          if (sym.severity != null) parts.push(`severity ${sym.severity}/10`);
          if (sym.character) parts.push(sym.character);
          if (sym.location) parts.push(`(${sym.location})`);
          if (sym.duration) parts.push(`duration: ${sym.duration}`);
          if (sym.frequency) parts.push(`frequency: ${sym.frequency}`);
          if (sym.triggers) parts.push(`triggers: ${sym.triggers}`);
          if (sym.alleviating) parts.push(`relieved by: ${sym.alleviating}`);
          if (sym.associated) parts.push(`associated: ${sym.associated}`);
          if (sym.dailyImpact) parts.push(`impact: ${sym.dailyImpact}`);
          return parts.join(", ");
        })
        .join("; ");
      return `[${e.date}] (${e.source}) ${s}`;
    })
    .join("\n");

  const systemPrompt = `You are SignalBridge, an AI copilot for rare disease coordination.
You support clinicians by organizing longitudinal symptom data into structured references.
You DO NOT diagnose. You generate "conditions to consider / discuss" for clinicians only.

CRITICAL RULES:
- Never hallucinate citations. Only output HPO IDs if you are highly confident. Mark uncertain ones as verified:false.
- Only output OrphaCodes or PMIDs you are highly confident exist. Otherwise set verified:false and omit the ID.
- Candidate conditions are NOT diagnoses. Always frame as "conditions to consider / discuss with clinician".
- Maximum 8 candidate conditions.
- Be precise, use clinical language for clinician sections.`;

  const userPrompt = `Patient: ${patient.name}${patient.dateOfBirth ? `, DOB: ${patient.dateOfBirth}` : ""}
Known diagnoses: ${patient.currentDiagnoses?.join(", ") || "None recorded"}
Current medications: ${patient.currentMedications?.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`).join(", ") || "None recorded"}
Allergies: ${patient.allergies || "None recorded"}
Data period: last ${periodDays} days (${symptoms.length} entries)

SYMPTOM TIMELINE:
${symptomSummary || "No structured symptom data available."}

---
Your task: Produce a JSON object with this EXACT structure:
{
  "hpoTerms": [
    { "label": "string", "hpoId": "HP:XXXXXXX or null", "verified": true|false }
  ],
  "candidateConditions": [
    {
      "name": "string",
      "orphaCode": "ORPHA:XXX or null",
      "matchedTerms": ["hpo label 1", ...],
      "discriminators": {
        "strengthen": ["finding that would support this", ...],
        "weaken": ["finding that would argue against this", ...]
      },
      "references": [
        { "label": "string", "url": "string or null", "pmid": "string or null", "verified": true|false }
      ]
    }
  ],
  "patientSummary": "one paragraph clinical summary of the patient's symptom picture",
  "clinicianQuestions": ["question 1", ...],
  "testsToDiscuss": ["test/topic 1", ...]
}

Only output valid JSON. No markdown fences. No extra text.`;

  let parsed: {
    hpoTerms: HpoTerm[];
    candidateConditions: CandidateCondition[];
    patientSummary: string;
    clinicianQuestions: string[];
    testsToDiscuss: string[];
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("Evidence pack LLM error:", e);
    return {
      reportMd: "[Evidence pack generation failed]",
      hpoTerms: [],
      candidateConditions: [],
    };
  }

  const hpoTerms: HpoTerm[] = (parsed.hpoTerms ?? []).map((t) => ({
    label: t.label,
    hpoId: t.hpoId ?? undefined,
    verified: t.verified ?? false,
  }));

  const candidateConditions: CandidateCondition[] = (parsed.candidateConditions ?? []);

  // Build markdown report
  const now = new Date().toISOString().split("T")[0];
  const hpoSection = hpoTerms.length
    ? hpoTerms
        .map((t) => `- **${t.label}**${t.hpoId ? ` (${t.hpoId}${t.verified ? "" : " — needs verification"})` : " (HPO ID needs verification)"}`)
        .join("\n")
    : "_None mapped_";

  const conditionsSection = candidateConditions.length
    ? candidateConditions
        .map((c) => {
          const refs = c.references?.length
            ? c.references
                .map(
                  (r) =>
                    `  - ${r.label}${r.pmid ? ` (PMID: ${r.pmid}${r.verified ? "" : " — needs verification"})` : ""}${r.url && !r.pmid ? ` — ${r.url}${r.verified ? "" : " (needs verification)"}` : ""}`
                )
                .join("\n")
            : "  - No references provided";
          return `### ${c.name}${c.orphaCode ? ` (${c.orphaCode})` : ""}
**Matched phenotypes:** ${c.matchedTerms?.join(", ") || "—"}

**What would strengthen this hypothesis:**
${c.discriminators?.strengthen?.map((s) => `- ${s}`).join("\n") || "—"}

**What would argue against:**
${c.discriminators?.weaken?.map((s) => `- ${s}`).join("\n") || "—"}

**References:**
${refs}`;
        })
        .join("\n\n---\n\n")
    : "_Insufficient data to generate candidate conditions._";

  const questionsSection = parsed.clinicianQuestions?.length
    ? parsed.clinicianQuestions.map((q) => `- ${q}`).join("\n")
    : "_None generated_";

  const testsSection = parsed.testsToDiscuss?.length
    ? parsed.testsToDiscuss.map((t) => `- ${t}`).join("\n")
    : "_None generated_";

  const reportMd = `# SignalBridge Evidence Pack
**Patient:** ${patient.name} | **Generated:** ${now} | **Period:** last ${periodDays} days | **Entries:** ${symptoms.length}

> ⚠️ This is NOT a diagnosis. These are conditions to consider and discuss with the patient's care team.

---

## Patient Summary
${parsed.patientSummary ?? "_No summary generated_"}

---

## Standardized Phenotypes (HPO)
${hpoSection}

---

## Candidate Conditions to Consider
> For clinician discussion only. Not diagnostic.

${conditionsSection}

---

## Questions for Clinician Visit
${questionsSection}

---

## Tests / Topics to Discuss
${testsSection}

---
_Generated by SignalBridge · All HPO IDs marked "needs verification" require manual confirmation · Candidates are for discussion, not diagnosis_`;

  return { reportMd, hpoTerms, candidateConditions };
}
