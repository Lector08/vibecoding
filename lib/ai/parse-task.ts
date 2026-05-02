import OpenAI from "openai";
import { env } from "@/env";
import {
  categoryEnum,
  priorityEnum,
  type ParsedTask,
} from "@/lib/schemas/task";

interface ParseContext {
  /** IANA timezone for the user (e.g. "Europe/Kyiv"). Falls back to UTC. */
  timezone?: string;
  /** UI locale, used as a hint for parsing language (e.g. "uk", "en"). */
  locale?: string;
  /** Override "now" — used in tests; defaults to new Date(). */
  now?: Date;
}

const MODEL = "gpt-4o-mini";

/**
 * JSON Schema sent to OpenAI as the response format. Mirrors `parsedTaskSchema`
 * in lib/schemas/task.ts. Uses union types for nullables and disallows extra
 * properties so the model is forced to comply (strict mode).
 */
const responseJsonSchema = {
  name: "parsed_task",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "priority", "category", "deadline"],
    properties: {
      title: {
        type: "string",
        description:
          "Short, action-oriented task title in the SAME language as the user's input. Max ~120 characters. Don't include the deadline or priority words.",
      },
      priority: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "high = urgent/important/ASAP/критично/терміново. low = когда-нибудь/потім/low priority. medium = anything else.",
      },
      category: {
        type: "string",
        enum: ["work", "personal", "study", "other"],
        description:
          "work = office/clients/meetings/work projects/робота/нарада/проєкт. study = courses/lectures/homework/reading/learning/навчання/курс/лекція. personal = home/health/family/errands/friends/особисте/побут/родина/друзі. other = anything that doesn't clearly fit. When uncertain, prefer 'personal'.",
      },
      deadline: {
        type: ["string", "null"],
        description:
          "ISO 8601 timestamp WITH the user's timezone offset (e.g. 2026-05-05T17:00:00+03:00) if the user mentioned a date or time, otherwise null. Never invent a deadline.",
      },
    },
  },
} as const;

function buildSystemPrompt(ctx: ParseContext): string {
  const now = ctx.now ?? new Date();
  const timezone = ctx.timezone ?? "UTC";
  const locale = ctx.locale ?? "en";
  const nowIso = now.toISOString();

  return [
    "You convert a free-form task description into structured fields.",
    `Current date and time (UTC, ISO 8601): ${nowIso}.`,
    `User's timezone (IANA): ${timezone}.`,
    `User's UI locale: ${locale}.`,
    "",
    "Rules:",
    "- Output a concise, action-oriented `title` in the SAME language the user wrote in. Do not translate.",
    "- Strip deadline phrases and priority adjectives from the title (the title should describe WHAT to do, not WHEN or HOW URGENT).",
    "- Infer `priority` from explicit words. Words like 'urgent', 'important', 'ASAP', 'critical', 'критично', 'терміново', 'важливо', 'срочно' → high. Words like 'someday', 'low priority', 'eventually', 'потім', 'колись' → low. Otherwise medium.",
    "- Infer `category` from the topic. work = job, clients, meetings, deadlines at work. study = lectures, courses, exams, reading, learning. personal = errands, home, family, health, social. other = ambiguous or doesn't fit. When unsure prefer 'personal'.",
    "- Infer `deadline` only if the user mentions a date, day name, or relative time. Common conventions:",
    "  * 'today' = today at 17:00 in the user's timezone",
    "  * 'tomorrow' / 'завтра' = next day at 17:00 in the user's timezone",
    "  * 'on Friday' / 'у п'ятницю' = the next upcoming Friday at 17:00",
    "  * 'in 3 hours' / 'через 3 години' = current time + 3 hours",
    "  * an explicit time ('at 9am', 'о 9 ранку') overrides the 17:00 default",
    "- Always express `deadline` as ISO 8601 with the user's timezone offset (e.g. 2026-05-05T17:00:00+03:00). Never invent a deadline that the user didn't imply.",
    "- If unsure, set `deadline` to null and `priority` to medium.",
  ].join("\n");
}

function fallback(rawInput: string): ParsedTask {
  return {
    title: rawInput.trim().slice(0, 200),
    priority: "medium",
    category: "personal",
    deadline: null,
  };
}

function coerceDeadline(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Parse a free-form task description into structured fields using GPT-4o-mini.
 * Falls back to a "raw text as title" stub when OPENAI_API_KEY is missing or
 * any error occurs — the app must keep working even if AI is unavailable.
 */
export async function parseTask(
  rawInput: string,
  ctx: ParseContext = {},
): Promise<ParsedTask> {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) return fallback(trimmed);
  if (!env.OPENAI_API_KEY) return fallback(trimmed);

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: buildSystemPrompt(ctx) },
        { role: "user", content: trimmed },
      ],
      response_format: {
        type: "json_schema",
        json_schema: responseJsonSchema,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback(trimmed);

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("title" in parsed) ||
      !("priority" in parsed)
    ) {
      return fallback(trimmed);
    }

    const candidate = parsed as Record<string, unknown>;
    const titleRaw = typeof candidate.title === "string" ? candidate.title.trim() : "";
    const priorityResult = priorityEnum.safeParse(candidate.priority);
    const categoryResult = categoryEnum.safeParse(candidate.category);

    return {
      title: (titleRaw.length > 0 ? titleRaw : trimmed).slice(0, 200),
      priority: priorityResult.success ? priorityResult.data : "medium",
      category: categoryResult.success ? categoryResult.data : "personal",
      deadline: coerceDeadline(candidate.deadline),
    };
  } catch {
    // Network error, rate limit, malformed JSON — degrade gracefully.
    return fallback(trimmed);
  }
}
