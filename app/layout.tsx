import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS Apprehension Tracker",
  description:
    "Monitoring system for apprehended, seized, and confiscated forest products — Province of Cagayan",
  icons: {
    icon: "/seal.png",
    shortcut: "/seal.png",
    apple: "/seal.png",
  },
};

/** Allow single-finger pan/scroll; avoid accidental layout issues on mobile. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}