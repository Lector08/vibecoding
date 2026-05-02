import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/features/header";
import { TaskInput } from "@/components/features/task-input";
import { MonthView } from "@/components/features/month-view";
import { TodayPriorityList } from "@/components/features/today-priority-list";
import {
  endOfMonth,
  parseIsoDate,
  startOfMonth,
} from "@/lib/date-utils";

export const dynamic = "force-dynamic";

interface SearchParams {
  date?: string;
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/login", locale });
  }

  const userId = session!.user.id;

  const sp = await searchParams;
  const today = new Date();
  const selectedDate = parseIsoDate(sp.date) ?? today;

  // Pull all tasks once and split client-side. For a personal tracker the
  // total count stays small, and this keeps the queries simple.
  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [
      { done: "asc" },
      { deadline: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      priority: true,
      deadline: true,
      durationMinutes: true,
      done: true,
      gcalEventId: true,
    },
  });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthTasks = tasks.filter(
    (task) =>
      task.deadline &&
      task.deadline >= monthStart &&
      task.deadline <= monthEnd,
  );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <section>
          <TaskInput />
        </section>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <TodayPriorityList date={selectedDate} tasks={tasks} />
          <MonthView anchor={selectedDate} tasks={monthTasks} />
        </section>
      </main>
    </>
  );
}
