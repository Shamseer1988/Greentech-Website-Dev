"""Posts to a Facebook page and its linked Instagram account (Meta Graph API)."""

import logging
import time

import httpx

from app.core.config import settings
from app.models import SocialNetwork

logger = logging.getLogger(__name__)
TIMEOUT = 30
WAIT_STEPS = 10


class SocialError(Exception):
    """The message is shown to the admin."""


def networks() -> list[SocialNetwork]:
    if not settings.meta_access_token.get_secret_value():
        return []
    accounts = {
        SocialNetwork.FACEBOOK: settings.meta_page_id,
        SocialNetwork.INSTAGRAM: settings.meta_instagram_id,
    }
    return [network for network, account in accounts.items() if account]


def call(method: str, path: str, data: dict[str, str]) -> dict:
    url = f"https://graph.facebook.com/{settings.meta_graph_version}/{path}"
    headers = {"Authorization": f"Bearer {settings.meta_access_token.get_secret_value()}"}
    content = {"params": data} if method == "GET" else {"data": data}
    try:
        response = httpx.request(method, url, headers=headers, timeout=TIMEOUT, **content)
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise SocialError(
            "No clear answer from Facebook. Look at the account before trying again."
        ) from exc
    if response.is_error or "error" in result:
        message = (result.get("error") or {}).get("message") or f"error {response.status_code}"
        logger.error("Meta API refused %s: %s", path, message)
        raise SocialError(f"Facebook answered: {message}")
    return result


def post(network: SocialNetwork, image_url: str, text: str) -> str:
    """Publish a photo with text and return the post's id."""
    if network == SocialNetwork.FACEBOOK:
        page = settings.meta_page_id
        result = call("POST", f"{page}/photos", {"url": image_url, "caption": text})
        return str(result.get("post_id") or result["id"])

    account = settings.meta_instagram_id
    container = call("POST", f"{account}/media", {"image_url": image_url, "caption": text})["id"]
    for _ in range(WAIT_STEPS):
        state = call("GET", str(container), {"fields": "status_code"}).get("status_code")
        if state == "FINISHED":
            break
        if state in ("ERROR", "EXPIRED"):
            raise SocialError("Instagram could not use the photo.")
        time.sleep(2)
    else:
        raise SocialError("Instagram is slow. Nothing was posted; try again later.")
    return str(call("POST", f"{account}/media_publish", {"creation_id": str(container)})["id"])
