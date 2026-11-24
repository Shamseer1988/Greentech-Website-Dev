from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import Enquiry
from app.schemas.enquiry import EnquiryIn, EnquiryOut
from app.services import properties
from app.services.rate_limit import RateLimiter

router = APIRouter(tags=["public"])
limiter = RateLimiter(settings.enquiry_limit, settings.enquiry_window_seconds)


def rate_limit(request: Request) -> None:
    # Phase 6: behind Cloudflare the real visitor IP must come from a trusted proxy header.
    wait = limiter.check(request.client.host if request.client else "unknown")
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many enquiries. Please try again later or contact us on WhatsApp.",
            headers={"Retry-After": str(wait)},
        )


@router.post("/enquiries", status_code=status.HTTP_201_CREATED)
def create_enquiry(
    data: EnquiryIn, request: Request, db: Annotated[Session, Depends(get_db)]
) -> EnquiryOut:
    # Called here, not as a dependency, so a typing mistake in the form is not counted.
    rate_limit(request)
    property_id = None
    if data.property_code:
        prop = (
            properties.get_public(db, data.property_code)
            if "\x00" not in data.property_code
            else None
        )
        if prop is None:
            raise HTTPException(404, "Property not found")
        property_id = prop.id
    enquiry = Enquiry(**data.model_dump(exclude={"property_code"}), property_id=property_id)
    db.add(enquiry)
    db.commit()
    return EnquiryOut(reference=enquiry.id)
