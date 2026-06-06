import { getOidcConfig, getOptionalEnv, getPool, oidc, sessionCookieName, sessionCookieOptions, signSession } from "@flyer-watch/core";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const config = await getOidcConfig();
  const jar = await cookies();
  const pkceCodeVerifier = jar.get("fw_pkce")?.value;
  const expectedState = jar.get("fw_state")?.value;
  if (!pkceCodeVerifier || !expectedState) {
    throw new Error("Missing OIDC PKCE verifier or state cookie");
  }
  const tokens = await oidc.authorizationCodeGrant(config, new URL(request.url), {
    pkceCodeVerifier,
    expectedState
  });
  const claims = tokens.claims();
  const sub = claims?.sub;
  if (!sub) {
    throw new Error("ConsentKeys response did not include sub");
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
