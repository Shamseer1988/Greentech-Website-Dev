# Greentech Real Estate Broker – Website

Public website and admin panel. Plan: [docs/PHASES.md](docs/PHASES.md).

## Requirements
Git, Node.js 20+, Python 3.12, Docker Desktop (running).

## First-time setup (PowerShell, from the project folder)
```powershell
Copy-Item .env.example .env        # only if .env does not exist; then change the passwords and set JWT_SECRET
docker compose up -d --wait db minio

cd backend
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

.venv\Scripts\alembic upgrade head          # create tables
.venv\Scripts\python -m app.scripts.seed    # sample data

cd ..\frontend
npm.cmd ci
```

## Run every day
Start Docker Desktop, then:

```powershell
# Terminal 1 - database + file storage, then the API
docker compose up -d --wait db minio
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload

# Terminal 2 - website
cd frontend
npm.cmd run dev
```

| What | URL |
|---|---|
| Website | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| API health | http://localhost:8000/api/health |
| MinIO console | http://localhost:9001 (login is in `.env`) |

## Company details
Phone, WhatsApp, office and social links: copy `frontend/.env.example` to `frontend/.env.local`, fill it in, then restart the website.
Texts are in `frontend/messages/en.json` and `ar.json`.

## Backend tests
```powershell
cd backend
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest    # uses its own greentech_test database
```

## Admin panel
http://localhost:3000/admin

Create the first admin, or reset a forgotten admin password (asks for email, name and password):
```powershell
cd backend
.venv\Scripts\python -m app.scripts.create_admin
```
Add other users in the panel under **Users & roles**.

After pulling new code, also run `.venv\Scripts\python -m pip install -r requirements.txt`,
`.venv\Scripts\alembic upgrade head`, and `npm.cmd ci` in `frontend`.

## Stopping
Stop: `Ctrl+C` in both terminals, then `docker compose stop`.
Do not run `docker compose down -v`: it deletes the local database and photos.

Postgres stores its password on first start. If you change it in `.env` later, change it in the database too.
