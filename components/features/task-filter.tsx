import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type TaskFilter = "all" | "active" | "done";

export const TASK_FILTERS: readonly TaskFilter[] = ["all", "active", "done"];

export function asTaskFilter(value: string | undefined): TaskFilter {
  return TASK_FILTERS.includes(value as TaskFilter)
    ? (value as TaskFilter)
    : "all";
}

interface Props {
  current: TaskFilter;
}

export async function TaskFilterTabs({ current }: Props) {
  const t = await getTranslations("tasks.filter");

  const items: { id: TaskFilter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "active", label: t("active") },
    { id: "done", label: t("done") },
  ];

  return (
    <nav
      aria-label={t("label")}
      className="inline-flex flex-wrap gap-1 text-sm"
    >
      {items.map(({ id, label }) => {
        const params = new URLSearchParams();
        params.set("view", "list");
        if (id !== "all") params.set("filter", id);
        const href = params.toString() ? `/?${params.toString()}` : "/";
        const active = current === id;
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
