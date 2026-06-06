import { sessionCookieName, verifySession, type Session } from "@flyer-watch/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookieName)?.value);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}
