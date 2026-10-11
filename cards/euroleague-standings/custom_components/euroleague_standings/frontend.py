"""Frontend support for EuroLeague Standings."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import lovelace
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN, FRONTEND_VERSION

_LOGGER = logging.getLogger(__name__)

STATIC_URL = f"/{DOMAIN}"
CARD_URL = f"{STATIC_URL}/euroleague-standings-card.js"
FRONTEND_DIR = Path(__file__).parent / "www"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Serve the bundled card and add it to Lovelace resources."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    if not domain_data.get("_frontend_static_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(FRONTEND_DIR),
                    cache_headers=False,
                )
            ]
        )
        domain_data["_frontend_static_registered"] = True

    await _async_register_lovelace_resource(hass)


async def _async_register_lovelace_resource(hass: HomeAssistant) -> None:
    """Register or migrate the dashboard resource in storage mode."""
    lovelace_data = hass.data.get(lovelace.LOVELACE_DATA)
    if lovelace_data is None:
        _LOGGER.warning("Lovelace is not available; card resource was not registered")
        return

    resources = lovelace_data.resources
    if not isinstance(resources, lovelace.resources.ResourceStorageCollection):
        _LOGGER.warning(
            "Lovelace resources are managed in YAML mode. Add %s manually as a module resource",
            CARD_URL,
        )
        return

    await resources.async_get_info()

    resource_url = f"{CARD_URL}?v={FRONTEND_VERSION}"
    bundled_path = CARD_URL.lower()
    legacy_markers = (
        "/hacsfiles/euroleague-standings-card/",
        "/local/community/euroleague-standings-card/",
    )

    for item in resources.async_items():
        item_url = str(item.get("url", ""))
        item_url_lower = item_url.lower()
        is_bundled = item_url_lower.split("?", 1)[0] == bundled_path
        is_legacy = (
            "euroleague-standings-card.js" in item_url_lower
            and any(marker in item_url_lower for marker in legacy_markers)
        )

        if not (is_bundled or is_legacy):
            continue

        if item_url != resource_url:
            await resources.async_update_item(
                item["id"],
                {"url": resource_url, "res_type": "module"},
            )
            _LOGGER.info("Updated EuroLeague Standings card resource to %s", resource_url)
        return

    await resources.async_create_item(
        {"res_type": "module", "url": resource_url}
    )
    _LOGGER.info("Added EuroLeague Standings card resource %s", resource_url)
