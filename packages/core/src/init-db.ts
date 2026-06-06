import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getPool } from "./db.js";

const sqlPath = resolve(process.cwd(), "db/init.sql");
const sql = await readFile(sqlPath, "utf8");
await getPool().query(sql);
await getPool().end();
console.log("Database initialized");
