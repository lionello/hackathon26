import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getOptionalEnv, getRequiredEnv } from "../env.js";
import type { DealMatch, UserRow } from "../types.js";

let ses: SESv2Client | undefined;

function getSes(): SESv2Client {
  ses ??= new SESv2Client({ region: getOptionalEnv("AWS_REGION", "us-west-2") });
  return ses;
}

export async function sendDealDigest(user: UserRow, deals: DealMatch[]): Promise<void> {
  if (!user.email || deals.length === 0) {
    return;
  }
  const from = getRequiredEnv("SES_FROM_EMAIL");
  const { html, text } = renderDealDigest(deals);
  await getSes().send(new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [user.email] },
    Content: {
      Simple: {
        Subject: { Data: `Flyer Watch found ${deals.length} sale${deals.length === 1 ? "" : "s"}` },
        Body: {
          Html: { Data: html },
          Text: { Data: text }
        }
      }
    }
  }));
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
