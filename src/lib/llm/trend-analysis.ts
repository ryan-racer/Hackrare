import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateTrendAnalysis(
  entries: { date: string; summary: string }[]
): Promise<string> {
  if (!openai) {
    return "[AI trend analysis unavailable: OPENAI_API_KEY not set]";
  }

  const text = entries
    .map((e) => `Date: ${e.date}\nSummary: ${e.summary}`)
    .join("\n\n---\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a clinical assistant. Given a list of patient check-in summaries over time, write a short paragraph (2-4 sentences) highlighting patterns, trends, or notable observations that would help a physician (e.g. frequency patterns, triggers, severity trends). Be concise and use medical language.",
      },
      {
        role: "user",
        content: `Analyze these check-in summaries:\n\n${text}`,
      },
    ],
    max_tokens: 400,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "No analysis generated.";
}
