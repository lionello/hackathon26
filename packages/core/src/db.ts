import { Pool, type PoolClient } from "pg";
import { getRequiredEnv } from "./env.js";

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: getRequiredEnv("DATABASE_URL") });
  return pool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export function userNotifyChannel(userId: string): string {
  return `user_events_${userId.replaceAll("-", "_")}`;
}

export async function notifyUser(userId: string): Promise<void> {
  await getPool().query("select pg_notify($1, $2)", [userNotifyChannel(userId), "deals"]);
}
