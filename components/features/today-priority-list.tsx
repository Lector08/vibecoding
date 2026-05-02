import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CelebrationBanner } from "./celebration-banner";
import { TaskCard } from "./task-card";
import { addDays, isSameDay, toIsoDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/schemas/task";

// Drop your celebration images into `public/images/` named exactly like this.
// The banner picks one based on the day (deterministic — no hydration drift).
// If a slot is missing, the banner falls back to a checkmark icon.
const CELEBRATION_FILES = [
  "done-1.png",
  "done-2.png",
  "done-3.png",
  "done-4.png",
] as const;

function pickCelebrationImage(date: Date): string {
  const epochDay = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  const len = CELEBRATION_FILES.length;
  const idx = ((epochDay % len) + len) % len;
  return `/images/${CELEBRATION_FILES[idx]}`;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  durationMinutes?: number | null;
  done: boolean;
  gcalEventId: string | null;
}

interface Props {
  date: Date;
  tasks: Task[];
}

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function asPriority(value: string): Priority {
  return value === "high" || value === "low" ? value : "medium";
}

function compareTasks(a: Task, b: Task): number {
  // Active tasks first.
  if (a.done !== b.done) return a.done ? 1 : -1;
  // Higher priority first.
  const pri = PRIORITY_RANK[asPriority(a.priority)] - PRIORITY_RANK[asPriority(b.priority)];
  if (pri !== 0) return pri;
  // Earlier deadline first; nulls go after.
  if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return 0;
}

export async function TodayPriorityList({ date, tasks }: Props) {
  const t = await getTranslations("tasks");
  const v = await getTranslations("views");
  const locale = await getLocale();

  const today = new Date();
  const isToday = isSameDay(date, today);

  const dayTasks = tasks
    .filter((task) => task.deadline && isSameDay(task.deadline, date))
    .sort(compareTasks);

  // Tasks without a deadline are only shown when we're on the "today" view —
  // they don't belong to any specific day, so we surface them once.
  const noDeadlineTasks = isToday
    ? tasks.filter((task) => !task.deadline).sort(compareTasks)
    : [];

  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);

  const heading = isToday
    ? t("todayTasks")
    : t("selectedDayTasks", { date: dateLabel });

  const todayIso = toIsoDate(today);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const prevIso = toIsoDate(addDays(date, -1));
  const nextIso = toIsoDate(addDays(date, 1));
  const selectedIso = toIsoDate(date);

  const quickChips = [
    { iso: todayIso, label: v("today") },
    { iso: toIsoDate(tomorrow), label: v("tomorrow") },
    { iso: toIsoDate(dayAfter), label: v("dayAfterTomorrow") },
  ];

  const arrowClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-md",
    "border border-border text-foreground hover:bg-muted",
  );
  const chipClass = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
      "transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-foreground hover:bg-muted",
    );

  return (
    <section
      aria-label={heading}
      className={cn(
        "flex h-full min-h-[16rem] flex-col gap-3 rounded-xl border border-border",
        "bg-card p-4",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
          {isToday ? (
            <span className="text-xs capitalize text-muted-foreground">
              {dateLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/?date=${prevIso}`}
            aria-label={v("previousDay")}
            className={arrowClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {quickChips.map(({ iso, label }) => (
            <Link
              key={iso}
              href={`/?date=${iso}`}
              aria-current={iso === selectedIso ? "date" : undefined}
              className={chipClass(iso === selectedIso)}
            >
              {label}
            </Link>
          ))}
          <Link
            href={`/?date=${nextIso}`}
            aria-label={v("nextDay")}
            className={arrowClass}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {dayTasks.length === 0 && noDeadlineTasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("noTasksSelectedDay")}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Celebrate only on today, only when at least one task exists for
              the day, and only when every dated task is done. */}
          {isToday && dayTasks.length > 0 && dayTasks.every((task) => task.done) ? (
            <CelebrationBanner imageSrc={pickCelebrationImage(date)} />
          ) : null}
          {dayTasks.length > 0 ? (
            <ul className="space-y-2">
              {dayTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          ) : null}
          {noDeadlineTasks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("noDeadlineSection")}
              </p>
              <ul className="space-y-2">
                {noDeadlineTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
