import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/actions/auth";
import { Header } from "@/components/features/header";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.id) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("auth");

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-16">
        <div className="w-full space-y-6 rounded-xl border border-border bg-card p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {t("signInTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("signInSubtitle")}
            </p>
          </div>
          <form action={signInWithGoogle}>
            <Button type="submit" size="lg" className="w-full">
              {t("signInWithGoogle")}
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
