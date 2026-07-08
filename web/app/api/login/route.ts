import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, checkPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/dashboard");

  const token = await checkPassword(password);
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Secure cookies require HTTPS -- base this on how the request actually arrived (checking
  // x-forwarded-proto first, since a reverse proxy/host like Vercel terminates TLS and forwards
  // plain http internally), not on NODE_ENV. A `next build && next start` running locally over
  // plain http is still "production" by NODE_ENV but has no TLS, and a Secure cookie there gets
  // silently dropped by the browser -- login looks like it redirects successfully but never sticks.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto ? forwardedProto === "https" : request.nextUrl.protocol === "https:";

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
