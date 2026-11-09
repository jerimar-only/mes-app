import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  SCOPES,
  googleConfigured,
  oauthClient,
} from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session.role !== "SUPERADMIN") {
    return NextResponse.redirect(
      new URL("/settings?error=admin-only", req.url)
    );
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?error=google-not-configured", req.url)
    );
  }

  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  return NextResponse.redirect(url);
}
