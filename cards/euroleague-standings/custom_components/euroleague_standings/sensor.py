"""Sensor platform for EuroLeague Standings."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, NAME
from .coordinator import EuroLeagueStandingsCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the EuroLeague standings sensor."""
    coordinator: EuroLeagueStandingsCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([EuroLeagueStandingsSensor(coordinator)])


class EuroLeagueStandingsSensor(
    CoordinatorEntity[EuroLeagueStandingsCoordinator], SensorEntity
):
    """EuroLeague standings sensor."""

    _attr_name = NAME
    _attr_unique_id = "euroleague_standings"
    _attr_icon = "mdi:table-large"

    def __init__(self, coordinator: EuroLeagueStandingsCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, DOMAIN)},
            name=NAME,
            manufacturer="EuroLeague Basketball",
            model="Standings API",
        )

    @property
    def available(self) -> bool:
        """Keep the last known standings available when cached data exists."""
        return bool(self.coordinator.data)

    @property
    def native_value(self) -> int | None:
        """Use current round as the sensor state."""
        return self.coordinator.data.get("round") if self.coordinator.data else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return standings and cache status for Lovelace cards."""
        if not self.coordinator.data:
            return {}

        attributes = dict(self.coordinator.data)
        attributes.setdefault(
            "data_stale",
            not self.coordinator.last_update_success,
        )
        return attributes
