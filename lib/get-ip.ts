import { headers } from "next/headers";

export type ClientInfo = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
};

const decode = (v: string | null) => {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

export async function getClientInfo(): Promise<ClientInfo> {
  const h = await headers();
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";

  return {
    ip,
    country: h.get("x-vercel-ip-country"),
    region: decode(h.get("x-vercel-ip-country-region")),
    city: decode(h.get("x-vercel-ip-city")), // Vercel URL-encodes city names
  };
}

// Keep this so existing imports still work
export async function getClientIp(): Promise<string> {
  return (await getClientInfo()).ip;
}