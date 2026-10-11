"""LKL turnyrinės lentelės konstantos."""

from datetime import timedelta

DOMAIN = "lkl_standings"
NAME = "LKL turnyrinė lentelė"
FRONTEND_VERSION = "1.0.5"
SOURCE_URL = "https://lkl.lt/turnyrine-lentele"
RESULTS_URL = "https://lkl.lt/rezultatai"
DEFAULT_UPDATE_INTERVAL = timedelta(minutes=30)
