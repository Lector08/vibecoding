import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

// Static redirect from "/" to the default locale. We can't rely on
// next-intl middleware (it crashed in every Vercel runtime we tried)
// nor on next.config.ts redirects() (Vercel silently 404'd those for
// this deployment). A plain Server Component redirect is bulletproof
// because it's just a regular Next.js page.
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
