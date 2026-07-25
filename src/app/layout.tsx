import type { Metadata } from "next";
import { Inter, Oswald, Bangers, Comic_Neue, Zen_Antique } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const bangers = Bangers({ subsets: ["latin"], weight: "400", variable: "--font-bangers", display: "swap" });
const comicNeue = Comic_Neue({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-comic-neue", display: "swap" });
const zenAntique = Zen_Antique({ subsets: ["latin"], weight: "400", variable: "--font-zen-antique", display: "swap" });

export const metadata: Metadata = {
  title: "MangaForge — AI Manga Studio",
  description: "Type a story idea, get a fully drawn, laid-out black-and-white manga chapter you can edit panel by panel and export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${oswald.variable} ${bangers.variable} ${comicNeue.variable} ${zenAntique.variable}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
