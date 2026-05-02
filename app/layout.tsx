import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Wizard",
  description: "Personal task tracker with natural-language input.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

// Root layout. The dynamic `lang` attribute and the i18n / theme providers
// live in `app/[locale]/layout.tsx` so they can read the locale segment.
// We hardcode `lang="uk"` here as a sane default for the unlocalized
// redirect pages (`/` and `/login`); those pages immediately redirect, so
// the value is never user-visible.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
