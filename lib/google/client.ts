import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";

export class GoogleAuthError extends Error {
  readonly code:
    | "no_account"
    | "no_refresh_token"
    | "refresh_failed"
    | "missing_scope";
  constructor(code: GoogleAuthError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "GoogleAuthError";
  }
}

const REQUIRED_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

// Refresh the token if it expires within this many seconds. 60s gives us
// enough headroom that a token isn't going to expire mid-request.
const REFRESH_LEEWAY_SECONDS = 60;

function hasCalendarScope(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes(REQUIRED_CALENDAR_SCOPE);
}

/**
 * Build an authenticated OAuth2 client for a given user. Loads the most
 * recent Google Account row, primes the client with stored tokens, and
 * **proactively refreshes** the access token if it's missing or about to
 * expire. Persists the refreshed token back to the database.
 *
 * Why eagerly refresh instead of relying on lazy auto-refresh:
 * google-auth-library normally refreshes on the first 401 from a request,
 * but in this codebase the lazy path has been unreliable in dev/turbopack
 * builds (showing up as "Request is missing required authentication
 * credential"). Doing an explicit refresh up front avoids that whole class
 * of problems and surfaces auth failures with clear errors.
 */
export async function getGoogleAuthClient(userId: string): Promise<OAuth2Client> {
  // A single user has at most one Account row per Google identity (unique
  // [provider, providerAccountId]), but findFirst is robust to edge cases
  // and keeps the type loose.
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    orderBy: { id: "desc" },
  });

  if (!account) {
    throw new GoogleAuthError(
      "no_account",
      `No Google account linked for user ${userId}`,
    );
  }
  if (!hasCalendarScope(account.scope)) {
    throw new GoogleAuthError(
      "missing_scope",
      "Google account is missing calendar.events scope — user must re-consent",
    );
  }
  if (!account.refresh_token) {
    throw new GoogleAuthError(
      "no_refresh_token",
      "Google refresh token missing — user must re-consent",
    );
  }

  // Positional args, not the options-object form: in google-auth-library v10
  // the options-object constructor doesn't reliably attach credentials, which
  // surfaces as "Request is missing required authentication credential" when
  // you make API calls.
  const client = new google.auth.OAuth2(
    env.AUTH_GOOGLE_ID,
    env.AUTH_GOOGLE_SECRET,
  );

  client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    scope: account.scope ?? undefined,
    token_type: account.token_type ?? undefined,
  });

  // Persist any refreshed token (event fires whenever the library auto-refreshes
  // during a subsequent API call).
  client.on("tokens", (tokens) => {
    void prisma.account
      .update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
          ...(tokens.refresh_token
            ? { refresh_token: tokens.refresh_token }
            : {}),
          ...(tokens.scope ? { scope: tokens.scope } : {}),
          ...(tokens.token_type ? { token_type: tokens.token_type } : {}),
        },
      })
      .catch(() => {
        // Persisting a refreshed token shouldn't block the calendar call.
        // Worst case we refresh again on the next request.
      });
  });

  // -------- Eager refresh --------
  // Decide if we need to refresh: missing access_token, no expiry recorded,
  // or expiry within the leeway window.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsRefresh =
    !account.access_token ||
    !account.expires_at ||
    account.expires_at - nowSeconds <= REFRESH_LEEWAY_SECONDS;

  if (needsRefresh) {
    try {
      const { credentials } = await client.refreshAccessToken();
      // refreshAccessToken sets the new credentials on the client internally,
      // but we re-set explicitly to be defensive about library internals.
      client.setCredentials({
        access_token: credentials.access_token ?? undefined,
        refresh_token: credentials.refresh_token ?? account.refresh_token,
        expiry_date: credentials.expiry_date ?? undefined,
        scope: credentials.scope ?? account.scope ?? undefined,
        token_type: credentials.token_type ?? account.token_type ?? undefined,
      });
      // Persist immediately so subsequent requests don't re-refresh.
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token ?? account.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : account.expires_at,
          ...(credentials.refresh_token
            ? { refresh_token: credentials.refresh_token }
            : {}),
          ...(credentials.scope ? { scope: credentials.scope } : {}),
          ...(credentials.token_type
            ? { token_type: credentials.token_type }
            : {}),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new GoogleAuthError(
        "refresh_failed",
        `Failed to refresh Google access token: ${message}`,
      );
    }
  }

  return client;
}
