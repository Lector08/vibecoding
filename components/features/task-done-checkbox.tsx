"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTaskDone } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

interface Props {
  taskId: string;
  done: boolean;
  labelDone: string;
  labelNotDone: string;
}

const BURST_DOTS = 8;

export function TaskDoneCheckbox({
  taskId,
  done,
  labelDone,
  labelNotDone,
}: Props) {
  const [isPending, startTransition] = useTransition();
  // `burstId` increments every time the user marks a task as done. Using it as
  // a React key on the burst overlay forces a remount, which restarts the CSS
  // animation cleanly (otherwise CSS animations don't replay on re-render).
  const [burstId, setBurstId] = useState(0);

  function onCheckedChange(next: boolean) {
    if (next && !done) {
      setBurstId((id) => id + 1);
    }
    startTransition(async () => {
      await toggleTaskDone(taskId, next);
    });
  }

  return (
    <div className="relative mt-0.5 inline-flex">
      <span key={burstId} className={cn(burstId > 0 && "task-pop")}>
        <Checkbox
          checked={done}
          disabled={isPending}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-label={done ? labelDone : labelNotDone}
        />
      </span>
      {burstId > 0 ? (
        <span
          key={`burst-${burstId}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {Array.from({ length: BURST_DOTS }).map((_, i) => (
            <span
              key={i}
              className="task-burst-dot"
              style={
                {
                  "--burst-angle": `${(i * 360) / BURST_DOTS}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
