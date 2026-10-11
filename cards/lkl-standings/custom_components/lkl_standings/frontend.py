"""Frontend support for LKL Standings."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import lovelace
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later

from .const import DOMAIN, FRONTEND_VERSION

_LOGGER = logging.getLogger(__name__)
STATIC_URL = f"/{DOMAIN}"
CARD_URL = f"{STATIC_URL}/lkl-standings-card.js"
FRONTEND_DIR = Path(__file__).parent / "www"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Serve the bundled card and add it to Lovelace resources."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    if not domain_data.get("_frontend_static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
        )
        domain_data["_frontend_static_registered"] = True

    if not await _async_register_lovelace_resource(hass):
        _schedule_resource_retry(hass)


def _schedule_resource_retry(hass: HomeAssistant) -> None:
    """Retry resource registration after Home Assistant/Lovelace finishes starting."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get("_frontend_resource_retry_scheduled"):
        return

    domain_data["_frontend_resource_retry_scheduled"] = True

    async def _retry(_now) -> None:
        domain_data["_frontend_resource_retry_scheduled"] = False
        if not await _async_register_lovelace_resource(hass):
            _LOGGER.warning(
                "Lovelace is still unavailable; add %s manually as a module resource",
                CARD_URL,
            )

    async_call_later(hass, 10, _retry)


async def _async_register_lovelace_resource(hass: HomeAssistant) -> bool:
    """Register dashboard resource in Lovelace storage mode."""
    lovelace_data = hass.data.get(lovelace.LOVELACE_DATA)
    if lovelace_data is None:
        _LOGGER.debug("Lovelace is not ready yet; card resource registration will retry")
        return False

    resources = lovelace_data.resources
    if not isinstance(resources, lovelace.resources.ResourceStorageCollection):
        _LOGGER.warning(
            "Lovelace resources are managed in YAML mode. Add %s manually as a module resource",
            CARD_URL,
        )
        return True

    await resources.async_get_info()
    resource_url = f"{CARD_URL}?v={FRONTEND_VERSION}"
    bundled_path = CARD_URL.lower()

    for item in resources.async_items():
        item_url = str(item.get("url", ""))
        if item_url.lower().split("?", 1)[0] != bundled_path:
            continue
        if item_url != resource_url:
            await resources.async_update_item(
                item["id"], {"url": resource_url, "res_type": "module"}
            )
            _LOGGER.info("Updated LKL Standings card resource to %s", resource_url)
        return True

    await resources.async_create_item({"res_type": "module", "url": resource_url})
    _LOGGER.info("Added LKL Standings card resource %s", resource_url)
    return True
