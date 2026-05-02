"use client";

import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createTaskFromText } from "@/lib/actions/tasks";
import {
  DURATION_PRESETS,
  type DurationPreset,
} from "@/lib/schemas/task";
import { Button } from "@/components/ui/button";
import { CalendarSuggestion, type CalendarSuggestionTask } from "./calendar-suggestion";
import { cn } from "@/lib/utils";

type ErrorKey = "errorGeneric" | "errorEmpty" | "errorTooLong";
const ERROR_KEYS: readonly ErrorKey[] = ["errorGeneric", "errorEmpty", "errorTooLong"];

function isErrorKey(value: string): value is ErrorKey {
  return (ERROR_KEYS as readonly string[]).includes(value);
}

const DEFAULT_DURATION: DurationPreset = 30;
const DEFAULT_TIME = "17:00";

/**
 * Combine a YYYY-MM-DD date string and a HH:MM time string into an ISO
 * timestamp in the user's local timezone. Returns null if the date is empty.
 */
function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  const time = timeStr || DEFAULT_TIME;
  const local = new Date(`${dateStr}T${time}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function TaskInput() {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [suggestion, setSuggestion] = useState<CalendarSuggestionTask | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualDuration, setManualDuration] = useState<DurationPreset>(DEFAULT_DURATION);

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      setTimezone("");
    }
  }, []);

  const deadlineOverride = useMemo(
    () => combineDateTime(manualDate, manualTime),
    [manualDate, manualTime],
  );

  function resetManual() {
    setManualDate("");
    setManualTime("");
    setManualDuration(DEFAULT_DURATION);
  }

  function submit() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    setErrorKey(null);
    startTransition(async () => {
      const result = await createTaskFromText(formData);
      if (result.ok) {
        form.reset();
        resetManual();
        textareaRef.current?.focus();
        if (result.data.deadline && !result.data.hasCalendarEvent) {
          setSuggestion({
            id: result.data.id,
            title: result.data.title,
            deadline: result.data.deadline,
          });
        } else {
          setSuggestion(null);
        }
      } else {
        const key = result.messageKey ?? "errorGeneric";
        setErrorKey(isErrorKey(key) ? key : "errorGeneric");
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  function durationLabel(minutes: DurationPreset): string {
    if (minutes < 60) return t("durationMinutes", { count: minutes });
    return t("durationHours", { count: minutes / 60 });
  }

  return (
    <div className="space-y-2">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
        <input type="hidden" name="timezone" value={timezone} />
        <input type="hidden" name="locale" value={locale} />
        <input
          type="hidden"
          name="deadlineOverride"
          value={deadlineOverride ?? ""}
        />
        <input
          type="hidden"
          name="durationMinutes"
          value={manualOpen && manualDate ? String(manualDuration) : ""}
        />
        <textarea
          ref={textareaRef}
          name="rawInput"
          rows={3}
          maxLength={1000}
          required
          disabled={isPending}
          onKeyDown={onKeyDown}
          placeholder={t("inputPlaceholder")}
          aria-label={t("inputPlaceholder")}
          className={cn(
            "w-full resize-none rounded-lg border border-input bg-card",
            "px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
            "focus:border-ring transition-colors disabled:opacity-60",
          )}
        />
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              "text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{manualOpen ? t("manualToggleClose") : t("manualToggleOpen")}</span>
            {manualOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="flex items-center gap-3">
            <p
              aria-live="polite"
              className={cn(
                "text-xs",
                errorKey ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {errorKey ? t(errorKey) : t("inputHelp")}
            </p>
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? t("adding") : t("addButton")}
            </Button>
          </div>
        </div>

        {manualOpen ? (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("fieldDate")}
              </span>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                disabled={isPending}
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
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                disabled={isPending || !manualDate}
                className={cn(
                  "h-9 rounded-md border border-input bg-card px-2 text-sm",
                  "text-foreground focus:border-ring transition-colors",
                  "disabled:opacity-60",
                )}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("fieldDuration")}
              </span>
              <select
                value={manualDuration}
                onChange={(e) =>
                  setManualDuration(Number(e.target.value) as DurationPreset)
                }
                disabled={isPending || !manualDate}
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
          </div>
        ) : null}
      </form>
      {suggestion ? (
        <CalendarSuggestion
          task={suggestion}
          timezone={timezone}
          onResolved={() => setSuggestion(null)}
        />
      ) : null}
    </div>
  );
}
