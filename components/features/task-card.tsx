"use client";

import { CalendarCheck, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TaskDoneCheckbox } from "./task-done-checkbox";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskEditForm } from "./task-edit-form";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/schemas/task";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    priority: string;
    deadline: Date | null;
    durationMinutes?: number | null;
    done: boolean;
    gcalEventId: string | null;
  };
}

const priorityDotClass: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

export function TaskCard({ task }: TaskCardProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      setTimezone("");
    }
  }, []);

  const priority: Priority = isPriority(task.priority) ? task.priority : "medium";

  const deadlineFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );
  const deadlineText = task.deadline
    ? deadlineFormatter.format(task.deadline)
    : t("deadlineNone");

  const isOverdue =
    !!task.deadline && task.deadline.getTime() < Date.now() && !task.done;

  if (isEditing) {
    return (
      <li>
        <TaskEditForm
          task={task}
          timezone={timezone}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3",
        "transition-colors",
        isOverdue
          ? "border-destructive/40 bg-destructive/5"
          : "border-border",
        task.done && "opacity-60",
      )}
    >
      <TaskDoneCheckbox
        taskId={task.id}
        done={task.done}
        labelDone={t("markedDone")}
        labelNotDone={t("markedNotDone")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.done && "line-through",
            )}
          >
            {task.title}
          </p>
          <div className="flex shrink-0 items-center gap-1.5 pt-1">
            <span
              aria-label={t(`priority.${priority}`)}
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                priorityDotClass[priority],
              )}
            />
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={cn(
              isOverdue
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
          >
            {deadlineText}
          </span>
          {isOverdue ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full bg-destructive/10",
                "px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive",
              )}
            >
              {t("overdue")}
            </span>
          ) : null}
          {task.gcalEventId ? (
            <span
              className="inline-flex items-center gap-1 text-primary"
              aria-label={t("calendarAdded")}
              title={t("calendarAdded")}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity",
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label={t("editAction")}
          title={t("editAction")}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md",
            "text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:bg-muted focus-visible:text-foreground",
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <TaskDeleteButton taskId={task.id} />
      </div>
    </li>
  );
}
