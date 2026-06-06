import { getPool, userNotifyChannel } from "@flyer-watch/core";
import { getSession } from "../../session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const client = await getPool().connect();
  const channel = userNotifyChannel(session.userId);
  await client.query(`listen ${channel}`);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      client.on("notification", () => {
        controller.enqueue(encoder.encode("event: deals\ndata: refresh\n\n"));
      });
    },
    async cancel() {
      await client.query(`unlisten ${channel}`).catch(() => undefined);
      client.release();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
