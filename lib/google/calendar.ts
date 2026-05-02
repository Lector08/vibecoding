import { google } from "googleapis";
import { getGoogleAuthClient } from "./client";

const CALENDAR_ID = "primary";
const DEFAULT_DURATION_MINUTES = 30;

interface TaskForEvent {
  title: string;
  rawInput: string;
  deadline: Date;
  done: boolean;
  durationMinutes?: number | null;
}

export interface CalendarSyncResult {
  eventId: string;
}

function buildEventBody(task: TaskForEvent, timezone: string) {
  const minutes = task.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const start = new Date(task.deadline);
  const end = new Date(task.deadline.getTime() + minutes * 60 * 1000);

  const summary = task.done ? `[done] ${task.title}` : task.title;

  return {
    summary,
    description: task.rawInput,
    start: {
      dateTime: start.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: timezone,
    },
    transparency: task.done ? "transparent" : "opaque",
    reminders: { useDefault: true },
  } as const;
}

export async function createCalendarEvent(
  userId: string,
  task: TaskForEvent,
  timezone: string,
): Promise<CalendarSyncResult> {
  const auth = await getGoogleAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: buildEventBody(task, timezone),
  });

  const eventId = response.data.id;
  if (!eventId) {
    throw new Error("Google Calendar returned no event id");
  }
  return { eventId };
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  task: TaskForEvent,
  timezone: string,
): Promise<CalendarSyncResult> {
  const auth = await getGoogleAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.update({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: buildEventBody(task, timezone),
  });
  return { eventId };
}

/**
 * Best-effort delete. Treats 404 / 410 (already gone) as success because the
 * end state we care about — "no such event" — is already achieved.
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  const auth = await getGoogleAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    });
  } catch (err) {
    const status = (err as { code?: number; status?: number }).code
      ?? (err as { status?: number }).status;
    if (status === 404 || status === 410) return;
    throw err;
  }
}
