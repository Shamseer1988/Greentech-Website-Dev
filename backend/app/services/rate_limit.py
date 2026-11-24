import math
import threading
import time
from collections import deque


class RateLimiter:
    """Sliding window kept in memory, so it counts per backend process.

    Run a single backend worker, or move this to Redis before adding more.
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._next_cleanup = 0.0

    def check(self, key: str) -> int:
        """Count one request. Returns 0 if allowed, else seconds to wait."""
        now = time.monotonic()
        with self._lock:
            if now >= self._next_cleanup:
                self._hits = {k: h for k, h in self._hits.items() if h[-1] > now - self.window}
                self._next_cleanup = now + self.window
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(1, math.ceil(hits[0] + self.window - now))
            hits.append(now)
            return 0
