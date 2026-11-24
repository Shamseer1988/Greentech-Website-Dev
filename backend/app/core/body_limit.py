from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.security import decode_token

SMALL = 1024 * 1024
UPLOAD = 100 * 1024 * 1024


class BodyLimitMiddleware:
    """Refuse oversized requests before the body is read.

    FastAPI reads the whole upload before checking the login, so requests
    without a valid login only get the small limit.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            headers = dict(scope["headers"])
            if b"transfer-encoding" in headers:
                await self._refuse(411, "Content-Length is required", scope, receive, send)
                return
            length = headers.get(b"content-length", b"0")
            if not length.isdigit() or int(length) > self._limit(headers):
                await self._refuse(413, "Request is too large", scope, receive, send)
                return
        await self.app(scope, receive, send)

    @staticmethod
    def _limit(headers: dict[bytes, bytes]) -> int:
        scheme, _, token = headers.get(b"authorization", b"").decode("latin-1").partition(" ")
        return UPLOAD if scheme.lower() == "bearer" and decode_token(token) else SMALL

    @staticmethod
    async def _refuse(code: int, detail: str, scope: Scope, receive: Receive, send: Send) -> None:
        await JSONResponse({"detail": detail}, code)(scope, receive, send)
