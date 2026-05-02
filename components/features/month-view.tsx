import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  addMonths,
  buildMonthGrid,
  buildWeekdayLabels,
  isSameDay,
  isSameMonth,
  toIsoDate,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/schemas/task";

const PRIORITY_BG: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

interface Task {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  done: boolean;
}

interface Props {
  anchor: Date;
  tasks: Task[];
}

const MAX_VISIBLE_PER_CELL = 3;

export async function MonthView({ anchor, tasks }: Props) {
  const t = await getTranslations("views");
  const locale = await getLocale();

  const grid = buildMonthGrid(anchor);
  const weekdays = buildWeekdayLabels(locale);
  const today = new Date();

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(anchor);

  const prev = toIsoDate(addMonths(anchor, -1));
  const next = toIsoDate(addMonths(anchor, 1));
  const todayIso = toIsoDate(today);
  const anchorIso = toIsoDate(anchor);

  // Group tasks by ISO date
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.deadline) continue;
    const key = toIsoDate(task.deadline);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(task);
    else byDay.set(key, [task]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Link
            aria-label={t("previous")}
            href={`/?date=${prev}`}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md",
              "border border-border text-foreground hover:bg-muted",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`/?date=${todayIso}`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border border-border",
              "px-3 text-xs font-medium text-foreground hover:bg-muted",
            )}
          >
            {t("today")}
          </Link>
          <Link
            aria-label={t("next")}
            href={`/?date=${next}`}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md",
              "border border-border text-foreground hover:bg-muted",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border">
          {weekdays.map((label, i) => (
            <div
              key={i}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const inMonth = isSameMonth(cell, anchor);
            const isToday = isSameDay(cell, today);
            const cellIso = toIsoDate(cell);
            const isSelected = cellIso === anchorIso;
            const cellTasks = byDay.get(cellIso) ?? [];
            const visible = cellTasks.slice(0, MAX_VISIBLE_PER_CELL);
            const overflow = cellTasks.length - visible.length;
            const cellHref = `/?date=${cellIso}`;

            return (
              <Link
                key={cell.getTime()}
                href={cellHref}
                aria-current={isSelected ? "date" : undefined}
                className={cn(
                  "flex min-h-[5.5rem] flex-col gap-1 border-b border-r border-border p-1.5",
                  "text-left transition-colors hover:bg-muted/50",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/40",
                )}
              >
                <span
                  className={cn(
                    "self-end text-xs font-medium tabular-nums",
                    isToday &&
                      "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  )}
                >
                  {cell.getDate()}
                </span>
                <div className="space-y-0.5">
                  {visible.map((task) => {
                    const priority = isPriority(task.priority)
                      ? task.priority
                      : "medium";
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-sm px-1 py-0.5",
                          "text-[10px] leading-tight",
                          task.done && "opacity-50 line-through",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            PRIORITY_BG[priority],
                          )}
                        />
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {overflow > 0 ? (
                    <div className="px-1 text-[10px] text-muted-foreground">
                      {t("moreTasks", { count: overflow })}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
