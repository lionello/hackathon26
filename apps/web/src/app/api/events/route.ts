import { getRequiredEnv, userNotifyChannel } from "@flyer-watch/core";
import { Client } from "pg";
import { getSession } from "../../session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const client = new Client({ connectionString: getRequiredEnv("DATABASE_URL") });
  const channel = userNotifyChannel(session.userId);
  try {
    await client.connect();
    await client.query(`listen ${channel}`);
  } catch (error) {
    await client.end().catch(() => undefined);
    console.error("SSE listen setup failed", error);
    return new Response("Event stream unavailable", { status: 503 });
  }

  let cleanup = (_closeStream: boolean) => {
    void client.end().catch(() => undefined);
  };

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(chunk));
        }
      };
      const heartbeat = setInterval(() => send(": ping\n\n"), 25000);
      const close = (closeStream: boolean) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (closeStream) {
          controller.close();
        }
        void client.end().catch(() => undefined);
      };
      cleanup = close;
      controller.enqueue(encoder.encode(": connected\n\n"));
      client.on("notification", () => {
        send("event: deals\ndata: refresh\n\n");
      });
      client.on("error", (error) => {
        console.error("SSE Postgres connection failed", error);
        close(true);
      });
    },
    cancel() {
      cleanup(false);
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
