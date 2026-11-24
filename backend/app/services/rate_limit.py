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
                self._hits = {
                    k: h for k, h in self._hits.items() if h and h[-1] > now - self.window
                }
                self._next_cleanup = now + self.window
            wait = self._wait(key, now)
            if not wait:
                self._hits.setdefault(key, deque()).append(now)
            return wait

    def waiting(self, key: str) -> int:
        """Seconds to wait, without counting this request."""
        with self._lock:
            return self._wait(key, time.monotonic())

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()

    def _wait(self, key: str, now: float) -> int:
        hits = self._hits.get(key)
        if not hits:
            return 0
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if len(hits) < self.limit:
            return 0
        return max(1, math.ceil(hits[0] + self.window - now))
