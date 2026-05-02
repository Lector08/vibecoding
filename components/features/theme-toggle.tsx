"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const Icon = !mounted
    ? Sun
    : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("theme")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md",
          "border border-border bg-background text-foreground",
          "hover:bg-muted transition-colors",
        )}
      >
        <Icon className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            "min-w-[10rem] rounded-md border border-border bg-card p-1",
            "text-card-foreground shadow-md",
          )}
        >
          <ThemeItem
            label={t("themeLight")}
            icon={<Sun className="h-4 w-4" />}
            active={theme === "light"}
            onSelect={() => setTheme("light")}
          />
          <ThemeItem
            label={t("themeDark")}
            icon={<Moon className="h-4 w-4" />}
            active={theme === "dark"}
            onSelect={() => setTheme("dark")}
          />
          <ThemeItem
            label={t("themeSystem")}
            icon={<Monitor className="h-4 w-4" />}
            active={theme === "system"}
            onSelect={() => setTheme("system")}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ThemeItem({
  label,
  icon,
  active,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        "outline-none transition-colors",
        "focus:bg-muted",
        active && "font-medium",
      )}
    >
      {icon}
      <span>{label}</span>
    </DropdownMenu.Item>
  );
}
