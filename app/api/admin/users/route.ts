/**
 * GET  /api/admin/users          → list users (SA only)
 * POST /api/admin/users          → create / update user + assign role + AOR (SA only)
 *       Body example for PENRO_ADMIN:
 *       { email, fullName, password?, role: "PENRO_ADMIN", penroOfficeId: 3 }
 *       Body example for CENRO_ADMIN:
 *       { email, fullName, password?, role: "CENRO_ADMIN", cenroOfficeId: 12 }
 *       Body example for REGIONAL:
 *       { email, fullName, password?, role: "REGIONAL" }
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { getPermissions, type AuthUser } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs"; // or your preferred hasher

async function requireSuperAdmin() {
  const user = await getAuthUser();

  if (!user || !user.isActive) return null;
  const perms = getPermissions(user);
  if (!perms.canManageUsers) return null;
  return user;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      penroOfficeId: true,
      cenroOfficeId: true,
      createdAt: true,
      penroOffice: { select: { id: true, name: true } },
      cenroOffice: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    email,
    fullName,
    password,
    role,
    penroOfficeId,
    cenroOfficeId,
    isActive,
  } = body;

  if (!email || !fullName || !role) {
    return NextResponse.json(
      { error: "email, fullName and role are required" },
      { status: 400 }
    );
  }

  if (!Object.values(UserRole).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Enforce scoping rules
  if (role === "PENRO_ADMIN" && !penroOfficeId) {
    return NextResponse.json(
      { error: "penroOfficeId is required for PENRO_ADMIN" },
      { status: 400 }
    );
  }
  if (
    (role === "CENRO_ADMIN" || role === "CENRO") &&
    !cenroOfficeId
  ) {
    return NextResponse.json(
      { error: "cenroOfficeId is required for CENRO_ADMIN / CENRO" },
      { status: 400 }
    );
  }

  const data: any = {
    email: String(email).toLowerCase().trim(),
    fullName: String(fullName).trim(),
    role,
    penroOfficeId:
      role === "PENRO_ADMIN" ? Number(penroOfficeId) : null,
    cenroOfficeId:
      role === "CENRO_ADMIN" || role === "CENRO"
        ? Number(cenroOfficeId)
        : null,
    isActive: isActive !== false,
  };

  if (password) {
    data.passwordHash = await bcrypt.hash(String(password), 12);
  }

  if (id) {
    // Update existing
    if (!password) delete data.passwordHash; // don't wipe password if not provided
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        penroOfficeId: true,
        cenroOfficeId: true,
      },
    });
    return NextResponse.json(updated);
  }

  // Create new — password required
  if (!password) {
    return NextResponse.json(
      { error: "password is required when creating a user" },
      { status: 400 }
    );
  }

  const created = await prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      penroOfficeId: true,
      cenroOfficeId: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
