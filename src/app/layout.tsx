import type { Metadata } from "next";

import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.app.baseUrl),
  title: "Confidently Wrong",
  description:
    "An AI podcast where Chad and Marina say spectacularly wrong things with complete confidence. Submit topics, vote on what they ruin next, and listen to the chaos.",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
    shortcut: "/images/logo.png",
  },
  openGraph: {
    title: "Confidently Wrong",
    description: "The World's Worst Podcast. Two AI hosts. Zero expertise. Full confidence.",
    images: ["/images/podcast-cover.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Confidently Wrong",
    description: "The World's Worst Podcast.",
    images: ["/images/podcast-cover.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)]">{children}</body>
    </html>
  );
}
