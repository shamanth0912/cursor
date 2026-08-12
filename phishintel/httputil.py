from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

import httpx

T = TypeVar("T")


def retry(
    fn: Callable[[], T],
    *,
    attempts: int = 3,
    retry_on: tuple[type[BaseException], ...] = (httpx.HTTPError,),
    retry_statuses: set[int] | None = None,
) -> T:
    retry_statuses = retry_statuses or {429, 502, 503, 504}
    last: BaseException | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except httpx.HTTPStatusError as exc:
            last = exc
            if exc.response.status_code not in retry_statuses or attempt == attempts - 1:
                raise
            time.sleep(_backoff(attempt, exc.response))
        except retry_on as exc:
            last = exc
            if attempt == attempts - 1:
                raise
            time.sleep(2**attempt)
    assert last is not None
    raise last


def _backoff(attempt: int, response: httpx.Response) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(float(retry_after), 30.0)
        except ValueError:
            pass
    return min(2**attempt, 16)
