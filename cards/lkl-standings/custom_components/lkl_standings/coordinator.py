"""Data coordinator for LKL Standings."""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import LklApi, LklApiError
from .const import DEFAULT_UPDATE_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class LklStandingsCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Fetch and hold LKL standings."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=DEFAULT_UPDATE_INTERVAL,
            config_entry=entry,
        )
        self.api = LklApi(async_get_clientsession(hass))

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            data = await self.api.async_get_standings()
        except LklApiError as err:
            raise UpdateFailed(str(err)) from err

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        data["team_count"] = len(data.get("teams", []))
        return data
