import { IBM_Plex_Sans_Arabic, Inter, Space_Grotesk } from "next/font/google";

// adjustFontFallback is off for the Latin fonts: the automatic Arial fallback
// contains Arabic letters and would be used before IBM Plex Sans Arabic.
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

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  preload: false,
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable} ${plexArabic.variable}`;
