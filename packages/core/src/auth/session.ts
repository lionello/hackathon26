import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequiredEnv, isSecureCookieBaseUrl } from "../env.js";

export type Session = {
  userId: string;
  consentkeysSub: string;
};

export const sessionCookieName = "fw_session";

export function signSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHmac("sha256", getRequiredEnv("SESSION_SECRET")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(cookie: string | undefined): Session | null {
  if (!cookie) return null;
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", getRequiredEnv("SESSION_SECRET")).update(payload).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
}

export function sessionCookieOptions(): string {
  const secure = isSecureCookieBaseUrl() ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}
