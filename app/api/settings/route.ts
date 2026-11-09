import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractFolderId } from "@/lib/drive";
import {
  deleteSetting,
  getSetting,
  googleConfigured,
  setSetting,
} from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    parentFolderId: await getSetting("parentFolderId"),
    googleConfigured: googleConfigured(),
    googleConnected: Boolean(await getSetting("googleTokens")),
  });
}

/** Save parent folder (accepts Drive URL or ID). SUPERADMIN only. */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await req.json()) as { parentFolder?: string };
  const id = extractFolderId(body.parentFolder ?? "");
  if (!/^[\w-]{10,}$/.test(id)) {
    return NextResponse.json(
      { error: "That does not look like a Drive folder link or ID" },
      { status: 400 }
    );
  }
  await setSetting("parentFolderId", id);
  return NextResponse.json({ parentFolderId: id });
}

/** Disconnect Google (clear tokens). SUPERADMIN only. */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await deleteSetting("googleTokens");
  return NextResponse.json({ ok: true });
}
