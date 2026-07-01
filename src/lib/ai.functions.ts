import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  return gateway("google/gemini-3-flash-preview");
}

const EmailInput = z.object({
  purpose: z.string().min(1).max(2000),
  tone: z.enum(["professional", "friendly", "persuasive", "apologetic", "confident", "formal"]),
  recipient: z.string().max(200).optional().default(""),
  details: z.string().max(5000).optional().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data, context }) => {
    const { text } = await generateText({
      model: getModel(),
      system:
        "You draft professional workplace emails. Return ONLY the email (subject line first as 'Subject: ...', then a blank line, then greeting, body, closing). No commentary.",
      prompt: `Purpose: ${data.purpose}\nTone: ${data.tone}\nRecipient: ${data.recipient || "N/A"}\nExtra details: ${data.details || "None"}\n\nWrite the email now.`,
    });
    const { error } = await context.supabase.from("emails").insert({
      user_id: context.userId,
      purpose: data.purpose,
      tone: data.tone,
      recipient: data.recipient,
      details: data.details,
      output: text,
    });
    if (error) console.error("save email failed", error);
    return { output: text };
  });

const MeetingInput = z.object({
  title: z.string().max(200).optional().default("Untitled meeting"),
  transcript: z.string().min(10).max(50_000),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MeetingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { text } = await generateText({
      model: getModel(),
      system:
        "You summarize workplace meeting transcripts. Return well-formatted markdown with exactly these sections: ## Summary, ## Key Decisions, ## Action Items (bulleted, each with owner and deadline if mentioned), ## Discussion Points, ## Next Steps.",
      prompt: `Meeting title: ${data.title}\n\nTranscript:\n${data.transcript}`,
    });
    const { data: row, error } = await context.supabase
      .from("meeting_notes")
      .insert({
        user_id: context.userId,
        title: data.title || "Untitled meeting",
        transcript: data.transcript,
        summary: text,
      })
      .select("id")
      .single();
    if (error) console.error("save meeting failed", error);
    return { id: row?.id, summary: text };
  });

const ResearchInput = z.object({ query: z.string().min(2).max(2000) });

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResearchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { text } = await generateText({
      model: getModel(),
      system:
        "You are a workplace research assistant. For the given query, produce markdown with: ## Summary (2-3 sentences), ## Key Findings (bulleted), ## Comparison (if relevant), ## Recommendations (bulleted, actionable), ## Suggested Sources (list credible source types the user could consult; do not fabricate URLs).",
      prompt: data.query,
    });
    const { error } = await context.supabase.from("research_reports").insert({
      user_id: context.userId,
      query: data.query,
      output: text,
    });
    if (error) console.error("save research failed", error);
    return { output: text };
  });

const PlannerInput = z.object({
  tasks: z.array(z.object({ id: z.string().max(100), title: z.string().max(500), priority: z.string().max(50), done: z.boolean() })).max(100),
});

export const planTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlannerInput.parse(input))
  .handler(async ({ data }) => {
    const pending = data.tasks.filter((t) => !t.done);
    if (pending.length === 0) return { plan: "You're all done for today. 🎉" };
    const { text } = await generateText({
      model: getModel(),
      system:
        "You are a productivity coach. Given a list of workplace tasks with priorities, output a short markdown plan: an ordered list of tasks in the best order to tackle them, with a brief reason and a rough time estimate for each. End with one motivational sentence.",
      prompt: pending.map((t) => `- [${t.priority}] ${t.title}`).join("\n"),
    });
    return { plan: text };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: "New chat" })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create thread");
    return { id: data.id };
  });

export const generateWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [tasksRes, emailsRes, meetingsRes, researchRes] = await Promise.all([
      context.supabase.from("tasks").select("title, priority, done, updated_at").gte("updated_at", since),
      context.supabase.from("emails").select("purpose, tone, created_at").gte("created_at", since),
      context.supabase.from("meeting_notes").select("title, created_at").gte("created_at", since),
      context.supabase.from("research_reports").select("query, created_at").gte("created_at", since),
    ]);
    const tasks = tasksRes.data ?? [];
    const completed = tasks.filter((t) => t.done);
    const emails = emailsRes.data ?? [];
    const meetings = meetingsRes.data ?? [];
    const research = researchRes.data ?? [];

    const stats = {
      completedTasks: completed.length,
      pendingTasks: tasks.length - completed.length,
      emails: emails.length,
      meetings: meetings.length,
      research: research.length,
    };

    const prompt = `Weekly activity:
- Completed tasks (${completed.length}): ${completed.map((t) => `${t.title} [${t.priority}]`).join("; ") || "none"}
- Still pending: ${stats.pendingTasks}
- Emails drafted: ${emails.length}${emails.length ? ` (${emails.slice(0, 5).map((e) => e.purpose).join("; ")})` : ""}
- Meetings summarised: ${meetings.length}${meetings.length ? ` (${meetings.slice(0, 5).map((m) => m.title).join("; ")})` : ""}
- Research reports: ${research.length}${research.length ? ` (${research.slice(0, 5).map((r) => r.query).join("; ")})` : ""}`;

    const { text } = await generateText({
      model: getModel(),
      system:
        "You write short, upbeat weekly recap reports for busy professionals. Use markdown with these sections: ## 🎉 This week's wins (celebrate the numbers with warmth), ## Highlights (2-4 concrete bullets referencing actual items), ## Momentum (1-2 sentences about the trend), ## Focus for next week (2-3 actionable suggestions). Keep it under 250 words and motivational — never scolding.",
      prompt,
    });

    return { report: text, stats };
  });
