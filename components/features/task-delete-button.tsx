"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

interface Props {
  taskId: string;
}

export function TaskDeleteButton({ taskId }: Props) {
  const t = useTranslations("tasks");
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteTask(taskId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={t("deleteAction")}
      title={t("deleteAction")}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md",
        "text-muted-foreground transition-colors",
        "hover:bg-destructive/10 hover:text-destructive",
        "focus-visible:bg-destructive/10 focus-visible:text-destructive",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
