import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { brand } from "@rkyves/shared";
import "./globals.css";

/** Prefer Singapore — same region as Neon (ap-southeast-1). */
export const preferredRegion = "sin1";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} Manufacturing ERP`,
    template: `%s · ${brand.name}`,
  },
  description: brand.manufacturingTagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
