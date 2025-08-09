import { GoogleGenAI, Type } from "@google/genai";

export type GenerateTitleOptions = {
  timeoutMs?: number;
  model?: string;
};

let ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export async function generateChatTitleFromFirstMessage(
  firstMessage: string,
  opts: GenerateTitleOptions = {}
): Promise<string | null> {
  console.log("Generating title from first message", firstMessage);
  const client = getClient();
  if (!client) return firstMessage;

  const model = opts.model ?? "gemini-2.5-flash";

  const prompt = `Create a chat title (max 5 words) based only on this first user message.\nMessage: ${firstMessage}\nRules: Return JSON with a single field \\"title\\" only.`;

  try {
    const res: any = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
          },
          propertyOrdering: ["title"],
        },
      },
    } as any);

    const text: string | undefined = res?.text;
    console.log("Generated title", text);
    if (!text) return firstMessage;

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    const title = (parsed?.title as string | undefined) ?? text;
    const cleaned = (title || "")
      .replace(/["'`]/g, "")
      .replace(/[\n\r]+/g, " ")
      .trim();

    if (!cleaned) return firstMessage;
    return cleaned.slice(0, 60);
  } catch (_) {
    return firstMessage;
  }
}
