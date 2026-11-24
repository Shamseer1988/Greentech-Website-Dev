from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import enquiries, health, media, properties
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import settings

app = FastAPI(title="Greentech Real Estate Broker API", version="0.2.0")

app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, properties, enquiries, media):
    app.include_router(module.router, prefix="/api")
