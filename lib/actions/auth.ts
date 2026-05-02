"use server";

import { headers } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import { routing } from "@/i18n/routing";

// Pull the active locale from the request URL so post-auth redirects land
// on the right language root (`/uk` or `/en`) instead of `/`, which would
// trigger an extra middleware redirect and can leak the wrong locale.
async function currentLocale(): Promise<string> {
  const h = await headers();
  const pathname =
    h.get("x-invoke-path") ?? h.get("x-pathname") ?? h.get("referer") ?? "";
  const match = pathname.match(/\/(uk|en)(\/|$)/);
  return match?.[1] ?? routing.defaultLocale;
}

export async function signInWithGoogle() {
  const locale = await currentLocale();
  await signIn("google", { redirectTo: `/${locale}` });
}

export async function signOutAction() {
  const locale = await currentLocale();
  await signOut({ redirectTo: `/${locale}/login` });
}
