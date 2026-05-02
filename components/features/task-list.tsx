import { getTranslations } from "next-intl/server";
import { TaskCard } from "./task-card";
import type { TaskFilter } from "./task-filter";

interface Task {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  done: boolean;
  gcalEventId: string | null;
}

interface Props {
  tasks: Task[];
  filter: TaskFilter;
}

function applyFilter(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === "active") return tasks.filter((task) => !task.done);
  if (filter === "done") return tasks.filter((task) => task.done);
  return tasks;
}

export async function TaskList({ tasks, filter }: Props) {
  const t = await getTranslations("tasks");
  const filtered = applyFilter(tasks, filter);

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {filtered.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </ul>
  );
}
