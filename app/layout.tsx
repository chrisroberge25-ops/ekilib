import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { getRequestLocale } from "@/lib/request-locale";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Ekilib — balans lavi an Kreyòl",
  description: "Voice-first life balance for Haitian entrepreneurs. Travay, lavi, sante, ak dòmi.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale === "ht" ? "ht" : locale}>
      <body className={`${display.variable} ${sans.variable} antialiased`}>{children}</body>
    </html>
  );
}
