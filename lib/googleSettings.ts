/**
 * Google Drive OAuth + key/value settings (same pattern as the PDF merger).
 *
 * Requires:
 * - env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * - Prisma model:
 *     model Setting {
 *       key   String @id
 *       value String
 *     }
 */
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    // Table may not exist yet
    return null;
  }
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSetting(key: string) {
  await prisma.setting.deleteMany({ where: { key } });
}

export const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/google/callback"
  );
}

/** OAuth client with saved tokens, or null if not connected. */
export async function authedClient() {
  const raw = await getSetting("googleTokens");
  if (!raw || !googleConfigured()) return null;
  const client = oauthClient();
  client.setCredentials(JSON.parse(raw));
  client.on("tokens", async (t) => {
    const current = JSON.parse((await getSetting("googleTokens")) || "{}");
    await setSetting("googleTokens", JSON.stringify({ ...current, ...t }));
  });
  return client;
}
