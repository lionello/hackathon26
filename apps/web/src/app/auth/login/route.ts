import { getOidcConfig, getOptionalEnv, oidc } from "@flyer-watch/core";
import { NextResponse } from "next/server";

export async function GET() {
  const config = await getOidcConfig();
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  const state = oidc.randomState();
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${getOptionalEnv("PUBLIC_BASE_URL", "http://localhost:3000")}/auth/callback`,
    scope: "openid email",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state
  });
  const response = NextResponse.redirect(url);
  response.cookies.set("fw_pkce", verifier, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 600 });
  response.cookies.set("fw_state", state, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 600 });
  return response;
}
