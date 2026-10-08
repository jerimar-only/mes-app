import type { Metadata } from "next";
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