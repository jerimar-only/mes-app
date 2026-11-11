import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/permissions";

/**
 * Load the signed-in user (with their PENRO / CENRO office) from the app's
 * own session cookie (lib/auth.ts). Returns null when not signed in or when
 * the account is deactivated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { penroOffice: true, cenroOffice: true },
  });

  if (!user || !user.isActive) return null;
  return user as AuthUser;
}
