import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)
URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_human(token: str) -> bool:
    """Ask Cloudflare if the visitor passed the check. Always true when it is not set up."""
    secret = settings.turnstile_secret.get_secret_value()
    if not secret:
        return True
    if not token:
        return False
    try:
        response = httpx.post(URL, data={"secret": secret, "response": token}, timeout=8)
        result = response.json()
    except (httpx.HTTPError, ValueError):
        # Do not lose a customer because Cloudflare is down. The visitor limit still applies.
        logger.exception("Turnstile is not reachable; enquiry accepted")
        return True
    if not result.get("success"):
        logger.warning("Turnstile refused: %s", result.get("error-codes"))
    return bool(result.get("success"))
