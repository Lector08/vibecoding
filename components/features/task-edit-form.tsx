"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateTask } from "@/lib/actions/tasks";
import {
  CATEGORIES,
  DURATION_PRESETS,
  type Category,
  type DurationPreset,
  type Priority,
  type UpdateTaskInput,
} from "@/lib/schemas/task";
import { cn } from "@/lib/utils";

const PRIORITIES: readonly Priority[] = ["high", "medium", "low"];
const DEFAULT_TIME = "17:00";
const DEFAULT_DURATION: DurationPreset = 30;

export interface TaskEditableTask {
  id: string;
  title: string;
  priority: string;
  category?: string | null;
  notes?: string | null;
  deadline: Date | null;
  durationMinutes?: number | null;
}

export interface TaskSavedPayload {
  id: string;
  title: string;
  priority: string;
  category: string | null;
  notes: string | null;
  deadline: Date | null;
  hasCalendarEvent: boolean;
}

interface Props {
  task: TaskEditableTask;
  timezone: string;
  onCancel: () => void;
  /** Called after the task has been saved successfully. */
  onSaved: (saved: TaskSavedPayload) => void;
  /**
   * If true, validation requires a deadline (used by the calendar
   * suggestion edit flow where a deadline is mandatory).
   */
  requireDeadline?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  /** Compact layout for tighter contexts (suggestion banner). */
  dense?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date | null): string {
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  const time = timeStr || DEFAULT_TIME;
  const local = new Date(`${dateStr}T${time}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

function asPriority(value: string): Priority {
  return value === "high" || value === "low" ? value : "medium";
}

function asCategory(value: string | null | undefined): Category {
  if (value === "work" || value === "personal" || value === "study" || value === "other") {
    return value;
  }
  return "personal";
}

function asDuration(value: number | null | undefined): DurationPreset {
  const n = value ?? DEFAULT_DURATION;
  return (DURATION_PRESETS as readonly number[]).includes(n)
    ? (n as DurationPreset)
    : DEFAULT_DURATION;
}

export function TaskEditForm({
  task,
  timezone,
  onCancel,
  onSaved,
  requireDeadline = false,
  saveLabel,
  savingLabel,
  dense = false,
}: Props) {
  const t = useTranslations("tasks");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(asPriority(task.priority));
  const [category, setCategory] = useState<Category>(asCategory(task.category));
  const [notes, setNotes] = useState(task.notes ?? "");
  const [date, setDate] = useState(() => toDateInput(task.deadline));
  const [time, setTime] = useState(() => toTimeInput(task.deadline));
  const [duration, setDuration] = useState<DurationPreset>(() =>
    asDuration(task.durationMinutes ?? null),
  );

  // If the task prop changes (rare, e.g. after a sibling save), resync.
  useEffect(() => {
    setTitle(task.title);
    setPriority(asPriority(task.priority));
    setCategory(asCategory(task.category));
    setNotes(task.notes ?? "");
    setDate(toDateInput(task.deadline));
    setTime(toTimeInput(task.deadline));
    setDuration(asDuration(task.durationMinutes ?? null));
  }, [task]);

  const computedDeadline = useMemo(
    () => combineDateTime(date, time),
    [date, time],
  );

  function durationLabel(minutes: DurationPreset): string {
    if (minutes < 60) return t("durationMinutes", { count: minutes });
    return t("durationHours", { count: minutes / 60 });
  }

  function submit() {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError(t("errorEmpty"));
      return;
    }
    if (requireDeadline && !computedDeadline) {
      setError(t("calendarNoDeadline"));
      return;
    }
    setError(null);

    const trimmedNotes = notes.trim();
    const payload: UpdateTaskInput = {
      taskId: task.id,
      title: trimmed,
      priority,
      category,
      notes: trimmedNotes.length === 0 ? null : trimmedNotes,
      // Always send deadline so the user can clear it.
      deadline: computedDeadline,
      // Only send duration when there's a deadline; otherwise it's meaningless.
      durationMinutes: computedDeadline ? duration : null,
      timezone: timezone || undefined,
    };

    startTransition(async () => {
      const result = await updateTask(payload);
      if (result.ok) {
        onSaved({
          id: result.data.id,
          title: result.data.title,
          priority: result.data.priority,
          category: result.data.category,
          notes: result.data.notes,
          deadline: result.data.deadline,
          hasCalendarEvent: result.data.hasCalendarEvent,
        });
      } else {
        const key = result.messageKey ?? "errorGeneric";
        setError(t(key as "errorGeneric"));
      }
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card",
        dense ? "p-2.5" : "p-3",
      )}
    >
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-muted-foreground">
          {t("fieldTitle")}
        </span>
        <input
          type="text"
          value={title}
          maxLength={200}
          required
          disabled={isPending}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            "h-9 rounded-md border border-input bg-card px-2 text-sm",
            "text-foreground focus:border-ring transition-colors",
          )}
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {t("fieldPriority")}
          </span>
          <select
            value={priority}
            disabled={isPending}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={cn(
              "h-9 rounded-md border border-input bg-card px-2 text-sm",
              "text-foreground focus:border-ring transition-colors",
            )}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`priority.${p}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {t("fieldCategory")}
          </span>
          <select
            value={category}
            disabled={isPending}
            onChange={(e) => setCategory(e.target.value as Category)}
            className={cn(
              "h-9 rounded-md border border-input bg-card px-2 text-sm",
              "text-foreground focus:border-ring transition-colors",
            )}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {t("fieldDate")}
          </span>
          <input
            type="date"
            value={date}
            disabled={isPending}
            onChange={(e) => setDate(e.target.value)}
            className={cn(
              "h-9 rounded-md border border-input bg-card px-2 text-sm",
              "text-foreground focus:border-ring transition-colors",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {t("fieldTime")}
          </span>
          <input
            type="time"
            value={time}
            disabled={isPending || !date}
            onChange={(e) => setTime(e.target.value)}
            className={cn(
              "h-9 rounded-md border border-input bg-card px-2 text-sm",
              "text-foreground focus:border-ring transition-colors",
              "disabled:opacity-60",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-muted-foreground">
            {t("fieldDuration")}
          </span>
          <select
            value={duration}
            disabled={isPending || !date}
            onChange={(e) => setDuration(Number(e.target.value) as DurationPreset)}
            className={cn(
              "h-9 rounded-md border border-input bg-card px-2 text-sm",
              "text-foreground focus:border-ring transition-colors",
              "disabled:opacity-60",
            )}
          >
            {DURATION_PRESETS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {durationLabel(minutes)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-muted-foreground">
            {t("fieldNotes")}
          </span>
          <textarea
            value={notes}
            maxLength={2000}
            rows={2}
            disabled={isPending}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            className={cn(
              "min-h-[3.5rem] rounded-md border border-input bg-card px-2 py-1.5 text-sm",
              "text-foreground placeholder:text-muted-foreground focus:border-ring transition-colors",
            )}
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p
          aria-live="polite"
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? "\u00A0"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("cancelAction")}
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending
              ? (savingLabel ?? t("adding"))
              : (saveLabel ?? t("saveAction"))}
          </Button>
        </div>
      </div>
    </form>
  );
}
