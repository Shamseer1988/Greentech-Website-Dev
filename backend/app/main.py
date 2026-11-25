from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin_office,
    admin_properties,
    admin_social,
    admin_types,
    auth,
    enquiries,
    health,
    media,
    properties,
    site,
)
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import settings

app = FastAPI(title="Greentech Real Estate Broker API", version="0.5.0")

app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (
    health,
    properties,
    enquiries,
    auth,
    admin_properties,
    media,
    admin_office,
    admin_social,
    admin_types,
    site,
):
    app.include_router(module.router, prefix="/api")
app.include_router(site.admin, prefix="/api")
