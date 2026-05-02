import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

// Mirror of app/page.tsx for "/login" so unauthenticated users that land
// on the unprefixed login URL (e.g. via NextAuth defaults) end up on the
// localized login screen.
export default function RootLoginPage() {
  redirect(`/${routing.defaultLocale}/login`);
}
