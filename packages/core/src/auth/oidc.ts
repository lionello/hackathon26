import * as client from "openid-client";
import { getRequiredEnv } from "../env.js";

let configPromise: Promise<client.Configuration> | undefined;

export function getOidcConfig(): Promise<client.Configuration> {
  configPromise ??= client.discovery(
    new URL(getRequiredEnv("CONSENTKEYS_ISSUER_URL")),
    getRequiredEnv("CONSENTKEYS_CLIENT_ID"),
    getRequiredEnv("CONSENTKEYS_CLIENT_SECRET")
  );
  return configPromise;
}

export { client as oidc };
