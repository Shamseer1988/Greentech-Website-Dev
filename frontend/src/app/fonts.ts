import { Inter, Noto_Kufi_Arabic, Space_Grotesk } from "next/font/google";

// adjustFontFallback is off for the Latin fonts: the automatic Arial fallback
// contains Arabic letters and would be used before Noto Kufi Arabic.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  adjustFontFallback: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  adjustFontFallback: false,
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-kufi",
  preload: false,
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable} ${notoKufi.variable}`;
