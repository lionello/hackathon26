export type FlyerSourceName = "flipp" | "wholefoods" | "sungiven";

export type FlyerItem = {
  source: FlyerSourceName;
  source_item_id: string;
  store: string;
  name: string;
  price: number | null;
  quantity: number | null;
  original_price: number | null;
  valid_from: string | null;
  valid_to: string | null;
  image_url: string | null;
  url: string | null;
};

export type SearchContext = {
  postalCode: string;
  storeIds: Partial<Record<FlyerSourceName, string[]>>;
};

export type SearchOptions = {
  cacheOnly?: boolean;
};

export interface FlyerSource {
  name: FlyerSourceName;
  ttlSeconds: number;
  search(query: string, ctx: SearchContext, options?: SearchOptions): Promise<FlyerItem[]>;
}

export type WatchItem = {
  id: string;
  user_id: string;
  query: string;
  min_discount_pct: number;
};

export type UserRow = {
  id: string;
  consentkeys_sub: string;
  email: string | null;
  postal_code: string;
};

export type DealMatch = {
  watchItem: WatchItem;
  item: FlyerItem;
  discountPct: number | null;
};
