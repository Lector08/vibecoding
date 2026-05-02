"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  /** Absolute path under /public, e.g. "/images/done-1.png" */
  imageSrc: string;
}

export function CelebrationBanner({ imageSrc }: Props) {
  const t = useTranslations("tasks");
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-primary/30",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3",
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden",
          "rounded-lg bg-card",
        )}
      >
        {imageBroken ? (
          <CheckCircle2 className="h-9 w-9 text-primary" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            onError={() => setImageBroken(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold leading-snug">
          {t("celebrationAllDone")}
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          {t("celebrationGreatJob")}
        </p>
      </div>
    </div>
  );
}
