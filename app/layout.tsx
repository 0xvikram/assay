import type { ReactNode } from "react";
import { Archivo, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: "variable", axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["italic"], weight: "variable", axes: ["opsz"], variable: "--font-newsreader", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });

export const metadata = {
  title: "Assay",
  description: "Know who you're paying before you pay them. A paid pre-flight for ERC-8004 agent payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
