"""Sensor platform for LKL Standings."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, NAME
from .coordinator import LklStandingsCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the LKL standings sensor."""
    coordinator: LklStandingsCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([LklStandingsSensor(coordinator)])


class LklStandingsSensor(CoordinatorEntity[LklStandingsCoordinator], SensorEntity):
    """LKL standings sensor."""

    _attr_name = NAME
    _attr_unique_id = "lkl_standings"
    _attr_icon = "mdi:table-large"

    def __init__(self, coordinator: LklStandingsCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, DOMAIN)},
            name=NAME,
            manufacturer="Lietuvos krepšinio lyga",
            model="LKL.lt standings",
        )

    @property
    def native_value(self) -> int:
        """Use team count as sensor state."""
        return int(self.coordinator.data.get("team_count", 0))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return standings for the Lovelace card."""
        return dict(self.coordinator.data)
