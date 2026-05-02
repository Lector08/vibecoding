"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTaskDone } from "@/lib/actions/tasks";

interface Props {
  taskId: string;
  done: boolean;
  labelDone: string;
  labelNotDone: string;
}

export function TaskDoneCheckbox({ taskId, done, labelDone, labelNotDone }: Props) {
  const [isPending, startTransition] = useTransition();

  function onCheckedChange(next: boolean) {
    startTransition(async () => {
      await toggleTaskDone(taskId, next);
    });
  }

  return (
    <Checkbox
      checked={done}
      disabled={isPending}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={done ? labelDone : labelNotDone}
      className="mt-0.5"
    />
  );
}
