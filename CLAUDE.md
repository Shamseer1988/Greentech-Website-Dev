# Greentech Real Estate Broker – Website

Public website + admin panel for **Greentech Real Estate Broker** (Doha, Qatar).
We rent **labour accommodation, warehouses, cafeterias and supermarket/shop units** in
Industrial Area, Umm Silal, Al Khor, Abu Nakhla and other areas. **Residential flats/villas in Doha** come later.

- GitHub: https://github.com/Shamseer1988/Greentech-Website-Dev
- Local dev folder: `C:\Apps\Greentech Website Dev` (Windows 11 PC)
- Final hosting: Proxmox server (Docker Compose) behind Cloudflare Tunnel – same way as the Paris United Group site.

## How we work (IMPORTANT)
- Work **phase by phase** (see `docs/PHASES.md`). Finish one phase, show me what was done and how to test it, then **wait for my "OK" before starting the next phase**.
- Before big changes, explain the plan in short simple English first.
- Give a short explanation of any new tool/library the first time you use it.
- Never commit secrets. Real values go in `.env` (git-ignored); keep `.env.example` updated.
- Commit after each working step with clear messages. Push to GitHub only when I ask.

## Tech stack
**Frontend** – `frontend/`
- Next.js 15 (App Router) + TypeScript, Server Components for SEO
- Tailwind CSS + shadcn/ui
- Framer Motion (reveals, rotating headline word, slider), GSAP + ScrollTrigger (scroll animations), Lenis (smooth scroll)
- next-intl – English + Arabic (RTL)
- Leaflet + OpenStreetMap for maps; "Get directions" links open Google Maps
- Swiper / yet-another-react-lightbox for galleries
- Respect `prefers-reduced-motion` everywhere

**Backend** – `backend/`
- FastAPI (Python 3.12), Pydantic v2
- PostgreSQL 16 + SQLAlchemy 2 + Alembic migrations
- MinIO (S3-compatible) for property photos/videos; images auto-converted to WebP (Pillow)
- JWT auth for admin (roles: admin, agent)
- Enquiry notifications: email (SMTP) + WhatsApp link; WhatsApp Cloud API later

**Infra**
- `docker-compose.yml` – postgres, minio, backend, frontend
- Local dev: Postgres + MinIO in Docker; frontend and backend can run natively with hot reload
- Ports: frontend 3000, backend 8000, postgres 5433 (host), MinIO 9000 (API) / 9001 (console)

## Folder structure (target)
```
/frontend          Next.js app (public site + /admin)
/backend           FastAPI app (app/api, app/models, app/schemas, app/services, alembic/)
/design/mockups    Approved UI mockups (.dc.html design-canvas files – reference only)
/docs              PHASES.md, API notes, deployment notes
docker-compose.yml
.env.example
```

## Design reference
Approved home page: **`design/mockups/HomeV2.dc.html`** (dark hero, advanced motion).
Other pages: Listings, PropertyDetail, Locations, Contact, Admin, Mobile in the same folder.
These files are mockups for a design canvas (they load a `support.js` runtime), so they will not open
standalone in a browser – read the HTML/inline styles and the `renderVals()` data for layout, copy, colours and sections.
`Main.dc.html` was the first home version – NOT selected; use only its footer/top-bar ideas if useful.

### Brand (APPROVED by management: the CURRENT Green Tech logo)
Source of truth: **`design/brand/`** → `BRAND.md` (which file where), `brand-theme.css` (Tailwind v4 `@theme` + CSS vars), `tokens.json`.
- Header (EN): `svg/greentech-logo-compact-en.svg` · on the dark hero: `svg/greentech-logo-compact-en-on-dark.svg`
- Header (AR): `svg/greentech-logo-compact-ar.svg` / `-on-dark.svg`
- Footer: `svg/greentech-logo-stacked-on-dark.svg` · full bilingual: `svg/greentech-logo-horizontal.svg`
- Favicon set: `favicon/` · social share: `png/og-image-1200x630.png`
- `design/brand-alternative-twin-crescent/` = NOT approved, reference only – never use on the site.

Website colours MUST match the approved logo:
- Logo Green `#2A9D6A` (icons, highlights, large text) · Green 700 `#1F7A52` = primary buttons (white text) · Green 800 `#17603F` hover
- Logo Rose `#A3486F` = accent (secondary buttons with white text, section labels, underline rules, ticker strip) · Rose 700 `#86385A` hover
- Logo Slate `#4A5468` = headings on light · Ink `#1E2430` body · Muted `#5B6474`
- Deep `#062A1F` (dark hero/sections), Deepest `#041D15` (footer) · on dark: Mint `#3DDC97` (CTA with deep text), Pink `#E9A8C3`, Sage `#D3E4DC`
- Ivory bg `#F4F5F2`, Line `#E2E7E3`, Field `#CFD8D2`, Tint `#E3F2EA`, Rose tint `#F6E6EE` · WhatsApp `#18884A`
- Do NOT use: `#F2C14E`, `#C9A45C` (gold), `#0E5A43`, `#0B4D3A`, `#7A1F3D` (Twin Crescent palette), `#1F9D55`, `#F6F7F4`, `#4B5B55`, `#093E2E`
- Fonts: **Space Grotesk** (headings), **Inter** (body), **Noto Kufi Arabic** (Arabic). Logo fonts are already outlined in the SVGs.
- Radius: cards 16–28px, buttons 10–14px, chips 999px

### Home v2 sections (in order)
1. Glass pill nav + EN/عربي toggle + "Send enquiry"
2. Hero: moving grid bg, rotating word headline ("Rent labour camps / warehouses / cafeterias / supermarkets across Qatar"), glass search (type + location), WhatsApp link, animated isometric building SVG (windows light up, floating pins, glass info chips)
3. Gold marquee ticker of locations + categories
4. Bento category grid (Labour Accommodation large card + Warehouses, Cafeterias, Supermarkets & Shops, Residential "Coming soon")
5. Auto-playing featured slider with progress bars + prev/next
6. Interactive Qatar map – pulsing pins, click shows area card
7. "How it works" 3 steps with animated dashed line
8. Residential "Coming soon" CTA, footer (social + Property Finder / Qatar Living / Mzad Qatar links)
9. Floating WhatsApp button with pulse ring

## Data model (first version)
- `property_types` (Labour Accommodation, Warehouse, Cafeteria, Supermarket/Shop, Residential)
- `locations` (name_en, name_ar, slug, lat, lng, description)
- `properties` (code e.g. GT-LA-101, title_en/ar, description_en/ar, type, location, status [draft/available/reserved/rented], rent_qar, rooms, capacity_persons, area_sqm, floors, amenities[], lat, lng, national_address, featured, published_at)
- `property_media` (property, url, kind [image/video/360], sort_order, is_cover)
- `enquiries` (property nullable, name, company, phone, email, looking_for, area, message, reply_on_whatsapp, status, assigned_to)
- `users` (admin/agent)

## Commands (fill in as the project grows)
- Start DB + MinIO: `docker compose up -d db minio`
- Backend: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload`
- Frontend: `cd frontend && npm run dev`
- Migrations: `cd backend && .venv\Scripts\alembic upgrade head` (new: `alembic revision --autogenerate -m "..."`)
- Demo listings with photos (dev only): `python -m app.scripts.demo` (remove: `--remove`)
- Draft blog articles (once): `python -m app.scripts.starter_articles`
- Create/reset admin: `python -m app.scripts.create_admin`
- Seed: `python -m app.scripts.seed` | Tests: `python -m pytest` | Lint: `ruff check app tests`
