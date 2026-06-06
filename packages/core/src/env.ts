export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function isSecureCookieBaseUrl(): boolean {
  return getOptionalEnv("PUBLIC_BASE_URL").startsWith("https://");
}
