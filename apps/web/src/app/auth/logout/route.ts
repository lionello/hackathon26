import { sessionCookieName } from "@flyer-watch/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const jar = await cookies();
  jar.delete(sessionCookieName);
  redirect("/");
}
