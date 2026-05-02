import OpenAI from "openai";
import { env } from "@/env";

const MODEL = "gpt-4o-mini";

export interface DigestTaskInput {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  category: string | null;
  deadline: Date | null;
  durationMinutes: number | null;
  done: boolean;
  notes: string | null;
}

export interface DigestScheduleItem {
  taskId: string;
  /** Suggested wall-clock window in the user's timezone, e.g. "09:00–10:00". */
  suggestedTime: string | null;
  /** Why this slot / order — one short sentence. */
  rationale: string;
}

export interface DailyDigest {
  /** 1–2 sentence overview the user reads first. */
  greeting: string;
  /** Tasks ordered the way AI suggests tackling them. */
  schedule: DigestScheduleItem[];
  /** 3–5 actionable tips for organising the day / workflow. */
  tips: string[];
  /** When AI was unavailable, we still return a usable plan with this flag. */
  aiUnavailable: boolean;
}

interface DigestContext {
  /** Calendar date the plan is for (in the user's timezone, midnight). */
  date: Date;
  timezone: string;
  locale: string;
  now?: Date;
}

const responseJsonSchema = {
  name: "daily_digest",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["greeting", "schedule", "tips"],
    properties: {
      greeting: {
        type: "string",
        description:
          "1–2 sentence overview of the day, in the user's locale. Friendly but not patronising.",
      },
      schedule: {
        type: "array",
        description:
          "All tasks the user gave you, ordered the way you recommend tackling them. Don't drop any task. Don't invent new tasks.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["taskId", "suggestedTime", "rationale"],
          properties: {
            taskId: {
              type: "string",
              description: "The exact id from the input.",
            },
            suggestedTime: {
              type: ["string", "null"],
              description:
                "Suggested wall-clock window like '09:00–10:00' or '14:30–15:00' in the user's timezone. Use null if the task has its own deadline time and you don't want to override it. Keep formatting consistent (24h).",
            },
            rationale: {
              type: "string",
              description:
                "ONE short sentence in the user's locale explaining why this slot/order. Reference cognitive load, batching, energy levels, etc.",
            },
          },
        },
      },
      tips: {
        type: "array",
        description:
          "3 to 5 actionable bullet tips on how to better plan THIS day or optimise the workflow, in the user's locale. Concrete, not generic. Reference patterns in the actual tasks if you can (e.g. 'You have 3 study tasks — batch them into one 90-min block').",
        items: { type: "string" },
      },
    },
  },
} as const;

function buildSystemPrompt(ctx: DigestContext): string {
  const now = ctx.now ?? new Date();
  return [
    "You are a calm, concise productivity assistant.",
    `Plan the user's day for ${ctx.date.toISOString().slice(0, 10)} in their timezone (${ctx.timezone}).`,
    `Current moment (UTC ISO): ${now.toISOString()}.`,
    `Reply in the user's UI locale: ${ctx.locale}.`,
    "",
    "Principles:",
    "- Schedule cognitively demanding work early when energy is high; admin / errands later.",
    "- Batch similar categories together (e.g. group all 'study' tasks).",
    "- Respect existing deadlines: if a task already has a specific time, build the plan around it.",
    "- Leave breathing room. Don't suggest back-to-back blocks for the whole day.",
    "- High-priority items go first within their suitable energy window.",
    "",
    "Output rules:",
    "- Keep language warm but practical. Avoid corporate jargon and exclamation marks.",
    "- Tips must be concrete and reference the actual tasks when possible.",
    "- Use the user's locale for all human-readable text. Times use 24h.",
  ].join("\n");
}

function buildUserPayload(
  tasks: DigestTaskInput[],
  ctx: DigestContext,
): string {
  const fmt = new Intl.DateTimeFormat(ctx.locale, {
    timeZone: ctx.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return JSON.stringify(
    {
      date: ctx.date.toISOString().slice(0, 10),
      timezone: ctx.timezone,
      taskCount: tasks.length,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category ?? "other",
        deadline: task.deadline
          ? `${task.deadline.toISOString()} (${fmt.format(task.deadline)} local)`
          : null,
        durationMinutes: task.durationMinutes ?? 30,
        done: task.done,
        notes: task.notes ?? null,
      })),
    },
    null,
    2,
  );
}

function fallbackDigest(
  tasks: DigestTaskInput[],
  ctx: DigestContext,
): DailyDigest {
  // Sort: undone first → high → medium → low → earliest deadline.
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const p = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (p !== 0) return p;
    if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  const fmt = new Intl.DateTimeFormat(ctx.locale, {
    timeZone: ctx.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    aiUnavailable: true,
    greeting:
      ctx.locale.startsWith("uk")
        ? `На сьогодні ${tasks.length} задач${tasks.length === 1 ? "а" : tasks.length < 5 ? "и" : ""}.`
        : `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} on the plate today.`,
    schedule: sorted.map((task) => ({
      taskId: task.id,
      suggestedTime: task.deadline ? fmt.format(task.deadline) : null,
      rationale: "",
    })),
    tips:
      ctx.locale.startsWith("uk")
        ? [
            "Почніть із найважчої задачі, поки голова свіжа.",
            "Робіть 5–10 хв перерви після кожних 50 хв роботи.",
            "Об'єднуйте схожі справи в один блок, щоб не перемикати контекст.",
          ]
        : [
            "Start with the heaviest task while your head is fresh.",
            "Take a 5–10 min break after every 50 min of focused work.",
            "Batch similar items together to avoid context switching.",
          ],
  };
}

export async function generateDailyDigest(
  tasks: DigestTaskInput[],
  ctx: DigestContext,
): Promise<DailyDigest> {
  if (!env.OPENAI_API_KEY) {
    return fallbackDigest(tasks, ctx);
  }
  if (tasks.length === 0) {
    return {
      aiUnavailable: false,
      greeting:
        ctx.locale.startsWith("uk")
          ? "На сьогодні немає запланованих задач — простір для будь-чого."
          : "Nothing scheduled for today — open space for anything.",
      schedule: [],
      tips:
        ctx.locale.startsWith("uk")
          ? [
              "Виділіть 25 хв на роздуми про тиждень.",
              "Зробіть одну дрібницю, що довго відкладається.",
              "Заплануйте відпочинок навмисно, а не «як вийде».",
            ]
          : [
              "Spend 25 min reflecting on the week ahead.",
              "Knock out one small thing you keep postponing.",
              "Schedule rest deliberately, not as leftovers.",
            ],
    };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildSystemPrompt(ctx) },
        { role: "user", content: buildUserPayload(tasks, ctx) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: responseJsonSchema,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallbackDigest(tasks, ctx);

    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("greeting" in parsed) ||
      !("schedule" in parsed) ||
      !("tips" in parsed)
    ) {
      return fallbackDigest(tasks, ctx);
    }
    const candidate = parsed as Record<string, unknown>;
    const greeting =
      typeof candidate.greeting === "string" ? candidate.greeting : "";
    const tips = Array.isArray(candidate.tips)
      ? candidate.tips.filter((t): t is string => typeof t === "string")
      : [];
    const validTaskIds = new Set(tasks.map((t) => t.id));
    const schedule: DigestScheduleItem[] = Array.isArray(candidate.schedule)
      ? candidate.schedule
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null,
          )
          .map((item) => ({
            taskId: typeof item.taskId === "string" ? item.taskId : "",
            suggestedTime:
              typeof item.suggestedTime === "string"
                ? item.suggestedTime
                : null,
            rationale:
              typeof item.rationale === "string" ? item.rationale : "",
          }))
          .filter((item) => validTaskIds.has(item.taskId))
      : [];

    return {
      aiUnavailable: false,
      greeting: greeting.trim().length > 0 ? greeting.trim() : fallbackDigest(tasks, ctx).greeting,
      schedule,
      tips,
    };
  } catch (e) {
    console.error("[generateDailyDigest] AI failed:", e);
    return fallbackDigest(tasks, ctx);
  }
}
