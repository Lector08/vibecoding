import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/routing";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { UserMenu } from "./user-menu";

export async function Header() {
  const session = await auth();
  const t = await getTranslations("common");

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/images/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 shrink-0 rounded-lg"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold leading-tight truncate">
              {t("appName")}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline truncate">
              {t("tagline")}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {session?.user ? <UserMenu user={session.user} /> : null}
        </div>
      </div>
    </header>
  );
}
