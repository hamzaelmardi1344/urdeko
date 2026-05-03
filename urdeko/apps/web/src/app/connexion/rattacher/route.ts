import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ProjectClaimError,
  claimGuestProjectsForCurrentUser,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

function safeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return redirectTo(request, "/projets");
  }

  const next = safeNextPath(
    request.nextUrl.searchParams.get("next"),
    `/projets/${projectId}/generation`,
  );

  const session = await auth();
  if (!session?.user?.id) {
    const current = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return redirectTo(request, `/connexion?next=${encodeURIComponent(current)}`);
  }

  try {
    await claimGuestProjectsForCurrentUser(projectId);
    return redirectTo(request, next);
  } catch (error) {
    if (error instanceof ProjectClaimError) {
      if (error.code === "email_mismatch") {
        return redirectTo(request, `/projets/${projectId}/compte?erreur=email`);
      }
      if (error.code === "missing_contact") {
        return redirectTo(request, `/projets/${projectId}/coordonnees`);
      }
      if (error.code === "already_owned") {
        return redirectTo(request, "/connexion/erreur?error=AccessDenied");
      }
      return redirectTo(request, "/connexion/erreur?error=Verification");
    }
    throw error;
  }
}
