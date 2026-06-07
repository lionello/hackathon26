import { enqueueWarmUserJob } from "@flyer-watch/core";
import { NextResponse } from "next/server";
import { getSession } from "../../../session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enqueueWarmUserJob(session.userId);
  return NextResponse.json(
    { status: "queued", kind: "warm-user", userId: session.userId },
    { status: 202 }
  );
}

export async function GET() {
  return NextResponse.json({ error: "Use POST to trigger a fetch" }, { status: 405 });
}
