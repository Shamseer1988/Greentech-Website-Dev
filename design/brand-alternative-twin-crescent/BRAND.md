> **NOT APPROVED – reference only.** Management approved the current logo (see `design/brand/`). Keep these Twin Crescent files for future use; do not use them on the website.

# Green Tech – Brand guide (logo: Twin Crescent)

## Logo files
| Need | File |
|---|---|
| Website header on light background | `svg/greentech-logo-horizontal.svg` |
| Website header on dark green (Home v2 hero / nav) | `svg/greentech-logo-horizontal-on-dark.svg` |
| Footer, social posts, letterhead | `svg/greentech-logo-stacked.svg` / `-on-dark.svg` |
| Icon only (loading screen, map pins, watermark) | `svg/greentech-icon.svg` / `-on-dark.svg` / `-on-emerald.svg` |
| One colour (stamp, emboss, fax) | `*-mono-dark.svg`, `*-mono-white.svg`, `greentech-icon-gold.svg` (gold foil) |
| Instagram / Facebook / WhatsApp profile | `png/greentech-app-icon-1024.png` |
| Link preview when shared (WhatsApp, Facebook) | `png/og-image-1200x630.png` |
| Browser tab / phone home screen | `favicon/` → copy all into `frontend/app/` (favicon.ico, icon.svg, apple-icon.png) |

All SVG text is converted to outlines, so the logo looks the same on every computer (no fonts needed).
PNG files have transparent backgrounds (except app icon and OG image).

### Rules
- Keep clear space around the logo of at least the height of the gold dot × 3.
- Minimum size: horizontal logo 160 px wide on screen; icon 24 px (use `favicon-small.svg` below 24 px).
- Do not stretch, recolour outside this palette, add shadows or put the full-colour logo on busy photos – use the on-dark or mono-white version.

## Colours
| Name | HEX | Use |
|---|---|---|
| Emerald | `#0E5A43` | Primary buttons, links, icons |
| Emerald Dark | `#0B4D3A` | Hover states, headings on light |
| Deep Green | `#062A1F` | Hero, dark sections, header |
| Deepest | `#041D15` | Footer |
| Burgundy | `#7A1F3D` | Secondary accent, Arabic sub-lines, "Rented" badges |
| Gold | `#C9A45C` | Main CTA buttons (with ink text), thin lines, ticker strip |
| Gold Text | `#8A6D2F` | Gold-coloured text on white (accessible) |
| Ivory | `#F4F5F2` | Light page background |
| Mint | `#3DDC97` | Highlights on dark backgrounds only |
| Rose | `#E9B8C8` | Logo inner crescent on dark only |
| Ink | `#13201B` | Body text |
| Muted | `#5B6B64` | Secondary text |
| Line | `#E2E7E3` | Borders |
| WhatsApp | `#18884A` | WhatsApp buttons (white text) |

Accessibility checks (WCAG AA): ink on gold 7.2:1 · white on emerald 8.2:1 · white on burgundy 10:1 ·
mint on deep 8.8:1 · white on WhatsApp 4.5:1. **Never use gold `#C9A45C` for small text on white (2.4:1) – use Gold Text.**

## Fonts
- Logo wordmark: **Montserrat** ExtraBold / SemiBold (already outlined in the files)
- Website headings: **Space Grotesk** · Body: **Inter**
- Arabic: **Noto Kufi Arabic**

Code tokens: `brand-theme.css` (Tailwind v4 `@theme` + plain CSS variables) and `tokens.json`.
