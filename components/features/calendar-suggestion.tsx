"use client";

import { Calendar, Check, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addTaskToCalendar } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { TaskEditForm } from "./task-edit-form";
import { cn } from "@/lib/utils";

export interface CalendarSuggestionTask {
  id: string;
  title: string;
  deadline: Date;
  priority?: string;
  durationMinutes?: number | null;
}

interface Props {
  task: CalendarSuggestionTask;
  timezone: string;
  onResolved: () => void;
}

type ErrorKey = "calendarFailed" | "calendarAuthError" | "calendarNoDeadline";

export function CalendarSuggestion({ task, timezone, onResolved }: Props) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<CalendarSuggestionTask>(task);

  const deadlineText = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(current.deadline);

  function callAddToCalendar() {
    setErrorKey(null);
    startTransition(async () => {
      const result = await addTaskToCalendar(current.id, timezone);
      if (result.ok) {
        onResolved();
      } else {
        const key = result.messageKey;
        if (
          key === "calendarFailed" ||
          key === "calendarAuthError" ||
          key === "calendarNoDeadline"
        ) {
          setErrorKey(key);
        } else {
          setErrorKey("calendarFailed");
        }
      }
    });
  }

  if (isEditing) {
    return (
      <div
        className={cn(
          "rounded-lg border border-primary/30 bg-primary/5 p-2",
        )}
      >
        <TaskEditForm
          task={{
            id: current.id,
            title: current.title,
            priority: current.priority ?? "medium",
            deadline: current.deadline,
            durationMinutes: current.durationMinutes ?? null,
          }}
          timezone={timezone}
          requireDeadline
          dense
          saveLabel={t("saveAndAddToCalendar")}
          savingLabel={t("calendarAdding")}
          onCancel={() => setIsEditing(false)}
          onSaved={(saved) => {
            // Update local state with the freshly saved values, then trigger
            // the calendar add. If the task already got synced as part of the
            // save (it shouldn't, since updateTask only mirrors *existing*
            // events), we just close the banner.
            setCurrent({
              id: saved.id,
              title: saved.title,
              deadline: saved.deadline ?? current.deadline,
              priority: saved.priority,
              durationMinutes: current.durationMinutes,
            });
            setIsEditing(false);
            if (saved.hasCalendarEvent) {
              onResolved();
            } else {
              callAddToCalendar();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-primary/30",
        "bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex items-start gap-3">
        <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-snug">
            {t("suggestCalendar")}
          </p>
          <p className="text-xs text-muted-foreground">
            {current.title} · {deadlineText}
          </p>
          {errorKey ? (
            <p className="pt-1 text-xs text-destructive">{t(errorKey)}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:ml-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          disabled={isPending}
          aria-label={t("editAction")}
          title={t("editAction")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onResolved}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
          <span>{t("calendarDismiss")}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={callAddToCalendar}
          disabled={isPending}
        >
          <Check className="h-4 w-4" />
          <span>{isPending ? t("calendarAdding") : t("calendarAdd")}</span>
        </Button>
      </div>
    </div>
  );
}
