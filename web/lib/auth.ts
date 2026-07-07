export const AUTH_COOKIE_NAME = "size_premium_auth";

/** Auth is opt-in: with no SITE_PASSWORD set (the default for a local self-hosted copy), the site is open. */
export function authEnabled(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie never holds the raw password -- only a hash of (password + a server secret). */
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return sha256Hex(`${password}:${process.env.AUTH_SALT ?? "size-premium-tool"}`);
}

export async function checkPassword(candidate: string): Promise<string | null> {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return null;
  if (candidate !== expected) return null;
  return expectedAuthToken();
}
