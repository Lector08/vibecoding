"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTask } from "@/lib/ai/parse-task";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/google/calendar";
import { GoogleAuthError } from "@/lib/google/client";
import {
  createTaskInputSchema,
  updateTaskInputSchema,
  type UpdateTaskInput,
} from "@/lib/schemas/task";

type ActionError =
  | "unauthorized"
  | "validation"
  | "not_found"
  | "google_auth"
  | "google_call"
  | "server";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError; messageKey?: string };

export interface CreatedTask {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  done: boolean;
  hasCalendarEvent: boolean;
}

function fallbackTimezone(value: string | undefined): string {
  return value && value.trim().length > 0 ? value : "UTC";
}

export async function createTaskFromText(
  formData: FormData,
): Promise<ActionResult<CreatedTask>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = createTaskInputSchema.safeParse({
    rawInput: formData.get("rawInput"),
    timezone: formData.get("timezone") ?? undefined,
    locale: formData.get("locale") ?? undefined,
    deadlineOverride: formData.get("deadlineOverride") ?? undefined,
    durationMinutes: formData.get("durationMinutes") ?? undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "errorGeneric";
    return { ok: false, error: "validation", messageKey: first };
  }

  try {
    const ai = await parseTask(parsed.data.rawInput, {
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
    });
    const finalDeadline = parsed.data.deadlineOverride
      ? new Date(parsed.data.deadlineOverride)
      : ai.deadline
        ? new Date(ai.deadline)
        : null;
    const created = await prisma.task.create({
      data: {
        userId: session.user.id,
        rawInput: parsed.data.rawInput,
        title: ai.title,
        priority: ai.priority,
        deadline: finalDeadline,
        durationMinutes: parsed.data.durationMinutes ?? null,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        deadline: true,
        done: true,
        gcalEventId: true,
      },
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: {
        id: created.id,
        title: created.title,
        priority: created.priority,
        deadline: created.deadline,
        done: created.done,
        hasCalendarEvent: !!created.gcalEventId,
      },
    };
  } catch {
    return { ok: false, error: "server", messageKey: "errorGeneric" };
  }
}

export async function updateTask(
  input: UpdateTaskInput,
): Promise<ActionResult<CreatedTask>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = updateTaskInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "errorGeneric";
    return { ok: false, error: "validation", messageKey: first };
  }

  const { taskId, title, priority, deadline, durationMinutes, timezone } =
    parsed.data;

  // Build partial Prisma update — only include fields the caller sent.
  const data: {
    title?: string;
    priority?: string;
    deadline?: Date | null;
    durationMinutes?: number | null;
  } = {};
  if (title !== undefined) data.title = title;
  if (priority !== undefined) data.priority = priority;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
  if (durationMinutes !== undefined) data.durationMinutes = durationMinutes;

  try {
    const updated = await prisma.task.update({
      where: { id: taskId, userId: session.user.id },
      data,
      select: {
        id: true,
        title: true,
        rawInput: true,
        priority: true,
        deadline: true,
        durationMinutes: true,
        done: true,
        gcalEventId: true,
      },
    });

    // Mirror the change in Google Calendar if this task is already synced.
    // Failures are logged but never fail the action — the DB update is the
    // source of truth and the user can resync manually later.
    if (updated.gcalEventId) {
      if (updated.deadline) {
        await updateCalendarEvent(
          session.user.id,
          updated.gcalEventId,
          {
            title: updated.title,
            rawInput: updated.rawInput,
            deadline: updated.deadline,
            done: updated.done,
            durationMinutes: updated.durationMinutes,
          },
          fallbackTimezone(timezone),
        ).catch((err) => {
          console.error("[updateTask] calendar update failed", err);
        });
      } else {
        // Deadline was cleared — drop the orphan event and forget the link.
        await deleteCalendarEvent(session.user.id, updated.gcalEventId).catch(
          (err) => {
            console.error("[updateTask] calendar delete failed", err);
          },
        );
        await prisma.task.update({
          where: { id: updated.id },
          data: { gcalEventId: null },
        });
      }
    }

    revalidatePath("/", "layout");
    return {
      ok: true,
      data: {
        id: updated.id,
        title: updated.title,
        priority: updated.priority,
        deadline: updated.deadline,
        done: updated.done,
        hasCalendarEvent: !!updated.gcalEventId && !!updated.deadline,
      },
    };
  } catch {
    return { ok: false, error: "server", messageKey: "errorGeneric" };
  }
}

export async function toggleTaskDone(
  taskId: string,
  done: boolean,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const task = await prisma.task.update({
      where: { id: taskId, userId: session.user.id },
      data: { done },
      select: {
        id: true,
        title: true,
        rawInput: true,
        deadline: true,
        durationMinutes: true,
        done: true,
        gcalEventId: true,
      },
    });

    // If the task is on Google Calendar, mirror the done state by updating
    // the event title (prefix `[done]`) and marking it transparent so it
    // doesn't block free/busy. Failures are logged but don't fail the action.
    if (task.gcalEventId && task.deadline) {
      await updateCalendarEvent(
        session.user.id,
        task.gcalEventId,
        {
          title: task.title,
          rawInput: task.rawInput,
          deadline: task.deadline,
          done: task.done,
          durationMinutes: task.durationMinutes,
        },
        "UTC",
      ).catch(() => undefined);
    }

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "server", messageKey: "errorGeneric" };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const existing = await prisma.task.findUnique({
      where: { id: taskId, userId: session.user.id },
      select: { id: true, gcalEventId: true },
    });
    if (!existing) {
      return { ok: false, error: "not_found", messageKey: "notFound" };
    }

    if (existing.gcalEventId) {
      await deleteCalendarEvent(session.user.id, existing.gcalEventId).catch(
        () => undefined,
      );
    }

    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "server", messageKey: "errorGeneric" };
  }
}

export async function addTaskToCalendar(
  taskId: string,
  timezone: string,
): Promise<ActionResult<{ eventId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId, userId: session.user.id },
    select: {
      id: true,
      title: true,
      rawInput: true,
      deadline: true,
      durationMinutes: true,
      done: true,
      gcalEventId: true,
    },
  });
  if (!task) {
    return { ok: false, error: "not_found", messageKey: "notFound" };
  }
  if (!task.deadline) {
    return { ok: false, error: "validation", messageKey: "calendarNoDeadline" };
  }
  if (task.gcalEventId) {
    return { ok: true, data: { eventId: task.gcalEventId } };
  }

  try {
    const { eventId } = await createCalendarEvent(
      session.user.id,
      {
        title: task.title,
        rawInput: task.rawInput,
        deadline: task.deadline,
        done: task.done,
        durationMinutes: task.durationMinutes,
      },
      fallbackTimezone(timezone),
    );
    await prisma.task.update({
      where: { id: task.id },
      data: { gcalEventId: eventId },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { eventId } };
  } catch (err) {
    console.error("[addTaskToCalendar] failed", {
      userId: session.user.id,
      taskId,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    if (err instanceof GoogleAuthError) {
      return { ok: false, error: "google_auth", messageKey: "calendarAuthError" };
    }
    return { ok: false, error: "google_call", messageKey: "calendarFailed" };
  }
}

export async function removeTaskFromCalendar(
  taskId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId, userId: session.user.id },
    select: { id: true, gcalEventId: true },
  });
  if (!task) {
    return { ok: false, error: "not_found", messageKey: "notFound" };
  }
  if (!task.gcalEventId) {
    return { ok: true, data: undefined };
  }

  try {
    await deleteCalendarEvent(session.user.id, task.gcalEventId);
    await prisma.task.update({
      where: { id: task.id },
      data: { gcalEventId: null },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[removeTaskFromCalendar] failed", {
      userId: session.user.id,
      taskId,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    if (err instanceof GoogleAuthError) {
      return { ok: false, error: "google_auth", messageKey: "calendarAuthError" };
    }
    return { ok: false, error: "google_call", messageKey: "calendarFailed" };
  }
}
