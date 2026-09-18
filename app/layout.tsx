import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase resolves every relative og:url and image against the custom
  // domain, which is what a stranger and a crawler reach; the distribution
  // hostname is not in that path (docs/AWS_DEPLOYMENT.md, 2026-09-15).
  metadataBase: new URL("https://tmitrader.com"),
  title: "The Momentum Intelligence Trading Desk",
  description:
    "Small-cap momentum intelligence: what is moving, why, where it sits in the cycle, and what the share structure actually looks like.",
  // Open Graph: Marketing's strings, verified by Integration as deletion-only
  // trims of copy already live on the page (the H1 and app/page.tsx:309).
  // Text card only; an image is the one part that would need a public path.
  // The three product descriptions in this tree (this file, app/page.tsx,
  // and this card) currently differ by one claim; reconciling them is copy
  // and is Marketing's, not this file's.
  openGraph: {
    type: "website",
    url: "/",
    siteName: "The Momentum Intelligence Trading Desk",
    title: "The Momentum Intelligence Trading Desk",
    description:
      "Why it is moving, where it sits in the cycle, what the share structure is, and what supply stands behind it.",
  },
  twitter: {
    card: "summary",
    title: "The Momentum Intelligence Trading Desk",
    description:
      "Why it is moving, where it sits in the cycle, what the share structure is, and what supply stands behind it.",
  },
};

export const viewport: Viewport = {
  themeColor: "#06080b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-desk text-ink">{children}</body>
    </html>
  );
}
