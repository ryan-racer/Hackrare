import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateMedicalSummary(
  templateName: string,
  condition: string,
  rawAnswers: Record<string, unknown>
): Promise<string> {
  const prompt = `You are a medical scribe. Convert the following patient symptom check-in answers into one concise paragraph using precise medical terminology, suitable for a physician's notes. Do not add information that is not in the answers.

Template: ${templateName}
Condition: ${condition}

Patient answers (raw):
${JSON.stringify(rawAnswers, null, 2)}

Write a single paragraph in medical-speak (e.g. "Patient reports bilateral throbbing headache, intensity 7/10, duration approximately 2 hours, onset this morning. No aura reported.").`;

  if (!openai) {
    return `[Summary unavailable: OPENAI_API_KEY not set] Raw data: ${JSON.stringify(rawAnswers)}`;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You output only the medical summary paragraph, no preamble or labels. Use standard clinical terminology.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 500,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text ?? "No summary generated.";
}
