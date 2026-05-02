"use client";

import { useLocale, useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Languages } from "lucide-react";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("language")}
        disabled={isPending}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md px-3",
          "border border-border bg-background text-foreground",
          "hover:bg-muted transition-colors text-sm",
        )}
      >
        <Languages className="h-4 w-4" />
        <span className="uppercase">{currentLocale}</span>
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
          {routing.locales.map((locale) => (
            <DropdownMenu.Item
              key={locale}
              onSelect={() => onChange(locale)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-sm",
                "px-2 py-1.5 text-sm outline-none transition-colors focus:bg-muted",
                locale === currentLocale && "font-medium",
              )}
            >
              <span>{t(locale)}</span>
              <span className="text-xs uppercase text-muted-foreground">
                {locale}
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
