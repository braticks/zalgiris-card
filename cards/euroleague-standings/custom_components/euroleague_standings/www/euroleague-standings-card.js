const CARD_VERSION = "1.3.0";
const EUROLEAGUE_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/9/90/EuroLeague_logo.svg";

const DEFAULT_CONFIG = {
  entity: "sensor.euroleague_standings",
  title: "EuroLeague",
  count: 10,
  favorite_team: "ZAL",
  always_show_favorite: true,
  show_zones: true,
  team_logo_mode: "icon",
  header_style: "text",
  header_text_mode: "auto",
  header_text: "",
  show_round: true,
  show_gp: false,
  show_diff: true,
  density: "normal",
  highlight_favorite: true,
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const asInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const signed = (value) => {
  const n = asInt(value, 0);
  return n > 0 ? `+${n}` : String(n);
};

const zoneFor = (position) => {
  if (position >= 1 && position <= 6) return "playoff";
  if (position >= 7 && position <= 10) return "playin";
  return "outside";
};

const densityForConfig = (config) => {
  const density = String(config?.density || "").toLowerCase();
  if (["normal", "compact", "super_compact"].includes(density)) return density;
  return config?.compact === true ? "compact" : "normal";
};

class EuroleagueStandingsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("euroleague-standings-card-editor");
  }

  static getStubConfig() {
    return { ...DEFAULT_CONFIG };
  }

  setConfig(config) {
    if (!config) throw new Error("Card configuration is missing");
    const merged = { ...DEFAULT_CONFIG, ...config };
    if (!config.team_logo_mode && Object.prototype.hasOwnProperty.call(config, "show_logos")) {
      merged.team_logo_mode = config.show_logos === false ? "none" : "icon";
    }
    merged.density = densityForConfig(config);
    delete merged.compact;
    this._config = merged;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const count = Math.max(1, Math.min(20, asInt(this._config?.count, 10)));
    const density = this._density();
    if (density === "super_compact") return Math.max(2, Math.ceil((count + 2) / 3));
    return Math.max(3, Math.ceil((count + 2) / 2));
  }

  _state() {
    return this._hass?.states?.[this._config?.entity];
  }

  _teams(stateObj) {
    const raw = Array.isArray(stateObj?.attributes?.teams) ? stateObj.attributes.teams : [];
    return raw.map((team) => ({
      position: asInt(team?.position, 0),
      code: String(team?.code ?? "").toUpperCase(),
      name: String(team?.name ?? team?.code ?? ""),
      logo: team?.logo ? String(team.logo) : "",
      games_played: asInt(team?.games_played, 0),
      wins: asInt(team?.wins, 0),
      losses: asInt(team?.losses, 0),
      points_for: asInt(team?.points_for, 0),
      points_against: asInt(team?.points_against, 0),
      points_diff: asInt(team?.points_diff, 0),
    })).filter((team) => team.position > 0).sort((a, b) => a.position - b.position);
  }

  _logoMode() {
    const mode = String(this._config?.team_logo_mode || "icon").toLowerCase();
    return ["icon", "background", "none"].includes(mode) ? mode : "icon";
  }

  _density() {
    return densityForConfig(this._config);
  }

  _showGp() {
    return this._config?.show_gp === true && this._density() !== "super_compact";
  }

  _visibleTeams(allTeams) {
    const count = Math.max(1, Math.min(20, asInt(this._config.count, 10)));
    const top = allTeams.slice(0, count);
    const code = String(this._config.favorite_team ?? "").toUpperCase();
    const favorite = code ? allTeams.find((team) => team.code === code) : null;
    if (!favorite || this._config.always_show_favorite === false || top.some((team) => team.code === favorite.code)) {
      return { top, favorite: null };
    }
    return { top, favorite };
  }

  _row(team, appended = false) {
    const cfg = this._config;
    const logoMode = this._logoMode();
    const density = this._density();
    const showGp = this._showGp();
    const isFavorite = String(cfg.favorite_team ?? "").toUpperCase() === team.code;
    const zone = cfg.show_zones === false ? "none" : zoneFor(team.position);
    const classes = ["team-row", `zone-${zone}`, `density-${density.replaceAll("_", "-")}`];
    if (isFavorite && cfg.highlight_favorite !== false) classes.push("favorite");
    if (appended) classes.push("appended");

    const iconLogo = logoMode === "icon"
      ? `<div class="logo-wrap">${team.logo
          ? `<img class="logo" src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"><span class="logo-fallback">${escapeHtml(team.code.slice(0, 3))}</span>`
          : `<span class="logo-fallback" style="display:grid">${escapeHtml(team.code.slice(0, 3))}</span>`}
        </div>`
      : "";

    const backgroundLogo = logoMode === "background" && team.logo
      ? `<img class="row-bg-logo" src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : "";

    return `
      <div class="${classes.join(" ")}">
        ${backgroundLogo}
        <div class="rank">${team.position}</div>
        ${iconLogo}
        <div class="team-name" title="${escapeHtml(team.name)}">
          <span>${escapeHtml(team.name)}</span>
          ${isFavorite && cfg.highlight_favorite !== false ? '<span class="favorite-star" title="Favorite team">★</span>' : ""}
        </div>
        ${showGp ? `<div class="stat gp">${team.games_played}</div>` : ""}
        <div class="stat wins">${team.wins}</div>
        <div class="stat losses">${team.losses}</div>
        ${cfg.show_diff !== false ? `<div class="stat diff" title="PF ${team.points_for} / PA ${team.points_against}">${signed(team.points_diff)}</div>` : ""}
      </div>`;
  }

  _rows(teams) {
    let html = "";
    const showDividerLabels = this._density() !== "super_compact";
    for (const team of teams) {
      if (showDividerLabels && this._config.show_zones !== false && team.position === 7) {
        html += '<div class="zone-divider playin-label"><span>PLAY-IN</span></div>';
      }
      if (showDividerLabels && this._config.show_zones !== false && team.position === 11) {
        html += '<div class="zone-divider outside-label"><span>OUTSIDE PLAY-IN</span></div>';
      }
      html += this._row(team);
    }
    return html;
  }

  _headerText(season) {
    if (this._config.header_text_mode === "custom") {
      return String(this._config.header_text || this._config.title || "EuroLeague");
    }
    const base = String(this._config.title || "EuroLeague");
    return season ? `${base} Season ${season}` : base;
  }

  _header(season, round, roundName) {
    const style = String(this._config.header_style || "text").toLowerCase();
    const showRound = this._config.show_round !== false && round;
    const roundHtml = showRound ? `<div class="round">${escapeHtml(roundName || `Round ${round}`)}</div>` : "";
    if (style === "none" && !roundHtml) return "";

    const text = escapeHtml(this._headerText(season));
    const logo = `<span class="header-logo-shell"><img class="header-logo" src="${EUROLEAGUE_LOGO_URL}" alt="EuroLeague" loading="lazy" referrerpolicy="no-referrer"></span>`;
    let main = "";
    if (style === "logo") main = `<div class="header-main logo-only">${logo}</div>`;
    else if (style === "both") main = `<div class="header-main">${logo}<div class="title">${text}</div></div>`;
    else if (style !== "none") main = `<div class="header-main"><div class="title">${text}</div></div>`;

    return `<div class="card-head">${main}<div class="head-right">${roundHtml}</div></div>`;
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;
    const stateObj = this._state();
    if (!stateObj) {
      this.shadowRoot.innerHTML = `<style>${EuroleagueStandingsCard.styles}</style><ha-card><div class="empty">Entity not found: ${escapeHtml(this._config.entity)}</div></ha-card>`;
      return;
    }

    const allTeams = this._teams(stateObj);
    if (!allTeams.length) {
      this.shadowRoot.innerHTML = `<style>${EuroleagueStandingsCard.styles}</style><ha-card><div class="empty">No standings data available</div></ha-card>`;
      return;
    }

    const { top, favorite } = this._visibleTeams(allTeams);
    const logoMode = this._logoMode();
    const density = this._density();
    const showGp = this._showGp();
    const isSuperCompact = density === "super_compact";
    const rankColumn = isSuperCompact ? "26px" : "34px";
    const logoColumn = isSuperCompact ? "24px" : "38px";
    const statColumn = isSuperCompact ? "27px" : "34px";
    const diffColumn = this._config.show_diff !== false ? `${isSuperCompact ? "38px" : "46px"} ` : "";
    const gpColumn = showGp ? `${isSuperCompact ? "28px" : "34px"} ` : "";
    const gridColumns = logoMode === "icon"
      ? `${rankColumn} ${logoColumn} minmax(0,1fr) ${gpColumn}${statColumn} ${statColumn} ${diffColumn}`
      : `${rankColumn} minmax(0,1fr) ${gpColumn}${statColumn} ${statColumn} ${diffColumn}`;

    const favoriteBlock = favorite
      ? `${isSuperCompact ? '<div class="favorite-gap"></div>' : '<div class="favorite-divider"><span>FAVORITE TEAM</span></div>'}${this._row(favorite, true)}`
      : "";

    const legend = this._config.show_zones !== false && !isSuperCompact
      ? '<div class="legend"><span><i class="dot playoff"></i>1–6 Playoff</span><span><i class="dot playin"></i>7–10 Play-In</span></div>'
      : "";

    this.shadowRoot.innerHTML = `
      <style>${EuroleagueStandingsCard.styles}</style>
      <ha-card class="density-${density.replaceAll("_", "-")}" style="--el-grid:${gridColumns}">
        ${this._header(stateObj.attributes?.season, stateObj.attributes?.round, stateObj.attributes?.round_name)}
        <div class="table-head">
          <div>#</div>
          ${logoMode === "icon" ? "<div></div>" : ""}
          <div>TEAM</div>
          ${showGp ? '<div class="center">GP</div>' : ""}
          <div class="center">W</div>
          <div class="center">L</div>
          ${this._config.show_diff !== false ? '<div class="center">+/-</div>' : ""}
        </div>
        <div class="rows">${this._rows(top)}${favoriteBlock}</div>
        ${legend}
      </ha-card>`;
  }

  static get styles() {
    return `
      :host{display:block;font-family:var(--primary-font-family,Arial,sans-serif)}
      ha-card{overflow:hidden;padding:0;background:var(--ha-card-background,var(--card-background-color,#111));color:var(--primary-text-color,#fff)}
      .card-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px 11px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,.12))}
      .header-main{min-width:0;display:flex;align-items:center;gap:10px}.header-main.logo-only{min-height:44px}
      .header-logo-shell{display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:#fff;border-radius:7px;padding:6px 10px;overflow:visible;box-sizing:border-box}
      .header-logo{display:block;width:min(160px,42vw);height:auto;max-height:42px;object-fit:contain}.logo-only .header-logo{width:min(210px,60vw);max-height:52px}
      .title{min-width:0;font-size:18px;line-height:1.15;font-weight:800;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .head-right{margin-left:auto;display:flex;align-items:center}.round{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color,#bbb);white-space:nowrap}
      .table-head,.team-row{display:grid;grid-template-columns:var(--el-grid);align-items:center;column-gap:6px}.table-head{min-height:34px;padding:0 12px;font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--secondary-text-color,#aaa);background:rgba(0,0,0,.08)}
      .team-row{position:relative;isolation:isolate;overflow:hidden;min-height:48px;margin:0 8px 4px;padding:0 8px 0 5px;border-radius:8px;background:rgba(127,127,127,.08);border-left:4px solid transparent;box-sizing:border-box}
      .team-row.zone-playoff{border-left-color:#24a148;background:linear-gradient(90deg,rgba(36,161,72,.12),rgba(127,127,127,.06) 34%)}.team-row.zone-playin{border-left-color:#ff8a00;background:linear-gradient(90deg,rgba(255,138,0,.12),rgba(127,127,127,.06) 34%)}.team-row.zone-outside{border-left-color:rgba(160,160,160,.4)}.team-row.zone-none{border-left-color:transparent}
      .team-row.favorite{outline:1px solid rgba(36,161,72,.58);box-shadow:inset 0 0 0 1px rgba(36,161,72,.10)}.team-row.appended{margin-bottom:8px}
      .row-bg-logo{position:absolute;z-index:-1;right:8px;top:50%;transform:translateY(-50%);width:96px;height:96px;object-fit:contain;opacity:.11;pointer-events:none}.rank,.logo-wrap,.team-name,.stat{position:relative;z-index:1}
      .rank{font-size:13px;font-weight:800;text-align:center;color:var(--secondary-text-color,#c8c8c8)}.logo-wrap{width:34px;height:34px;display:grid;place-items:center}.logo{display:block;max-width:30px;max-height:30px;width:auto;height:auto;object-fit:contain}.logo-fallback{display:none;place-items:center;width:28px;height:28px;border-radius:50%;font-size:8px;font-weight:800;background:rgba(127,127,127,.18);color:var(--secondary-text-color,#ddd)}
      .team-name{min-width:0;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}.team-name>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.favorite-star{flex:0 0 auto;font-size:12px;color:#32c766}
      .stat{text-align:center;font-size:13px;font-variant-numeric:tabular-nums}.wins{font-weight:800}.losses,.gp{color:var(--secondary-text-color,#bbb)}.diff{font-weight:800;font-size:12px}.center{text-align:center}.rows{padding:6px 0 2px}
      .zone-divider,.favorite-divider{display:flex;align-items:center;gap:8px;margin:7px 12px 6px;font-size:9px;font-weight:800;letter-spacing:.12em;color:var(--secondary-text-color,#999)}.zone-divider:before,.zone-divider:after,.favorite-divider:before,.favorite-divider:after{content:"";height:1px;flex:1;background:var(--divider-color,rgba(255,255,255,.12))}.playin-label span{color:#ff9b28}.favorite-divider span{color:#32c766;white-space:nowrap}
      .favorite-gap{height:3px}
      .legend{display:flex;flex-wrap:wrap;gap:14px;padding:7px 14px 12px;font-size:9px;color:var(--secondary-text-color,#999)}.legend span{display:flex;align-items:center;gap:5px}.dot{width:7px;height:7px;border-radius:50%;display:inline-block}.dot.playoff{background:#24a148}.dot.playin{background:#ff8a00}.empty{padding:20px;color:var(--secondary-text-color,#999);text-align:center}

      .density-compact .card-head{padding:10px 14px 8px;gap:12px}.density-compact .header-main.logo-only{min-height:36px}.density-compact .header-logo{width:min(140px,40vw);max-height:34px}.density-compact .logo-only .header-logo{width:min(180px,56vw);max-height:42px}.density-compact .title{font-size:16px}.density-compact .table-head{min-height:30px;padding:0 10px}.density-compact .team-row{min-height:40px;margin-bottom:3px}.density-compact .rows{padding-top:4px}.density-compact .row-bg-logo{width:80px;height:80px}.density-compact .legend{padding-top:5px;padding-bottom:9px}

      .density-super-compact .card-head{padding:6px 10px 5px;gap:8px}.density-super-compact .header-main{gap:6px}.density-super-compact .header-main.logo-only{min-height:0}.density-super-compact .header-logo-shell{border-radius:5px;padding:3px 6px}.density-super-compact .header-logo{width:min(104px,32vw);max-height:24px}.density-super-compact .logo-only .header-logo{width:min(124px,38vw);max-height:28px}.density-super-compact .title{font-size:14px;line-height:1.05}.density-super-compact .round{font-size:9px;letter-spacing:.04em}.density-super-compact .table-head{min-height:24px;padding:0 7px;font-size:8px;letter-spacing:.05em;column-gap:3px}.density-super-compact .team-row{min-height:28px;margin:0 5px 2px;padding:0 4px 0 3px;border-left-width:3px;border-radius:5px;column-gap:3px}.density-super-compact .team-row.appended{margin-bottom:4px}.density-super-compact .rank{font-size:10px}.density-super-compact .logo-wrap{width:22px;height:22px}.density-super-compact .logo{max-width:19px;max-height:19px}.density-super-compact .logo-fallback{width:19px;height:19px;font-size:6px}.density-super-compact .team-name{gap:3px;font-size:10px;font-weight:700}.density-super-compact .favorite-star{font-size:8px}.density-super-compact .stat{font-size:10px}.density-super-compact .diff{font-size:9px}.density-super-compact .row-bg-logo{right:5px;width:50px;height:50px;opacity:.09}.density-super-compact .rows{padding:3px 0 1px}.density-super-compact .zone-divider,.density-super-compact .favorite-divider,.density-super-compact .legend{display:none}

      @media(max-width:360px){.card-head{padding-left:12px;padding-right:12px}.title{font-size:16px}.team-row{margin-left:6px;margin-right:6px}.team-name{font-size:12px}.legend{gap:9px}.header-logo{width:min(132px,40vw)}.logo-only .header-logo{width:min(176px,58vw)}.row-bg-logo{width:78px;height:78px}.density-super-compact .card-head{padding-left:8px;padding-right:8px}.density-super-compact .title{font-size:13px}.density-super-compact .team-row{margin-left:4px;margin-right:4px}.density-super-compact .team-name{font-size:9px}.density-super-compact .header-logo{width:min(94px,31vw)}.density-super-compact .logo-only .header-logo{width:min(116px,37vw)}.density-super-compact .row-bg-logo{width:46px;height:46px}}
    `;
  }
}

class EuroleagueStandingsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("change", (event) => this._changed(event));
    this.shadowRoot.addEventListener("input", (event) => {
      if (["title", "header_text"].includes(event.target?.dataset?.key)) this._changed(event);
    });
  }

  setConfig(config) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    if (!config?.team_logo_mode && Object.prototype.hasOwnProperty.call(config || {}, "show_logos")) {
      merged.team_logo_mode = config.show_logos === false ? "none" : "icon";
    }
    merged.density = densityForConfig(config);
    delete merged.compact;
    this._config = merged;
    this._rendered = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
  }

  _state() {
    return this._hass?.states?.[this._config?.entity];
  }

  _teams() {
    const teams = this._state()?.attributes?.teams;
    return Array.isArray(teams)
      ? teams.filter((team) => team?.code).map((team) => ({
          code: String(team.code).toUpperCase(),
          name: String(team.name || team.code),
          position: asInt(team.position, 999),
        })).sort((a, b) => a.position - b.position)
      : [];
  }

  _changed(event) {
    if (!this._config) return;
    const input = event.target;
    const key = input?.dataset?.key;
    const allowed = new Set([
      "entity", "title", "count", "favorite_team", "always_show_favorite",
      "show_zones", "team_logo_mode", "header_style", "header_text_mode", "header_text",
      "show_round", "show_gp", "show_diff", "density", "highlight_favorite",
    ]);
    if (!allowed.has(key)) return;

    let value = input.type === "checkbox" ? input.checked : input.value;
    if (key === "count") value = Math.max(1, Math.min(20, asInt(value, 10)));
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { ...this._config } }, bubbles: true, composed: true,
    }));

    if (["entity", "header_style", "header_text_mode", "density"].includes(key)) {
      this._rendered = false;
      this._render();
    }
  }

  _checkbox(key, label, checked) {
    return `<label class="check"><input data-key="${key}" type="checkbox" ${checked ? "checked" : ""}><span>${label}</span></label>`;
  }

  _select(key, label, options, value) {
    return `<label class="field">${label}<select data-key="${key}">${options.map(([id, name]) => `<option value="${id}" ${id === value ? "selected" : ""}>${name}</option>`).join("")}</select></label>`;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const sensors = Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("sensor.")).sort();
    const teams = this._teams();
    const favoriteOptions = [
      '<option value="">– Not selected –</option>',
      ...teams.map((team) => `<option value="${escapeHtml(team.code)}" ${team.code === String(cfg.favorite_team || "").toUpperCase() ? "selected" : ""}>${team.position}. ${escapeHtml(team.name)}</option>`),
    ].join("");
    const headerHasText = ["text", "both"].includes(cfg.header_style || "text");
    const isSuperCompact = (cfg.density || "normal") === "super_compact";

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;color:var(--primary-text-color);font-family:var(--primary-font-family,Arial,sans-serif)}.form{display:grid;gap:16px;padding:8px 0}label.field{display:grid;gap:6px;font-size:14px}input:not([type=checkbox]),select{box-sizing:border-box;width:100%;padding:10px;font:inherit;color:var(--primary-text-color);background:var(--card-background-color,white);border:1px solid var(--divider-color,#888);border-radius:6px}.section{display:grid;gap:10px;padding:12px;border:1px solid var(--divider-color,#888);border-radius:8px}.section-title{font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--secondary-text-color)}.check{display:flex;align-items:center;gap:9px;font-size:14px}input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#00642f)}small{color:var(--secondary-text-color);line-height:1.4}.note{font-size:12px;color:var(--secondary-text-color);line-height:1.35}
      </style>
      <div class="form">
        <label class="field">Entity<input data-key="entity" list="el-sensors" value="${escapeHtml(cfg.entity || "")}" placeholder="sensor.euroleague_standings"></label>
        <datalist id="el-sensors">${sensors.map((id) => `<option value="${escapeHtml(id)}"></option>`).join("")}</datalist>
        <label class="field">Automatic header name<input data-key="title" value="${escapeHtml(cfg.title || "EuroLeague")}"></label>
        <label class="field">Teams to show<input data-key="count" type="number" min="1" max="20" step="1" value="${escapeHtml(cfg.count ?? 10)}"></label>
        <label class="field">Favorite team<select data-key="favorite_team">${favoriteOptions}</select></label>
        <div class="section">
          <div class="section-title">HEADER</div>
          ${this._select("header_style", "Header content", [["text","Text"],["logo","Full EuroLeague logo"],["both","Logo + text"],["none","None"]], cfg.header_style || "text")}
          ${headerHasText ? this._select("header_text_mode", "Header text", [["auto","Automatic: EuroLeague Season 2026"],["custom","Custom text"]], cfg.header_text_mode || "auto") : ""}
          ${headerHasText && cfg.header_text_mode === "custom" ? `<label class="field">Custom header text<input data-key="header_text" value="${escapeHtml(cfg.header_text || "")}" placeholder="EuroLeague 2026/27"></label>` : ""}
          ${this._checkbox("show_round", "Show round", cfg.show_round !== false)}
        </div>
        <div class="section"><div class="section-title">TEAM LOGOS</div>${this._select("team_logo_mode", "Team logo style", [["icon","Next to team name"],["background","As row background"],["none","Hidden"]], cfg.team_logo_mode || "icon")}</div>
        <div class="section"><div class="section-title">FAVORITE TEAM</div>${this._checkbox("always_show_favorite", "Always show favorite team when it is outside TOP N", cfg.always_show_favorite !== false)}${this._checkbox("highlight_favorite", "Highlight favorite team", cfg.highlight_favorite !== false)}</div>
        <div class="section">
          <div class="section-title">APPEARANCE</div>
          ${this._select("density", "Card density", [["normal","Normal"],["compact","Compact"],["super_compact","Super compact"]], cfg.density || "normal")}
          ${this._checkbox("show_zones", "Show Playoff / Play-In zones", cfg.show_zones !== false)}
          ${this._checkbox("show_gp", "Show GP column", cfg.show_gp === true)}
          ${this._checkbox("show_diff", "Show +/- point differential", cfg.show_diff !== false)}
          ${isSuperCompact ? '<div class="note">Super compact mode hides the GP column, zone divider labels and legend to minimize card height.</div>' : ""}
        </div>
        <small>The card is bundled with the EuroLeague Standings integration.</small>
      </div>`;
    this._rendered = true;
  }
}

if (!customElements.get("euroleague-standings-card-editor")) customElements.define("euroleague-standings-card-editor", EuroleagueStandingsCardEditor);
if (!customElements.get("euroleague-standings-card")) customElements.define("euroleague-standings-card", EuroleagueStandingsCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "euroleague-standings-card")) {
  window.customCards.push({
    type: "euroleague-standings-card",
    name: "EuroLeague Standings Card",
    description: "EuroLeague standings with team logos, zones, favorite team and point differential",
    preview: true,
  });
}

console.info(`%c EUROLEAGUE-STANDINGS-CARD ${CARD_VERSION} loaded`, "color:#24a148;font-weight:bold");