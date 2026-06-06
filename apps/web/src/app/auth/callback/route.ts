import { getOidcConfig, getOptionalEnv, getPool, oidc, sessionCookieName, sessionCookieOptions, signSession } from "@flyer-watch/core";
import { cookies, headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  try {
    const config = await getOidcConfig();
    const jar = await cookies();
    const pkceCodeVerifier = jar.get("fw_pkce")?.value;
    const expectedState = jar.get("fw_state")?.value;
    if (!pkceCodeVerifier || !expectedState) {
      redirectToAuthError("Missing sign-in state", "The sign-in session expired or was opened without the original login tab.");
    }
    // openid-client derives the token-exchange redirect_uri from this URL's
    // origin+path (it strips the query). Behind a TLS-terminating proxy
    // request.url is the internal http://host:3000 URL, which would not match
    // the redirect_uri sent at the authorize step and yields invalid_grant.
    // Rebuild from PUBLIC_BASE_URL so it matches the login route exactly.
    const baseUrl = getOptionalEnv("PUBLIC_BASE_URL", "http://localhost:3000");
    const callbackUrl = new URL(`${baseUrl}/auth/callback`);
    callbackUrl.search = new URL(request.url).search;
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier,
      expectedState
    });
    const claims = tokens.claims();
    const sub = claims?.sub;
    if (!sub) {
      redirectToAuthError("Missing user key", "ConsentKeys did not return a subject claim for this sign-in.");
    }
    const email = typeof claims.email === "string" ? claims.email : null;
    const user = await upsertUser(sub, email);
    jar.set(sessionCookieName, signSession({ userId: user.id, consentkeysSub: sub }), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: sessionCookieOptions().includes("Secure"),
      maxAge: 60 * 60 * 24 * 30
    });
    jar.delete("fw_pkce");
    jar.delete("fw_state");
    await headers();
    redirect(getOptionalEnv("PUBLIC_BASE_URL", "http://localhost:3000"));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirectToAuthError("Sign-in failed", authErrorDetails(error));
  }
}

async function upsertUser(sub: string, email: string | null): Promise<{ id: string }> {
  const result = await getPool().query<{ id: string }>(
    `insert into users(consentkeys_sub, email)
     values ($1, $2)
     on conflict(consentkeys_sub)
     do update set email = coalesce(excluded.email, users.email), updated_at = now()
     returning id`,
    [sub, email]
  );
  return result.rows[0]!;
}

function redirectToAuthError(message: string, details: string): never {
  const params = new URLSearchParams({ message, details });
  redirect(`/auth/error?${params}`);
}

function authErrorDetails(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }
  const record = error as Record<string, unknown>;
  const details = {
    name: record.name,
    code: record.code,
    error: record.error,
    status: record.status,
    error_description: record.error_description,
    message: record.message
  };
  return JSON.stringify(details, null, 2);
}
