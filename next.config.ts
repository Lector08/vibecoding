import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // googleapis + google-auth-library + gaxios rely on Node-internal class
  // shapes that get mangled when bundled by Turbopack/webpack. Marking them
  // as external makes Next.js `require()` them at runtime instead, which
  // preserves their prototype methods (and fixes "missing required
  // authentication credential" errors when calling Google APIs).
  serverExternalPackages: ["googleapis", "google-auth-library", "gaxios"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
    // Required by Vercel to deploy middleware with `runtime: "nodejs"`.
    // Next.js 15.5 marks Node.js middleware as stable in release notes and
    // removed the option from the typed `ExperimentalConfig`, but Vercel's
    // function bundler still needs this flag set explicitly. Without it the
    // middleware is shipped as ESM but loaded by the CJS loader and crashes
    // at boot with "Cannot use import statement outside a module".
    // @ts-expect-error -- option exists at runtime but is no longer typed
    nodeMiddleware: true,
  },
};

export default withNextIntl(nextConfig);
