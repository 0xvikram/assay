import type { ReactNode } from "react";
import { Archivo, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// The three voices of docs/BRAND.md §2: Newsreader speaks, Archivo explains, Plex Mono is the machine.
const archivo = Archivo({ subsets: ["latin"], weight: "variable", variable: "--font-archivo", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], weight: "variable", axes: ["opsz"], variable: "--font-newsreader", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });

export const metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "https://assay-dusky.vercel.app"),
  title: "Assay",
  description: "Know who you're paying before you pay them. A paid pre-flight for ERC-8004 agent payments.",
  openGraph: { title: "Assay", description: "Know who you're paying before you pay them.", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Assay", description: "Know who you're paying before you pay them.", images: ["/og.jpg"] },
};

export const viewport = { themeColor: "#eef3fa" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
