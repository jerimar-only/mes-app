import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.SESSION_SECRET!;
const key = new TextEncoder().encode(secretKey);
const COOKIE_NAME = "session";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    return payload as { userId: number; role: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  // Not logged in → block protected pages
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/records/:path*",
    "/new/:path*",
    "/users/:path*",
    "/upload/:path*",
    "/reports/:path*",
    "/export/:path*",
    "/adminportal/:path*",
    "/field-values/:path*",
  ],
};