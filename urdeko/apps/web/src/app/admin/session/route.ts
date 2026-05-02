import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/lib/auth";
import { hasValidAdminMagicToken } from "@/lib/admin/magic-link";

function redirectTo(request: NextRequest, path: string): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return NextResponse.redirect(new URL(path, request.url));
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return NextResponse.redirect(new URL(path, `${proto}://${host}`));
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";

  if (!email || !token) {
    return redirectTo(request, "/admin/connexion?error=invalid");
  }

  if (!(await hasValidAdminMagicToken(email, token))) {
    return redirectTo(request, "/admin/connexion?error=invalid");
  }

  try {
    const result = await signIn("admin-magic", {
      email,
      token,
      redirect: false,
      redirectTo: "/admin",
    });

    if (typeof result === "string" && /[?&]error=/.test(result)) {
      return redirectTo(request, "/admin/connexion?error=invalid");
    }
  } catch (error) {
    console.error("[admin/session] magic link failed", error);
    return redirectTo(request, "/admin/connexion?error=invalid");
  }

  return redirectTo(request, "/admin");
}
