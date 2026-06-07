import { getOptionalEnv, sessionCookieName } from "@flyer-watch/core";
import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL("/", getOptionalEnv("PUBLIC_BASE_URL", "http://localhost:3000")));
  response.cookies.set(sessionCookieName, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
  return response;
}
