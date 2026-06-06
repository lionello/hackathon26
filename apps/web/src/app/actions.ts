"use server";

import { enqueueWarmUserJob, getPool } from "@flyer-watch/core";
import { revalidatePath } from "next/cache";
import { requireSession } from "./session";

export async function addWatchItem(formData: FormData): Promise<void> {
  const session = await requireSession();
  const query = String(formData.get("query") ?? "").trim();
  if (!query) return;
  await getPool().query(
    "insert into watch_items(user_id, query) values ($1, $2)",
    [session.userId, query]
  );
  await enqueueWarmUserJob(session.userId);
  revalidatePath("/");
}

export async function removeWatchItem(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  await getPool().query("delete from watch_items where id = $1 and user_id = $2", [id, session.userId]);
  await enqueueWarmUserJob(session.userId);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function saveOnboarding(formData: FormData): Promise<void> {
  const session = await requireSession();
  const postalCode = String(formData.get("postalCode") ?? "V6B 1A1").trim();
  const wholeFoodsStore = String(formData.get("wholeFoodsStore") ?? "10244").trim();
  const sungivenStore = String(formData.get("sungivenStore") ?? "vancouver").trim();
  await getPool().query("update users set postal_code = $1, updated_at = now() where id = $2", [postalCode, session.userId]);
  await getPool().query("delete from user_stores where user_id = $1 and source in ('wholefoods', 'sungiven')", [session.userId]);
  await getPool().query(
    `insert into user_stores(user_id, source, store_id)
     values ($1, 'wholefoods', $2), ($1, 'sungiven', $3)
     on conflict do nothing`,
    [session.userId, wholeFoodsStore, sungivenStore]
  );
  await enqueueWarmUserJob(session.userId);
  revalidatePath("/");
  revalidatePath("/settings");
}
