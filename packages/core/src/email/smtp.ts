import nodemailer, { type Transporter } from "nodemailer";
import { getOptionalEnv, getRequiredEnv } from "../env.js";
import type { DealMatch, UserRow } from "../types.js";

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  const auth = smtpAuth();
  transporter ??= nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port: Number(getOptionalEnv("SMTP_PORT", "587")),
    secure: parseBoolean(getOptionalEnv("SMTP_SECURE")),
    ...(auth ? { auth } : {})
  });
  return transporter;
}

function smtpAuth(): { user: string; pass: string } | undefined {
  const user = getOptionalEnv("SMTP_USER");
  const pass = getOptionalEnv("SMTP_PASSWORD");
  return user && pass ? { user, pass } : undefined;
}

export async function sendDealDigest(user: UserRow, deals: DealMatch[]): Promise<void> {
  if (!user.email || deals.length === 0) {
    return;
  }
  const from = getRequiredEnv("MAIL_FROM");
  const { html, text } = renderDealDigest(deals);
  await getTransporter().sendMail({
    from,
    to: user.email,
    subject: `Flyer Watch found ${deals.length} sale${deals.length === 1 ? "" : "s"}`,
    html,
    text
  });
}

export function renderDealDigest(deals: DealMatch[]): { html: string; text: string } {
  const rows = deals.map(({ item }) => {
    const price = item.price === null ? "price unavailable" : `$${item.price.toFixed(2)}`;
    const href = item.url ?? "#";
    return `<tr><td>${escapeHtml(item.store)}</td><td><a href="${escapeHtml(href)}">${escapeHtml(item.name)}</a></td><td>${price}</td></tr>`;
  }).join("");
  const text = deals.map(({ item }) => {
    const price = item.price === null ? "price unavailable" : `$${item.price.toFixed(2)}`;
    return `${item.store}: ${item.name} - ${price} ${item.url ?? ""}`;
  }).join("\n");
  return {
    html: `<table><thead><tr><th>Store</th><th>Item</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>`,
    text
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char] ?? char);
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
