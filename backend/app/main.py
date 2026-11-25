from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin_office,
    admin_properties,
    admin_social,
    admin_types,
    articles,
    auth,
    enquiries,
    health,
    media,
    properties,
    reports,
    site,
    viewings,
)
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import settings

app = FastAPI(title="Greentech Real Estate Broker API", version="0.6.0")

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
    articles,
    reports,
    viewings,
):
    app.include_router(module.router, prefix="/api")
for module in (site, articles, reports, viewings):
    app.include_router(module.admin, prefix="/api")
