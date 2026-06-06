export type ParsedPrice = {
  price: number | null;
  quantity: number | null;
  original_price: number | null;
};

const money = "\\$?([0-9]+(?:\\.[0-9]{1,2})?)";

export function parsePriceText(input: string | null | undefined): ParsedPrice {
  if (!input) {
    return { price: null, quantity: null, original_price: null };
  }

  const text = input.replace(/\s+/g, " ").trim();
  const multiBuy = text.match(new RegExp(`\\b(\\d+)\\s*(?:for|/)\\s*${money}`, "i"));
  const was = text.match(new RegExp(`(?:was|reg(?:ular)?|save from)\\s*${money}`, "i"));
  const firstMoney = text.match(new RegExp(money));

  if (multiBuy) {
    return {
      quantity: Number(multiBuy[1]),
      price: Number(multiBuy[2]),
      original_price: was ? Number(was[1]) : null
    };
  }

  return {
    quantity: null,
    price: firstMoney ? Number(firstMoney[1]) : null,
    original_price: was ? Number(was[1]) : null
  };
}

export function discountPct(price: number | null, originalPrice: number | null): number | null {
  if (!price || !originalPrice || originalPrice <= price) {
    return null;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
