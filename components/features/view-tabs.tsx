import { getTranslations } from "next-intl/server";
import { List, CalendarDays, CalendarRange } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "month" | "day";

interface ViewTabsProps {
  current: ViewMode;
  date?: string;
}

const ICONS: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  list: List,
  month: CalendarRange,
  day: CalendarDays,
};

export async function ViewTabs({ current, date }: ViewTabsProps) {
  const t = await getTranslations("views");
  const items: { id: ViewMode; label: string }[] = [
    { id: "list", label: t("list") },
    { id: "month", label: t("month") },
    { id: "day", label: t("day") },
  ];

  return (
    <nav
      aria-label={t("list")}
      className="inline-flex rounded-lg border border-border bg-card p-1 text-sm"
    >
      {items.map(({ id, label }) => {
        const Icon = ICONS[id];
        const params = new URLSearchParams();
        params.set("view", id);
        if (date) params.set("date", date);
        const href = `/?${params.toString()}`;
        const active = current === id;
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
