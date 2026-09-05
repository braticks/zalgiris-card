/**
 * zalgiris-card v2.0.1
 * Veikia tik su sensor.zalgiris_rungtyniu_sarasas
 *
 * Konfigūracija:
 *   type: custom:zalgiris-card
 *   entity: sensor.zalgiris_rungtyniu_sarasas
 *   count: 5
 *   show_league: true
 */

const CARD_VERSION = "2.0.2";
const ZALGIRIS_RE = /žalgiris|zalgiris/i;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
  } catch (_err) {
    return "";
  }
}

function safeGame(game = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(game)) {
    safe[key] = typeof value === "string" ? escapeHtml(value) : value;
  }
  safe.home_logo = safeUrl(game.home_logo);
  safe.away_logo = safeUrl(game.away_logo);
  safe.info_url = safeUrl(game.info_url);
  return safe;
}

// ─── Datos / laiko pagalbiniai ───

function sameDay(a, b) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

function relDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const tom = new Date(); tom.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return "Šiandien";
  if (sameDay(d, tom))   return "Rytoj";
  return d.toLocaleDateString("lt", { weekday: "long", month: "long", day: "numeric" });
}

function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const tom = new Date(); tom.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return "Šiandien";
  if (sameDay(d, tom))   return "Rytoj";
  return d.toLocaleDateString("lt", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("lt", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function kickoffIn(iso) {
  if (!iso) return "";
  const diff = (new Date(iso) - new Date()) / 1000;
  if (diff < 0)     return "vyksta";
  if (diff < 3600)  return `po ${Math.ceil(diff / 60)} min.`;
  if (diff < 86400) return `po ${Math.floor(diff / 3600)} val.`;
  return `po ${Math.floor(diff / 86400)} d.`;
}

function leagueColor(league) {
  if (!league) return { bg: "#44444425", text: "#888" };
  const l = league.toLowerCase();
  if (l.includes("eurolyga") || l.includes("euroleague")) return { bg: "#1a3a6b30", text: "#2a5aaa" };
  if (l.includes("lkl"))    return { bg: "#00642f30", text: "#00642f" };
  if (l.includes("kmt") || l.includes("mindaugo")) return { bg: "#8B000030", text: "#8B0000" };
  return { bg: "#44444425", text: "#777" };
}

// ─── Žaidimo būsenos nustatymas ───

function gameState(g) {
  if (g.is_live === true) return "IN";
  if (g.status === "finished") return "POST";
  const now = Date.now();
  const start = g.start ? new Date(g.start).getTime() : null;
  if (!start) return "PRE";
  if (start > now) return "PRE";
  // Baigtas: praėjo >3 val. arba yra rezultatas
  if (start < now - 3 * 3600 * 1000) return "POST";
  return "IN"; // prasidėjo, bet nėra rezultato – laikome live
}

// ─── CSS ───

const STYLES = `
  :host { display: block; }

  ha-card {
    padding: 14px 16px 12px;
    font-family: var(--primary-font-family);
    overflow: hidden;
    position: relative;
    border-radius: var(--ha-card-border-radius, 10px);
  }

  .bg-logo { position: absolute; opacity: 0.07; width: 55%; top: -10%; z-index: 0; pointer-events: none; }
  .bg-logo.left  { left: -15%; }
  .bg-logo.right { right: -15%; }

  .card-title {
    text-align: center; font-size: 0.95em; font-weight: 500;
    opacity: 0.65; margin-bottom: 10px; position: relative; z-index: 1;
  }

  .live-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: #c0392b; color: #fff; border-radius: 20px;
    font-size: 0.7em; font-weight: 700; padding: 2px 9px;
    margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;
    position: relative; z-index: 1;
    animation: livepulse 1.5s infinite;
  }
  .live-badge::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: #fff; display: inline-block;
  }
  @keyframes livepulse { 0%,100% { opacity: 1; } 50% { opacity: 0.75; } }

  .center-top {
    display: flex; flex-direction: column; align-items: center;
    position: relative; z-index: 1; margin-bottom: 4px;
  }

  .teams-row {
    display: flex; justify-content: space-between; align-items: center;
    position: relative; z-index: 1;
  }
  .team {
    display: flex; flex-direction: column; align-items: center;
    width: 36%; text-align: center; text-decoration: none; color: inherit;
  }
  .team img.main-logo { max-height: 80px; max-width: 80px; object-fit: contain; }
  .team-name  { font-size: 1em; margin-top: 6px; line-height: 1.2; }

  .game-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; width: 28%; position: relative; z-index: 1;
  }
  .game-weekday  { font-size: 1.4em; font-weight: 600; text-align: center; line-height: 1.1; }
  .game-dateextra { font-size: 1em; opacity: 0.65; margin-top: 2px; }
  .game-time     { font-size: 2em; font-weight: 700; line-height: 1; margin-top: 6px; }
  .game-kickoff  { font-size: 0.8em; opacity: 0.55; margin-top: 4px; }

  .score { font-size: 2.8em; font-weight: 700; text-align: center; line-height: 1; margin-top: 4px; }
  .live-period { font-size: 1.1em; font-weight: 600; text-align: center; opacity: 0.8; }

  .post-result { font-size: 1em; opacity: 0.65; text-align: center; }
  .post-won { font-size: 0.95em; margin-top: 6px; text-align: center; }

  .divider { height: 1px; background: var(--divider-color, rgba(128,128,128,0.25)); margin: 12px 0; position: relative; z-index: 1; }

  .info-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.9em; margin: 3px 0; position: relative; z-index: 1;
  }
  .info-muted { opacity: 0.65; }

  .schedule-title {
    font-size: 0.85em; font-weight: 500; opacity: 0.55;
    text-transform: uppercase; letter-spacing: 0.06em;
    margin: 4px 0 8px; position: relative; z-index: 1;
  }

  .game-row {
    display: flex; align-items: center; padding: 7px 0;
    border-bottom: 1px solid var(--divider-color, rgba(128,128,128,0.15));
    gap: 10px; text-decoration: none; color: inherit;
    position: relative; z-index: 1;
  }
  .game-row:last-child { border-bottom: none; }

  .logos { display: flex; align-items: center; gap: 2px; width: 70px; justify-content: center; flex-shrink: 0; }
  .s-logo { width: 26px; height: 26px; object-fit: contain; border-radius: 50%; background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, rgba(0,0,0,0.08)); padding: 2px; }
  .s-placeholder { width: 26px; height: 26px; border-radius: 50%; background: var(--secondary-background-color, #f0f0f0); border: 1px solid var(--divider-color, rgba(0,0,0,0.08)); display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 600; opacity: 0.55; flex-shrink: 0; }
  .vs-sep { font-size: 8px; opacity: 0.3; flex-shrink: 0; }

  .s-info { flex: 1; min-width: 0; }
  .s-teams { font-size: 1em; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
  .s-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
  .s-badge { font-size: 10px; font-weight: 500; padding: 1px 6px; border-radius: 3px; flex-shrink: 0; }
  .s-tv { font-size: 11px; opacity: 0.85; font-weight: 600; }

  .s-time { text-align: right; flex-shrink: 0; }
  .s-time-val { font-size: 1.2em; font-weight: 700; line-height: 1; }
  .s-date-val { font-size: 0.82em; opacity: 0.55; margin-top: 2px; }

  .s-score { font-size: 0.95em; font-weight: 700; white-space: nowrap; flex-shrink: 0; text-align: right; }

  .empty { text-align: center; padding: 14px 0; opacity: 0.45; font-size: 0.9em; }
`;

// ─── Pagalbiniai HTML ───

function bgLogos(l1, l2) {
  return `
    ${l1 ? `<img class="bg-logo left"  src="${l1}">` : ""}
    ${l2 ? `<img class="bg-logo right" src="${l2}">` : ""}`;
}

function mainLogo(src, name) {
  if (src) return `<img class="main-logo" src="${src}" alt="${name || ""}" onerror="this.style.opacity='0.15'">`;
  return `<div style="width:70px;height:70px;opacity:0.15;display:flex;align-items:center;justify-content:center;font-size:1.2em">${name?.[0] || "?"}</div>`;
}

function sLogoEl(src, abbr) {
  if (src) return `<img class="s-logo" src="${src}" alt="${abbr || ""}" onerror="this.style.opacity='0.15'">`;
  return `<div class="s-placeholder">${(abbr || "?").substring(0, 3)}</div>`;
}

// ─── Kortos klasė ───

class ZalgirisCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config.entity) throw new Error("entity yra privalomas");
    this._config = {
      ...config,
      count: Math.max(1, Math.min(20, Number.parseInt(config.count ?? 5, 10) || 5)),
      show_league: config.show_league !== false,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 7; }

  // Nustatome pusę: home visada kairėje
  _sides(g) {
    const home = { name: g.home || "?", logo: g.home_logo || "" };
    const away = { name: g.away || "?", logo: g.away_logo || "" };
    // Žalgiris namie → Žalgiris kairėje, priešininkas dešinėje
    // Žalgiris svečiuose → priešininkas (namų) kairėje
    const zalHome = ZALGIRIS_RE.test(g.home || "");
    if (zalHome) {
      return {
        left:  { ...home, score: g.score_home },
        right: { ...away, score: g.score_away },
        zalLeft: true,
      };
    } else {
      return {
        left:  { ...home, score: g.score_home },
        right: { ...away, score: g.score_away },
        zalLeft: false,
      };
    }
  }

  _buildPRE(g) {
    const { left, right } = this._sides(g);
    const cfg = this._config;
    const weekday = relDay(g.start);
    const d = g.start ? new Date(g.start) : null;
    const today = new Date();
    const tom = new Date(); tom.setDate(today.getDate() + 1);
    const dateExtra = d && !sameDay(d, today) && !sameDay(d, tom)
      ? d.toLocaleDateString("lt", { month: "short", day: "2-digit" }) : "";
    const time = g.start ? fmtTime(g.start) : "";
    const kof = g.start ? kickoffIn(g.start) : "";
    const title = cfg.show_league && g.league ? `<div class="card-title">${g.league}</div>` : "";

    return `
      ${bgLogos(left.logo, right.logo)}
      ${title}
      <div class="teams-row">
        <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
          ${mainLogo(left.logo, left.name)}
          <div class="team-name">${left.name}</div>
        </a>
        <div class="game-center">
          <div class="game-weekday">${weekday}</div>
          ${dateExtra ? `<div class="game-dateextra">${dateExtra}</div>` : ""}
          <div class="game-time">${time}</div>
          ${kof ? `<div class="game-kickoff">${kof}</div>` : ""}
        </div>
        <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
          ${mainLogo(right.logo, right.name)}
          <div class="team-name">${right.name}</div>
        </a>
      </div>
      ${g.tv ? `<div class="info-row" style="justify-content:center;margin-top:8px;position:relative;z-index:1"><span class="info-muted">📺 ${g.tv}</span></div>` : ""}`;
  }

  _buildIN(g) {
    const { left, right } = this._sides(g);
    const cfg = this._config;
    const period = [g.live_period, g.live_clock].filter(Boolean).join(" · ") || "Laukiama duomenų";
    const title = cfg.show_league && g.league ? `<div class="card-title">${g.league}</div>` : "";

    return `
      ${bgLogos(left.logo, right.logo)}
      <div class="center-top">
        <div class="live-badge">${g.is_live === true ? "Live" : "Prasidėjo pagal tvarkaraštį"}</div>
      </div>
      ${title}
      <div class="teams-row">
        <div style="display:flex;flex-direction:column;align-items:center;width:36%">
          <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
            ${mainLogo(left.logo, left.name)}
            <div class="team-name">${left.name}</div>
          </a>
          <div class="score">${left.score ?? "-"}</div>
        </div>
        <div class="game-center">
          <div class="live-period">${period}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;width:36%">
          <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
            ${mainLogo(right.logo, right.name)}
            <div class="team-name">${right.name}</div>
          </a>
          <div class="score">${right.score ?? "-"}</div>
        </div>
      </div>
      ${g.tv ? `<div class="info-row" style="justify-content:center;margin-top:8px;position:relative;z-index:1"><span class="info-muted">📺 ${g.tv}</span></div>` : ""}`;
  }

  _buildPOST(g) {
    const { left, right, zalLeft } = this._sides(g);
    const cfg = this._config;
    const lScore = left.score ?? "-";
    const rScore = right.score ?? "-";
    // Žalgiris laimėjo?
    let won = "";
    if (left.score != null && right.score != null) {
      const zalScore = zalLeft ? left.score : right.score;
      const oppScore = zalLeft ? right.score : left.score;
      if (zalScore > oppScore) won = "✓ Laimėjo";
      else if (zalScore < oppScore) won = "✗ Pralaimėjo";
    }
    const title = cfg.show_league && g.league ? `<div class="card-title">${g.league}</div>` : "";

    return `
      ${bgLogos(left.logo, right.logo)}
      ${title}
      <div class="teams-row">
        <div style="display:flex;flex-direction:column;align-items:center;width:36%">
          <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
            ${mainLogo(left.logo, left.name)}
            <div class="team-name">${left.name}</div>
          </a>
          <div class="score">${lScore}</div>
        </div>
        <div class="game-center">
          <div class="post-result">${g.status === "finished" ? "Baigta" : "Praėjusios rungtynės"}</div>
          ${won ? `<div class="post-won">${won}</div>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;width:36%">
          <a class="team" ${g.info_url ? `href="${g.info_url}" target="_blank" rel="noopener noreferrer"` : ""}>
            ${mainLogo(right.logo, right.name)}
            <div class="team-name">${right.name}</div>
          </a>
          <div class="score">${rScore}</div>
        </div>
      </div>`;
  }

  _buildSchedule(games) {
    const count = this._config.count || 5;
    const list = games.slice(0, count);
    if (list.length === 0) return `<div class="empty">Artėjančių rungtynių nerasta</div>`;

    let html = `<div class="schedule-title">Artėjančios rungtynės</div>`;

    for (const g of list) {
      const homeLogo = g.home_logo || "";
      const awayLogo = g.away_logo || "";
      const homeAbbr = (g.home || "?").split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
      const awayAbbr = (g.away || "?").split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
      const badge = leagueColor(g.league);
      const url = g.info_url || "";
      const tv = g.tv || "";
      const state = gameState(g);

      // Rezultatai jei live arba baigta
      let scoreEl = "";
      if (state === "IN") {
        scoreEl = `<div class="s-score" style="color:#c0392b">${g.score_home ?? "-"} : ${g.score_away ?? "-"}</div>`;
      } else if (state === "POST" && g.score_home != null) {
        scoreEl = `<div class="s-score">${g.score_home} : ${g.score_away}</div>`;
      }

      html += `
        <a class="game-row" ${url ? `href="${url}" target="_blank" rel="noopener noreferrer"` : ""}>
          <div class="logos">
            ${sLogoEl(homeLogo, homeAbbr)}
            <span class="vs-sep">—</span>
            ${sLogoEl(awayLogo, awayAbbr)}
          </div>
          <div class="s-info">
            <div class="s-teams">${g.home || "?"} — ${g.away || "?"}</div>
            <div class="s-meta">
              ${g.league ? `<span class="s-badge" style="background:${badge.bg};color:${badge.text}">${g.league}</span>` : ""}
              ${tv ? `<span class="s-tv">📺 ${tv}</span>` : ""}
            </div>
          </div>
          ${scoreEl || `<div class="s-time">
            <div class="s-time-val">${fmtTime(g.start)}</div>
            <div class="s-date-val">${fmtDateShort(g.start)}</div>
          </div>`}
        </a>`;
    }

    return html;
  }

  _render() {
    const hass = this._hass;
    const cfg  = this._config;
    if (!hass || !cfg) return;

    const stateObj = hass.states[cfg.entity];
    if (!stateObj) {
      this.shadowRoot.innerHTML = `<style>${STYLES}</style><ha-card><div class="empty">Sensorius nerastas: ${cfg.entity}</div></ha-card>`;
      return;
    }

    const upcoming = Array.isArray(stateObj.attributes.upcoming)
      ? stateObj.attributes.upcoming.map(safeGame) : [];
    const finished = Array.isArray(stateObj.attributes.finished)
      ? stateObj.attributes.finished.map(safeGame) : [];

    // Nustatome pagrindinį žaidimą rodymui
    // 1. Live žaidimas upcoming arba finished sąraše
    let mainGame = upcoming.find(g => gameState(g) === "IN")
      || finished.find(g => gameState(g) === "IN");

    // 2. Jei nėra live – pirmas upcoming
    if (!mainGame) mainGame = upcoming[0];

    // 3. Jei nėra upcoming – paskutinis baigtas
    if (!mainGame) mainGame = finished[0];

    let mainHTML = "";
    if (mainGame) {
      const state = gameState(mainGame);
      if (state === "PRE")  mainHTML = this._buildPRE(mainGame);
      else if (state === "IN")   mainHTML = this._buildIN(mainGame);
      else if (state === "POST") mainHTML = this._buildPOST(mainGame);
    } else {
      mainHTML = `<div class="empty" style="position:relative;z-index:1">Rungtynių nerasta</div>`;
    }

    // Sąrašas: upcoming be rodomo žaidimo
    const schedGames = mainGame
      ? upcoming.filter(g => g.game_id !== mainGame.game_id)
      : upcoming;
    const schedHTML = `<div class="divider"></div>${this._buildSchedule(schedGames)}`;

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        ${mainHTML}
        ${schedHTML}
      </ha-card>`;
  }
}

if (!customElements.get("zalgiris-card")) {
  customElements.define("zalgiris-card", ZalgirisCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "zalgiris-card",
  name: "Žalgiris Card",
  preview: false,
  description: "Žalgirio rungtynės + artėjančių sąrašas",
});

console.info(`%c ZALGIRIS-CARD ${CARD_VERSION} įdiegta`, "color: #00642F; font-weight: bold");
