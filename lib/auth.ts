import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET!;
const key = new TextEncoder().encode(secretKey);
const COOKIE_NAME = "session";

export type SessionPayload = {
  userId: number;
  role: string;
  /** Set for CENRO accounts — their locked office id */
  cenroOfficeId?: number | null;
};

export async function createSession(
  userId: number,
  role: string,
  cenroOfficeId?: number | null
) {
  const token = await new SignJWT({
    userId,
    role,
    cenroOfficeId: cenroOfficeId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const p = payload as Record<string, unknown>;
    const userId = Number(p.userId);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    const cenroRaw = p.cenroOfficeId;
    const cenroOfficeId =
      cenroRaw == null || cenroRaw === "" ? null : Number(cenroRaw);
    return {
      userId,
      role: String(p.role ?? ""),
      cenroOfficeId:
        cenroOfficeId != null &&
        Number.isFinite(cenroOfficeId) &&
        cenroOfficeId > 0
          ? cenroOfficeId
          : null,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
