import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { config } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(config.app.baseUrl),
  title: "Confidently Wrong | The World's Worst Podcast",
  description:
    "An AI podcast where Chad and Marina say spectacularly wrong things with complete confidence. Submit topics, vote on what they ruin next, and listen to the chaos.",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)]">{children}</body>
    </html>
  );
}
