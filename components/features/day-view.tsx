import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { addDays, isSameDay, toIsoDate } from "@/lib/date-utils";
import { TaskCard } from "./task-card";

interface Task {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  done: boolean;
  gcalEventId: string | null;
}

interface Props {
  date: Date;
  tasks: Task[];
}

export async function DayView({ date, tasks }: Props) {
  const t = await getTranslations("views");
  const locale = await getLocale();

  const today = new Date();
  const dayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const prev = toIsoDate(addDays(date, -1));
  const next = toIsoDate(addDays(date, 1));
  const todayIso = toIsoDate(today);
  const isToday = isSameDay(date, today);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold capitalize">
          {isToday ? `${t("today")} · ${dayLabel}` : dayLabel}
        </h2>
        <div className="flex items-center gap-1">
          <Link
            aria-label={t("previous")}
            href={`/?view=day&date=${prev}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`/?view=day&date=${todayIso}`}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            {t("today")}
          </Link>
          <Link
            aria-label={t("next")}
            href={`/?view=day&date=${next}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("noTasksToday")}
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}
