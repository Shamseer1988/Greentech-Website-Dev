# Greentech Website – Development Phases

Each phase ends with: summary of what was built, how to test it on this PC, and a git commit.
**Wait for Shamseer's OK before starting the next phase.**

## Phase 1 – Project setup (local)
- [x] `git init`, connect remote `origin` → https://github.com/Shamseer1988/Greentech-Website-Dev.git
- [x] `.gitignore` (node_modules, .next, .venv, __pycache__, .env, minio data)
- [x] `docker-compose.yml` with `db` (Postgres 16, host port 5433) and `minio` (9000/9001) + named volumes
- [x] `.env.example` and local `.env`
- [x] `backend/` FastAPI skeleton: `/api/health`, settings via pydantic-settings, DB connection
- [x] `frontend/` Next.js 15 + TypeScript + Tailwind + shadcn/ui, fonts, brand colours in Tailwind config
- [x] README with "how to run locally"
- Test: `docker compose up -d db minio`, backend at http://localhost:8000/docs, frontend at http://localhost:3000

## Phase 2 – Database & API
- [ ] SQLAlchemy models + first Alembic migration (see CLAUDE.md data model)
- [ ] Seed script: property types, the 4 locations, 6 sample properties with placeholder values
- [ ] Public API: list/filter/search properties, property by code, locations, featured
- [ ] Enquiry API (POST) with validation + rate limit
- [ ] Media upload to MinIO with WebP conversion
- Test: Swagger UI at /docs

## Phase 3 – Public pages (from mockups)
- [ ] Layout: glass nav, footer, floating WhatsApp button, EN/AR switch
- [ ] Home v2 with all animations
- [ ] Listings page (filters, sort, pagination, map panel)
- [ ] Property detail (gallery, facts, amenities, map, enquiry form, WhatsApp/call, share)
- [ ] Locations page + Contact page
- [ ] Mobile layout check (bottom WhatsApp/Call bar)

## Phase 4 – Admin panel (/admin)
- [ ] Login (JWT), roles
- [ ] Properties CRUD, status change, featured toggle
- [ ] Photo/video upload, drag to reorder, set cover
- [ ] Enquiries inbox, assign agent, "Reply on WhatsApp"
- [ ] Locations management, Export to Excel

## Phase 5 – Marketing & SEO
- [ ] Arabic translations + RTL check
- [ ] SEO: metadata, sitemap.xml, robots.txt, schema.org RealEstateListing, Open Graph images
- [ ] WhatsApp click-to-chat with property code; email alerts on new enquiry
- [ ] Instagram/Facebook auto-post (Meta Graph API) – optional
- [ ] Cloudflare Turnstile on forms, Google Analytics / Meta Pixel

## Phase 6 – Deploy to Proxmox
- [ ] Production Dockerfiles (multi-stage), full `docker-compose.prod.yml`
- [ ] VM/LXC on Proxmox, Cloudflare Tunnel for the domain + SSL
- [ ] GitHub Actions: build + deploy
- [ ] Nightly DB + MinIO backup to Synology NAS

## Phase 7 – Residential module (future)
- [ ] Flats/villas in Doha: bedrooms, bathrooms, furnished, family/bachelor, etc.
