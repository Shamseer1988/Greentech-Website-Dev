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
- [x] SQLAlchemy models + first Alembic migration (see CLAUDE.md data model)
- [x] Seed script: property types, the 4 locations, 6 sample properties with placeholder values
- [x] Public API: list/filter/search properties, property by code, locations, featured
- [x] Enquiry API (POST) with validation + rate limit
- [x] Media upload to MinIO with WebP conversion
- Test: Swagger UI at /docs

## Phase 3 – Public pages (from mockups)
- [x] Layout: glass nav, footer, floating WhatsApp button, EN/AR switch
- [x] Home v2 with all animations
- [x] Listings page (filters, sort, pagination, map panel)
- [x] Property detail (gallery, facts, amenities, map, enquiry form, WhatsApp/call, share)
- [x] Locations page + Contact page
- [x] Mobile layout check (bottom WhatsApp/Call bar)

## Phase 4 – Admin panel (/admin)
- [x] Login (JWT), roles
- [x] Properties CRUD, status change, featured toggle
- [x] Photo/video upload, drag to reorder, set cover
- [x] Enquiries inbox, assign agent, "Reply on WhatsApp"
- [x] Locations management, Export to Excel

## Phase 5 – Marketing & SEO
- [x] Arabic translations + RTL check
- [x] SEO: metadata, sitemap.xml, robots.txt, schema.org RealEstateListing, Open Graph images
- [x] WhatsApp click-to-chat with property code; email alerts on new enquiry
- [x] Instagram/Facebook auto-post (Meta Graph API) – optional
- [x] Cloudflare Turnstile on forms, Google Analytics / Meta Pixel

## Phase 6 – Deploy to Proxmox
- [ ] Production Dockerfiles (multi-stage), full `docker-compose.prod.yml`
- [ ] VM/LXC on Proxmox, Cloudflare Tunnel for the domain + SSL
- [ ] GitHub Actions: build + deploy
- [ ] Nightly DB + MinIO backup to Synology NAS

## Phase 7 – Residential module (future)
- [ ] Flats/villas in Doha: bedrooms, bathrooms, furnished, family/bachelor, etc.
