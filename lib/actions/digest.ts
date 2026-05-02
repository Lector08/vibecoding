"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateDailyDigest,
  type DigestTaskInput,
} from "@/lib/ai/daily-digest";

interface DigestRequest {
  /** YYYY-MM-DD in the user's local view. */
  date: string;
  timezone?: string;
  locale?: string;
}

/** Schedule item enriched with display data so the UI doesn't need a join. */
export interface EnrichedScheduleItem {
  taskId: string;
  title: string;
  priority: "high" | "medium" | "low";
  category: string | null;
  done: boolean;
  suggestedTime: string | null;
  rationale: string;
}

export interface EnrichedDailyDigest {
  greeting: string;
  schedule: EnrichedScheduleItem[];
  tips: string[];
  aiUnavailable: boolean;
}

export type DigestResult =
  | { ok: true; data: EnrichedDailyDigest }
  | { ok: false; error: "unauthorized" | "validation" | "server" };

function parseLocalDay(input: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return null;
  const [, y, mo, d] = m;
  const start = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function asPriority(v: string): "high" | "medium" | "low" {
  return v === "high" || v === "low" ? v : "medium";
}

export async function getDailyDigest(
  input: DigestRequest,
): Promise<DigestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const range = parseLocalDay(input.date);
  if (!range) return { ok: false, error: "validation" };

  const timezone = input.timezone?.trim() || "UTC";
  const locale = input.locale?.trim() || "en";

  try {
    // Today's *dated* tasks + any high-priority undated tasks the user hasn't
    // ticked off yet — those are also fair game for today's plan.
    const dated = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        deadline: { gte: range.start, lte: range.end },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        category: true,
        notes: true,
        deadline: true,
        durationMinutes: true,
        done: true,
      },
      orderBy: { deadline: "asc" },
    });

    const undatedHigh = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        deadline: null,
        done: false,
        priority: "high",
      },
      select: {
        id: true,
        title: true,
        priority: true,
        category: true,
        notes: true,
        deadline: true,
        durationMinutes: true,
        done: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const tasks: DigestTaskInput[] = [...dated, ...undatedHigh].map((t) => ({
      id: t.id,
      title: t.title,
      priority: asPriority(t.priority),
      category: t.category,
      deadline: t.deadline,
      durationMinutes: t.durationMinutes,
      done: t.done,
      notes: t.notes,
    }));

    const digest = await generateDailyDigest(tasks, {
      date: range.start,
      timezone,
      locale,
    });

    const byId = new Map(tasks.map((t) => [t.id, t] as const));
    const schedule: EnrichedScheduleItem[] = digest.schedule.flatMap(
      (item) => {
        const t = byId.get(item.taskId);
        if (!t) return [];
        return [
          {
            taskId: item.taskId,
            title: t.title,
            priority: t.priority,
            category: t.category,
            done: t.done,
            suggestedTime: item.suggestedTime,
            rationale: item.rationale,
          },
        ];
      },
    );

    return {
      ok: true,
      data: {
        greeting: digest.greeting,
        schedule,
        tips: digest.tips,
        aiUnavailable: digest.aiUnavailable,
      },
    };
  } catch (e) {
    console.error("[getDailyDigest] failed:", e);
    return { ok: false, error: "server" };
  }
}
