"""Asinchroninis oficialių LKL duomenų nuskaitymas."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from datetime import datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin

from aiohttp import ClientError, ClientSession

from .const import RESULTS_URL, SOURCE_URL


class LklApiError(Exception):
    """Klaida gaunant arba apdorojant LKL duomenis."""


@dataclass
class _Cell:
    text_parts: list[str] = field(default_factory=list)
    image: str | None = None
    link: str | None = None

    @property
    def text(self) -> str:
        return " ".join(" ".join(self.text_parts).split())


class _TableParser(HTMLParser):
    """Minimalus HTML lentelių parseris be papildomų priklausomybių."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[_Cell]]] = []
        self._table_depth = 0
        self._table: list[list[_Cell]] | None = None
        self._row: list[_Cell] | None = None
        self._cell: _Cell | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = dict(attrs)
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._table = []
            return
        if self._table_depth != 1:
            return
        if tag == "tr":
            self._row = []
        elif tag in ("th", "td") and self._row is not None:
            self._cell = _Cell()
        elif tag == "img" and self._cell is not None:
            self._cell.image = (
                attrs_d.get("src")
                or attrs_d.get("data-src")
                or attrs_d.get("data-lazy-src")
            )
        elif tag == "a" and self._cell is not None:
            self._cell.link = attrs_d.get("href")
        elif tag == "br" and self._cell is not None:
            self._cell.text_parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag == "table":
            if self._table_depth == 1 and self._table is not None:
                self.tables.append(self._table)
                self._table = None
            self._table_depth = max(0, self._table_depth - 1)
            return
        if self._table_depth != 1:
            return
        if tag in ("th", "td") and self._cell is not None and self._row is not None:
            self._row.append(self._cell)
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if self._row:
                self._table.append(self._row)
            self._row = None

    def handle_data(self, data: str) -> None:
        if self._table_depth == 1 and self._cell is not None and data.strip():
            self._cell.text_parts.append(data)


@dataclass
class _Link:
    href: str
    text_parts: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(" ".join(self.text_parts).split())


class _LinksParser(HTMLParser):
    """Surinkti nuorodų tekstus iš LKL rezultatų puslapio."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[_Link] = []
        self._current: _Link | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self._current = _Link(href=dict(attrs).get("href") or "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._current is not None:
            if self._current.text:
                self.links.append(self._current)
            self._current = None

    def handle_data(self, data: str) -> None:
        if self._current is not None and data.strip():
            self._current.text_parts.append(data)


TEAM_CODES = {
    "gargždai": "GAR",
    "hipocredit": "HIP",
    "juventus": "JUV",
    "lietkabelis": "LIE",
    "neptūnas": "NEP",
    "nevėžis-paskolų klubas": "NEV",
    "nevėžis": "NEV",
    "rytas": "RYT",
    "šiauliai": "SIA",
    "tauragė": "TAU",
    "žalgiris": "ZAL",
}

RESULT_CODE_ALIASES = {
    "ŽAL": "ZAL",
    "ŠIA": "SIA",
    "JON": "HIP",  # Hipocredit / Jonava rezultatų puslapyje
}


def _norm(value: str) -> str:
    return re.sub(r"[^a-ząčęėįšųūž0-9%]+", "", value.lower())


def _as_int(value: str, fallback: int = 0) -> int:
    match = re.search(r"-?\d+", value.replace("\xa0", " "))
    return int(match.group(0)) if match else fallback


def _as_float(value: str) -> float | None:
    match = re.search(r"-?\d+(?:[.,]\d+)?", value.replace("\xa0", " "))
    return float(match.group(0).replace(",", ".")) if match else None


def _team_code(name: str) -> str:
    key = name.strip().lower()
    if key in TEAM_CODES:
        return TEAM_CODES[key]
    letters = re.sub(r"[^A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]", "", name).upper()
    return letters[:3] or "LKL"


def _result_code(value: str) -> str:
    code = value.strip().upper()
    return RESULT_CODE_ALIASES.get(code, code)


def _current_season_label() -> str:
    now = datetime.now()
    start = now.year if now.month >= 7 else now.year - 1
    return f"{start}/{str(start + 1)[-2:]}"


def parse_standings_html(html: str) -> dict[str, Any]:
    """Apdoroti pagrindinę LKL turnyrinės lentelės skiltį „Bendra“."""
    parser = _TableParser()
    parser.feed(html)

    target: list[list[_Cell]] | None = None
    header_index = -1
    indexes: dict[str, int] = {}

    for table in parser.tables:
        for idx, row in enumerate(table[:4]):
            headers = [_norm(cell.text) for cell in row]
            if not headers:
                continue
            if (
                any(h.startswith("poz") for h in headers)
                and any(h.startswith("komanda") for h in headers)
                and any(h.startswith("rng") for h in headers)
                and any(h.startswith("per") for h in headers)
                and any(h.startswith("pr") for h in headers)
            ):
                target = table
                header_index = idx
                for col, h in enumerate(headers):
                    if h.startswith("poz"):
                        indexes["position"] = col
                    elif h.startswith("komanda"):
                        indexes["team"] = col
                    elif h.startswith("rng"):
                        indexes["played"] = col
                    elif h.startswith("per"):
                        indexes["wins"] = col
                    elif h.startswith("pr"):
                        indexes["losses"] = col
                    elif "laim" in h or "%" in h:
                        indexes["pct"] = col
                    elif h.startswith("tšk") or h.startswith("tsk"):
                        indexes["points_avg"] = col
                break
        if target is not None:
            break

    if target is None:
        raise LklApiError("LKL turnyrinė lentelė puslapyje nerasta")

    required = ("position", "team", "played", "wins", "losses")
    if any(key not in indexes for key in required):
        raise LklApiError("Pasikeitė LKL turnyrinės lentelės formatas")

    teams: list[dict[str, Any]] = []
    for row in target[header_index + 1 :]:
        if len(row) <= max(indexes.values()):
            continue
        pos = _as_int(row[indexes["position"]].text, 0)
        team_cell = row[indexes["team"]]
        name = team_cell.text.strip()
        if pos <= 0 or not name:
            continue

        played = _as_int(row[indexes["played"]].text)
        wins = _as_int(row[indexes["wins"]].text)
        losses = _as_int(row[indexes["losses"]].text)
        pct = _as_float(row[indexes["pct"]].text) if "pct" in indexes else None
        if pct is None and played > 0:
            pct = round(wins / played * 100, 1)

        points_for_avg = None
        points_against_avg = None
        if "points_avg" in indexes:
            nums = re.findall(r"-?\d+(?:[.,]\d+)?", row[indexes["points_avg"]].text)
            if nums:
                points_for_avg = float(nums[0].replace(",", "."))
            if len(nums) > 1:
                points_against_avg = float(nums[1].replace(",", "."))

        logo = team_cell.image or ""
        if logo:
            logo = urljoin(SOURCE_URL, logo)
        team_url = team_cell.link or ""
        if team_url:
            team_url = urljoin(SOURCE_URL, team_url)

        teams.append(
            {
                "position": pos,
                "code": _team_code(name),
                "name": name,
                "logo": logo,
                "team_url": team_url,
                "games_played": played,
                "wins": wins,
                "losses": losses,
                "win_percentage": pct,
                "points_for_avg": points_for_avg,
                "points_against_avg": points_against_avg,
                "points_for": None,
                "points_against": None,
                "points_diff": None,
            }
        )

    teams.sort(key=lambda item: item["position"])
    if not teams:
        raise LklApiError("LKL turnyrinėje lentelėje nėra komandų")

    return {"season": _current_season_label(), "teams": teams}


def parse_results_html(html: str) -> list[dict[str, Any]]:
    """Iš rezultatų puslapio ištraukti komandų kodus ir galutinius rezultatus."""
    parser = _LinksParser()
    parser.feed(html)
    matches: list[dict[str, Any]] = []

    for index, link in enumerate(parser.links):
        score_match = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", link.text)
        if not score_match or index == 0 or index + 1 >= len(parser.links):
            continue

        home_raw = parser.links[index - 1].text.strip().upper()
        away_raw = parser.links[index + 1].text.strip().upper()
        if not re.fullmatch(r"[A-ZĄČĘĖĮŠŲŪŽ]{2,4}", home_raw):
            continue
        if not re.fullmatch(r"[A-ZĄČĘĖĮŠŲŪŽ]{2,4}", away_raw):
            continue

        home = _result_code(home_raw)
        away = _result_code(away_raw)
        home_score = int(score_match.group(1))
        away_score = int(score_match.group(2))
        match_id = link.href or f"{index}:{home}:{home_score}:{away_score}:{away}"
        matches.append(
            {
                "id": match_id,
                "home": home,
                "away": away,
                "home_score": home_score,
                "away_score": away_score,
            }
        )

    return matches


class LklApi:
    """Oficialios LKL svetainės klientas."""

    def __init__(self, session: ClientSession) -> None:
        self._session = session

    async def _get_text(self, url: str) -> str:
        try:
            async with asyncio.timeout(20):
                response = await self._session.get(
                    url,
                    headers={
                        "Accept": "text/html,application/xhtml+xml",
                        "User-Agent": "HomeAssistant-LKL-Standings/1.0",
                    },
                )
                async with response:
                    if response.status >= 400:
                        body = (await response.text())[:200]
                        raise LklApiError(
                            f"LKL svetainė grąžino HTTP {response.status}: {body}"
                        )
                    return await response.text()
        except (TimeoutError, ClientError) as err:
            raise LklApiError(f"Nepavyko prisijungti prie LKL svetainės: {err}") from err

    async def _load_exact_points(self, data: dict[str, Any]) -> None:
        teams = data["teams"]
        expected_games = sum(int(team.get("games_played", 0)) for team in teams) // 2
        if expected_games <= 0:
            for team in teams:
                team["points_for"] = 0
                team["points_against"] = 0
                team["points_diff"] = 0
            return

        valid_codes = {str(team["code"]) for team in teams}
        totals = {
            code: {"for": 0, "against": 0}
            for code in valid_codes
        }
        seen: set[str] = set()

        for page in range(1, 21):
            separator = "&" if "?" in RESULTS_URL else "?"
            html = await self._get_text(f"{RESULTS_URL}{separator}page={page}")
            page_matches = parse_results_html(html)
            new_on_page = 0

            for match in page_matches:
                match_id = str(match["id"])
                if match_id in seen:
                    continue
                home = str(match["home"])
                away = str(match["away"])
                if home not in valid_codes or away not in valid_codes:
                    continue

                seen.add(match_id)
                new_on_page += 1
                home_score = int(match["home_score"])
                away_score = int(match["away_score"])
                totals[home]["for"] += home_score
                totals[home]["against"] += away_score
                totals[away]["for"] += away_score
                totals[away]["against"] += home_score

                if len(seen) >= expected_games:
                    break

            if len(seen) >= expected_games:
                break
            if not page_matches or new_on_page == 0:
                break

        # Tikslų skirtumą skelbiame tik tada, kai suradome visas lentelėje
        # įskaitytas rungtynes. Taip išvengiame klaidinančių dalinių sumų.
        if len(seen) < expected_games:
            return

        for team in teams:
            code = str(team["code"])
            points_for = totals[code]["for"]
            points_against = totals[code]["against"]
            team["points_for"] = points_for
            team["points_against"] = points_against
            team["points_diff"] = points_for - points_against

    async def async_get_standings(self) -> dict[str, Any]:
        html = await self._get_text(SOURCE_URL)
        data = parse_standings_html(html)

        try:
            await self._load_exact_points(data)
        except LklApiError:
            # Turnyrinė lentelė turi veikti ir laikinai nepasiekiant rezultatų puslapio.
            pass

        return data
