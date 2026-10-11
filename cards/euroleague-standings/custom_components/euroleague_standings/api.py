"""Small async client for the public EuroLeague API."""

from __future__ import annotations

import asyncio
from typing import Any

from aiohttp import ClientError, ClientSession

from .const import API_V2, API_V3


class EuroLeagueApiError(Exception):
    """Raised when EuroLeague data cannot be loaded."""

    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        url: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.url = url


class EuroLeagueApi:
    """EuroLeague API client."""

    def __init__(self, session: ClientSession) -> None:
        self._session = session

    async def async_get_rounds(self, season: int) -> list[dict[str, Any]]:
        data = await self._async_get_json(f"{API_V2}/seasons/E{season}/rounds")
        return _extract_rows(data, "rounds")

    async def async_get_standings(
        self, season: int, round_number: int
    ) -> list[dict[str, Any]]:
        data = await self._async_get_json(
            f"{API_V3}/seasons/E{season}/rounds/{round_number}/basicstandings"
        )
        return _extract_rows(data, "standings")

    async def async_get_clubs(self, season: int) -> list[dict[str, Any]]:
        data = await self._async_get_json(f"{API_V2}/seasons/E{season}/clubs")
        return _extract_rows(data, "clubs")

    async def async_get_games(self, season: int) -> list[dict[str, Any]]:
        """Return season games used to calculate points for/against."""
        data = await self._async_get_json(
            f"{API_V2}/seasons/E{season}/games",
            params={"limit": 1000},
        )
        return _extract_rows(data, "games")

    async def _async_get_json(
        self, url: str, params: dict[str, Any] | None = None
    ) -> Any:
        try:
            async with asyncio.timeout(20):
                response = await self._session.get(
                    url,
                    params=params,
                    headers={"Accept": "application/json"},
                )
                async with response:
                    if response.status >= 400:
                        body = (await response.text())[:200]
                        raise EuroLeagueApiError(
                            f"EuroLeague API request to {url} returned HTTP "
                            f"{response.status}: {body}",
                            status=response.status,
                            url=url,
                        )
                    return await response.json(content_type=None)
        except EuroLeagueApiError:
            raise
        except (TimeoutError, ClientError, ValueError) as err:
            raise EuroLeagueApiError(
                f"EuroLeague API request to {url} failed: {err}",
                url=url,
            ) from err


def _extract_rows(data: Any, source: str) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]

    if not isinstance(data, dict):
        raise EuroLeagueApiError(
            f"EuroLeague {source} response returned an unexpected payload"
        )

    for key in ("data", "Data", "rows", "Rows", "teams"):
        rows = data.get(key)
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]

    raise EuroLeagueApiError(
        f"EuroLeague {source} response did not contain a list"
    )
