"use client";

import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  getDailyDigest,
  type EnrichedDailyDigest,
  type EnrichedScheduleItem,
} from "@/lib/actions/digest";
import { toIsoDate } from "@/lib/date-utils";
import type { Category } from "@/lib/schemas/task";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
}

const categoryClass: Record<Category, string> = {
  work: "bg-category-work/15 text-category-work border-category-work/30",
  personal: "bg-category-personal/15 text-category-personal border-category-personal/30",
  study: "bg-category-study/15 text-category-study border-category-study/30",
  other: "bg-category-other/15 text-category-other border-category-other/30",
};

const priorityClass: Record<string, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

function isCategory(value: string | null | undefined): value is Category {
  return (
    value === "work" ||
    value === "personal" ||
    value === "study" ||
    value === "other"
  );
}

export function DailyDigest({ date }: Props) {
  const t = useTranslations("tasks.digest");
  const tc = useTranslations("tasks.category");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [digest, setDigest] = useState<EnrichedDailyDigest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    } catch {
      setTimezone("");
    }
  }, []);

  // Reset digest when the date changes — yesterday's plan shouldn't sit
  // around when you flip to tomorrow.
  useEffect(() => {
    setDigest(null);
    setError(null);
  }, [date]);

  function fetchDigest() {
    setError(null);
    startTransition(async () => {
      const result = await getDailyDigest({
        date: toIsoDate(date),
        timezone,
        locale,
      });
      if (result.ok) {
        setDigest(result.data);
      } else {
        setError(t("error"));
      }
    });
  }

  if (digest === null && !isPending) {
    return (
      <button
        type="button"
        onClick={fetchDigest}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-primary/30",
          "bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary",
          "transition-colors hover:bg-primary/10",
          "focus-visible:bg-primary/10",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t("button")}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-primary/30",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{t("title")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={fetchDigest}
            disabled={isPending}
            aria-label={t("refresh")}
            title={t("refresh")}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDigest(null)}
            aria-label={t("close")}
            title={t("close")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isPending && digest === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {digest ? (
        <>
          {digest.aiUnavailable ? (
            <p className="text-xs italic text-muted-foreground">
              {t("fallbackNotice")}
            </p>
          ) : null}

          {digest.greeting ? (
            <p className="text-sm leading-relaxed text-foreground">
              {digest.greeting}
            </p>
          ) : null}

          {digest.schedule.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("scheduleHeading")}
              </p>
              <ol className="space-y-1.5">
                {digest.schedule.map((item, idx) => (
                  <ScheduleRow
                    key={item.taskId}
                    index={idx + 1}
                    item={item}
                    categoryLabel={
                      isCategory(item.category) ? tc(item.category) : null
                    }
                  />
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noTasks")}</p>
          )}

          {digest.tips.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("tipsHeading")}
                </p>
              </div>
              <ul className="space-y-1 text-sm leading-relaxed text-foreground/90">
                {digest.tips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2 before:content-['—'] before:text-muted-foreground"
                  >
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ScheduleRow({
  index,
  item,
  categoryLabel,
}: {
  index: number;
  item: EnrichedScheduleItem;
  categoryLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasRationale = item.rationale.trim().length > 0;
  return (
    <li className="rounded-md border border-border bg-card/60 p-2">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {index}.
        </span>
        <span
          aria-hidden
          className={cn(
            "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
            priorityClass[item.priority] ?? priorityClass.medium,
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                item.done && "line-through opacity-60",
              )}
            >
              {item.title}
            </p>
            {item.suggestedTime ? (
              <span className="shrink-0 text-xs font-medium tabular-nums text-primary">
                {item.suggestedTime}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {categoryLabel ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-1.5 py-0.5",
                  "text-[10px] font-medium",
                  categoryClass[
                    isCategory(item.category) ? item.category : "other"
                  ],
                )}
              >
                {categoryLabel}
              </span>
            ) : null}
            {hasRationale ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                aria-expanded={open}
              >
                {open ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>{open ? "—" : "?"}</span>
              </button>
            ) : null}
          </div>
          {hasRationale && open ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.rationale}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
