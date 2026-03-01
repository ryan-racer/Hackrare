import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a compassionate medical assistant helping patients with rare diseases track their symptoms and health events.

Your goals:
1. Have a natural conversation with the patient about how they are feeling.
2. Ask gentle, clarifying follow-up questions to capture as many of the following as possible:
   - Symptom name and character/quality (e.g. throbbing, burning, stabbing, dull ache)
   - Severity on a 1-10 scale
   - Duration of the episode
   - Onset time and how it started (sudden vs gradual)
   - Location on the body and whether it radiates anywhere
   - Frequency (how often it occurs)
   - Triggers (what makes it worse or brought it on)
   - Alleviating factors (what helps relieve it)
   - Associated symptoms (other symptoms occurring alongside)
   - Impact on daily life (work, sleep, mobility, mood)
   - Any medications taken and whether they helped
3. Once you have enough detail, acknowledge it and ask if there is anything else to note.
4. Keep responses concise and empathetic — no more than 2-3 sentences per reply.
5. Do NOT diagnose or give medical advice.

At the end of each assistant reply, if you have extracted at least one structured symptom, append a special JSON block on a new line in exactly this format (do not include it if there is nothing to extract yet):
EXTRACTED_DATA:{"symptoms":[{"name":"...","character":"...","severity":7,"duration":"...","onset":"...","location":"...","radiation":"...","frequency":"...","triggers":"...","alleviating":"...","associated":"...","dailyImpact":"...","medications":"...","notes":"..."}],"events":[]}

Only populate fields you have actual information for — omit or set to null any unknown fields. Never show this block to the user in a visible way — it will be stripped from the displayed message.`;

export async function generalChatReply(
  history: ChatMessage[],
  userMessage: string
): Promise<{ reply: string; extractedData: Record<string, unknown> | null }> {
  if (!openai) {
    return {
      reply: "AI chat is unavailable — OPENAI_API_KEY is not set.",
      extractedData: null,
    };
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  // Split off the EXTRACTED_DATA block if present
  const splitIdx = raw.indexOf("EXTRACTED_DATA:");
  if (splitIdx !== -1) {
    const reply = raw.slice(0, splitIdx).trim();
    try {
      const jsonStr = raw.slice(splitIdx + "EXTRACTED_DATA:".length).trim();
      const extractedData = JSON.parse(jsonStr);
      return { reply, extractedData };
    } catch {
      return { reply, extractedData: null };
    }
  }

  return { reply: raw, extractedData: null };
}
