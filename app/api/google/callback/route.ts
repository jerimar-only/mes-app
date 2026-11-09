import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { oauthClient, setSetting } from "@/lib/googleSettings";

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

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=google-denied", req.url)
    );
  }

  try {
    const { tokens } = await oauthClient().getToken(code);
    await setSetting("googleTokens", JSON.stringify(tokens));
    return NextResponse.redirect(
      new URL("/settings?google=connected", req.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings?error=google-failed", req.url)
    );
  }
}
