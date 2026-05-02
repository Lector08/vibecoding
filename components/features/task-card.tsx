"use client";

import { CalendarCheck, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TaskDoneCheckbox } from "./task-done-checkbox";
import { TaskDeleteButton } from "./task-delete-button";
import { TaskEditForm } from "./task-edit-form";
import { cn } from "@/lib/utils";
import type { Category, Priority } from "@/lib/schemas/task";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    priority: string;
    category?: string | null;
    notes?: string | null;
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

const categoryChipClass: Record<Category, string> = {
  work: "bg-category-work/15 text-category-work border-category-work/30",
  personal: "bg-category-personal/15 text-category-personal border-category-personal/30",
  study: "bg-category-study/15 text-category-study border-category-study/30",
  other: "bg-category-other/15 text-category-other border-category-other/30",
};

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function isCategory(value: string | null | undefined): value is Category {
  return (
    value === "work" ||
    value === "personal" ||
    value === "study" ||
    value === "other"
  );
}

export function TaskCard({ task }: TaskCardProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      setTimezone("");
    }
  }, []);

  const priority: Priority = isPriority(task.priority) ? task.priority : "medium";
  const category = isCategory(task.category) ? task.category : null;
  const hasNotes = !!task.notes && task.notes.trim().length > 0;

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
        "group flex flex-col gap-2 rounded-lg border bg-card p-3",
        "transition-colors",
        isOverdue
          ? "border-destructive/40 bg-destructive/5"
          : "border-border",
        task.done && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
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
            {category ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-1.5 py-0.5",
                  "text-[10px] font-medium",
                  categoryChipClass[category],
                )}
              >
                {t(`category.${category}`)}
              </span>
            ) : null}
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
            {hasNotes ? (
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded text-[10px] font-medium",
                  "text-muted-foreground transition-colors hover:text-foreground",
                )}
                aria-expanded={notesOpen}
                aria-controls={`task-notes-${task.id}`}
              >
                {notesOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>{notesOpen ? t("notesHide") : t("notesShow")}</span>
              </button>
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
      </div>
      {hasNotes && notesOpen ? (
        <div
          id={`task-notes-${task.id}`}
          className={cn(
            "ml-8 rounded-md border border-border bg-muted/40 p-2.5",
            "text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap",
          )}
        >
          {task.notes}
        </div>
      ) : null}
    </li>
  );
}
