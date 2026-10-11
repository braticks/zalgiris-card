"""Constants for EuroLeague Standings."""

from datetime import timedelta

DOMAIN = "euroleague_standings"
NAME = "EuroLeague Standings"
FRONTEND_VERSION = "1.3.0"

API_V2 = "https://api-live.euroleague.net/v2/competitions/E"
API_V3 = "https://api-live.euroleague.net/v3/competitions/E"

DEFAULT_UPDATE_INTERVAL = timedelta(minutes=30)
