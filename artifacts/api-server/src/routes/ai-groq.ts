import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, messagesTable, groupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama3-70b-8192";

function noKey(res: Response) {
  res.status(503).json({ error: "AI features are not configured yet. Add GROQ_API_KEY to enable them." });
}

async function groqChat(messages: { role: string; content: string }[], maxTokens = 1024): Promise<string> {
  const resp = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(data.error?.message ?? "Groq API error");
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Study Assistant ─────────────────────────────────────────────────────────

/**
 * POST /api/ai/assistant
 * Body: { question, groupId?, lessonContent? }
 * Auth required.
 * The AI answers student questions with optional group/lesson context.
 */
router.post("/ai/assistant", async (req: Request, res: Response): Promise<void> => {
  if (!GROQ_API_KEY) { noKey(res); return; }

  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { question, groupId, lessonContent } = req.body ?? {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "question is required" });
    return;
  }

  let context = "";

  if (groupId) {
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, parseInt(groupId))).limit(1);
    if (group) {
      context += `This is a course called "${group.name}"`;
      if (group.subject) context += ` — subject: ${group.subject}`;
      if (group.description) context += `. Course description: ${group.description}`;
      context += ".\n";

      // Grab recent messages for context (last 10 lecture-type messages)
      const recent = await db
        .select({ content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.groupId, group.id))
        .limit(10)
        .orderBy(messagesTable.createdAt);

      const lectureSnippet = recent.map(m => m.content).join("\n").slice(0, 2000);
      if (lectureSnippet) context += `Recent lesson content:\n${lectureSnippet}\n`;
    }
  }

  if (lessonContent) {
    context += `\nLesson content:\n${String(lessonContent).slice(0, 3000)}\n`;
  }

  const systemPrompt = `You are a helpful, concise study assistant for an online learning platform called Klave. 
You help students understand course material clearly and accurately.
${context ? `\nContext about this course:\n${context}` : ""}
Keep answers focused, practical, and under 300 words unless a longer explanation is essential.`;

  try {
    const answer = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ]);
    res.json({ answer });
  } catch (err: any) {
    req.log.error({ err }, "Groq assistant error");
    res.status(502).json({ error: err.message ?? "AI error" });
  }
});

// ─── Lesson Summariser ────────────────────────────────────────────────────────

/**
 * POST /api/ai/summarize
 * Body: { content, title? }
 * Auth required.
 * Returns a structured summary of lesson markdown content.
 */
router.post("/ai/summarize", async (req: Request, res: Response): Promise<void> => {
  if (!GROQ_API_KEY) { noKey(res); return; }

  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { content, title } = req.body ?? {};
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const systemPrompt = `You are an expert educator. Summarize the following lesson content into:
1. A 2-3 sentence overview
2. 3-5 key takeaways as bullet points
3. One suggested follow-up question the student should think about

Respond in this exact JSON format:
{
  "overview": "...",
  "keyTakeaways": ["...", "...", "..."],
  "followUpQuestion": "..."
}`;

  const userPrompt = `${title ? `Lesson title: ${title}\n\n` : ""}Lesson content:\n${content.slice(0, 4000)}`;

  try {
    const raw = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], 512);

    // Extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      res.json({ overview: raw, keyTakeaways: [], followUpQuestion: "" });
      return;
    }
    const parsed = JSON.parse(match[0]);
    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "Groq summarize error");
    res.status(502).json({ error: err.message ?? "AI error" });
  }
});

// ─── Creator Writing Assistant ────────────────────────────────────────────────

/**
 * POST /api/ai/write-lesson
 * Body: { title, prompt?, subject? }
 * Auth required (creator only — enforcement is light, frontend gates it).
 * Returns a suggested lesson body in markdown.
 */
router.post("/ai/write-lesson", async (req: Request, res: Response): Promise<void> => {
  if (!GROQ_API_KEY) { noKey(res); return; }

  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, prompt, subject } = req.body ?? {};
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const systemPrompt = `You are an expert course creator helping write engaging lesson content for an online learning platform.
Write content that is clear, practical, and engaging — conversational but professional.
Format your response as clean Markdown with headers, bullet points, and bold key terms where appropriate.
Aim for 300-500 words unless the topic clearly requires more.`;

  const userPrompt = `Write a lesson with the title: "${title}"
${subject ? `Course subject: ${subject}` : ""}
${prompt ? `Additional guidance: ${prompt}` : ""}

Start directly with the lesson content (no meta-commentary). Use Markdown formatting.`;

  try {
    const content = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], 1024);
    res.json({ content });
  } catch (err: any) {
    req.log.error({ err }, "Groq write-lesson error");
    res.status(502).json({ error: err.message ?? "AI error" });
  }
});

export default router;
