const CARD_VERSION = "1.0.5";
const LKL_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/5/5e/Betsson_LKL.svg";

const DEFAULT_CONFIG = {
  entity: "sensor.lkl_standings",
  title: "LKL",
  count: 10,
  favorite_team: "ZAL",
  always_show_favorite: true,
  show_zones: true,
  team_logo_mode: "icon",
  show_league_logo: true,
  show_gp: true,
  show_pct: true,
  show_diff: false,
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

const asNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPct = (value, games, wins) => {
  const n = asNumber(value);
  if (n !== null) return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(".", ",");
  if (games > 0) return (wins / games * 100).toFixed(1).replace(".", ",");
  return "-";
};

const signed = (value) => {
  const n = asNumber(value);
  if (n === null) return "-";
  const rounded = Math.round(n);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
};

const densityForConfig = (config) => {
  const density = String(config?.density || "").toLowerCase();
  if (["normal", "compact", "super_compact"].includes(density)) return density;
  return config?.compact === true ? "compact" : "normal";
};

const zoneFor = (position) => position >= 1 && position <= 8 ? "playoff" : "outside";

class LklStandingsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("lkl-standings-card-editor");
  }

  static getStubConfig() {
    return { ...DEFAULT_CONFIG };
  }

  setConfig(config) {
    if (!config) throw new Error("Trūksta kortos konfigūracijos");
    const merged = { ...DEFAULT_CONFIG, ...config };
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
    if (this._density() === "super_compact") return Math.max(2, Math.ceil((count + 2) / 3));
    return Math.max(3, Math.ceil((count + 2) / 2));
  }

  _state() {
    return this._hass?.states?.[this._config?.entity];
  }

  _density() {
    return densityForConfig(this._config);
  }

  _showGp() {
    return this._config?.show_gp !== false && this._density() !== "super_compact";
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
      win_percentage: team?.win_percentage,
      points_for: asInt(team?.points_for, 0),
      points_against: asInt(team?.points_against, 0),
      points_diff: asInt(team?.points_diff, 0),
    })).filter((team) => team.position > 0).sort((a, b) => a.position - b.position);
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

  _logoMode() {
    const mode = String(this._config?.team_logo_mode || "icon").toLowerCase();
    return ["icon", "background", "none"].includes(mode) ? mode : "icon";
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

    const diffClass = team.points_diff > 0 ? "positive" : team.points_diff < 0 ? "negative" : "";

    return `
      <div class="${classes.join(" ")}">
        ${backgroundLogo}
        <div class="rank">${team.position}</div>
        ${iconLogo}
        <div class="team-name" title="${escapeHtml(team.name)}">
          <span>${escapeHtml(team.name)}</span>
          ${isFavorite && cfg.highlight_favorite !== false ? '<span class="favorite-star" title="Mėgstama komanda">★</span>' : ""}
        </div>
        ${showGp ? `<div class="stat gp">${team.games_played}</div>` : ""}
        <div class="stat wins">${team.wins}</div>
        <div class="stat losses">${team.losses}</div>
        ${cfg.show_pct !== false ? `<div class="stat pct">${formatPct(team.win_percentage, team.games_played, team.wins)}</div>` : ""}
        ${cfg.show_diff === true ? `<div class="stat diff ${diffClass}" title="Pelnyta ${team.points_for} / praleista ${team.points_against}">${signed(team.points_diff)}</div>` : ""}
      </div>`;
  }

  _rows(teams) {
    let html = "";
    const showDividerLabels = this._density() !== "super_compact";
    for (const team of teams) {
      if (showDividerLabels && this._config.show_zones !== false && team.position === 9) {
        html += '<div class="zone-divider"><span>UŽ ATKRINTAMŲJŲ RIBOS</span></div>';
      }
      html += this._row(team);
    }
    return html;
  }

  _header(season) {
    const showLogo = this._config.show_league_logo !== false;
    const logo = showLogo
      ? `<span class="header-logo-shell"><img class="header-logo" src="${LKL_LOGO_URL}" alt="Betsson-LKL" loading="lazy" referrerpolicy="no-referrer"></span>`
      : "";
    const title = escapeHtml(this._config.title || "LKL");
    const seasonHtml = season ? `<div class="season">${escapeHtml(season)}</div>` : "";
    return `
      <div class="card-head">
        <div class="header-main">${logo}<div class="title">${title}</div></div>
        ${seasonHtml}
      </div>`;
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;
    const stateObj = this._state();

    if (!stateObj) {
      this.shadowRoot.innerHTML = `<style>${LklStandingsCard.styles}</style><ha-card><div class="empty">Nerastas entity: ${escapeHtml(this._config.entity)}</div></ha-card>`;
      return;
    }

    const allTeams = this._teams(stateObj);
    if (!allTeams.length) {
      this.shadowRoot.innerHTML = `<style>${LklStandingsCard.styles}</style><ha-card><div class="empty">LKL lentelės duomenų nėra</div></ha-card>`;
      return;
    }

    const { top, favorite } = this._visibleTeams(allTeams);
    const logoMode = this._logoMode();
    const density = this._density();
    const showGp = this._showGp();
    const isSuperCompact = density === "super_compact";

    const rankColumn = isSuperCompact ? "24px" : "32px";
    const logoColumn = isSuperCompact ? "24px" : "38px";
    const statColumn = isSuperCompact ? "26px" : "32px";
    const gpColumn = showGp ? `${isSuperCompact ? "28px" : "34px"} ` : "";
    const pctColumn = this._config.show_pct !== false ? `${isSuperCompact ? "34px" : "44px"} ` : "";
    const diffColumn = this._config.show_diff === true ? `${isSuperCompact ? "38px" : "48px"} ` : "";

    const gridColumns = logoMode === "icon"
      ? `${rankColumn} ${logoColumn} minmax(0,1fr) ${gpColumn}${statColumn} ${statColumn} ${pctColumn}${diffColumn}`
      : `${rankColumn} minmax(0,1fr) ${gpColumn}${statColumn} ${statColumn} ${pctColumn}${diffColumn}`;

    const favoriteBlock = favorite
      ? `${isSuperCompact ? '<div class="favorite-gap"></div>' : '<div class="favorite-divider"><span>MĖGSTAMA KOMANDA</span></div>'}${this._row(favorite, true)}`
      : "";

    const legend = this._config.show_zones !== false && !isSuperCompact
      ? '<div class="legend"><span><i class="dot playoff"></i>1–8 Atkrintamosios</span><span><i class="dot outside"></i>9–10 Už ribos</span></div>'
      : "";

    this.shadowRoot.innerHTML = `
      <style>${LklStandingsCard.styles}</style>
      <ha-card class="density-${density.replaceAll("_", "-")}" style="--lkl-grid:${gridColumns}">
        ${this._header(stateObj.attributes?.season)}
        <div class="table-head">
          <div>#</div>
          ${logoMode === "icon" ? "<div></div>" : ""}
          <div>KOMANDA</div>
          ${showGp ? '<div class="center">R</div>' : ""}
          <div class="center">P</div>
          <div class="center">PR</div>
          ${this._config.show_pct !== false ? '<div class="center">%</div>' : ""}
          ${this._config.show_diff === true ? '<div class="center">+/−</div>' : ""}
        </div>
        <div class="rows">${this._rows(top)}${favoriteBlock}</div>
        ${legend}
      </ha-card>`;
  }

  static get styles() {
    return `
      :host{display:block;font-family:var(--primary-font-family,Arial,sans-serif)}
      ha-card{overflow:hidden;padding:0;background:var(--ha-card-background,var(--card-background-color,#111));color:var(--primary-text-color,#fff)}
      .card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px 10px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,.12))}
      .header-main{min-width:0;display:flex;align-items:center;gap:10px}
      .header-logo-shell{display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:#fff;border-radius:6px;padding:3px 7px;box-sizing:border-box}
      .header-logo{display:block;width:74px;height:auto;max-height:38px;object-fit:contain}
      .title{min-width:0;font-size:18px;font-weight:800;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .season{font-size:11px;font-weight:800;color:var(--secondary-text-color,#bbb);white-space:nowrap}
      .table-head,.team-row{display:grid;grid-template-columns:var(--lkl-grid);align-items:center;column-gap:6px}
      .table-head{min-height:34px;padding:0 12px;font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--secondary-text-color,#aaa);background:rgba(0,0,0,.08)}
      .team-row{position:relative;isolation:isolate;overflow:hidden;min-height:48px;margin:0 8px 4px;padding:0 8px 0 5px;border-radius:8px;background:rgba(127,127,127,.08);border-left:4px solid transparent;box-sizing:border-box}
      .team-row.zone-playoff{border-left-color:#24a148;background:linear-gradient(90deg,rgba(36,161,72,.12),rgba(127,127,127,.06) 34%)}
      .team-row.zone-outside{border-left-color:rgba(160,160,160,.45)}
      .team-row.zone-none{border-left-color:transparent}
      .team-row.favorite{outline:1px solid rgba(36,161,72,.58);box-shadow:inset 0 0 0 1px rgba(36,161,72,.10)}
      .team-row.appended{margin-bottom:8px}
      .row-bg-logo{position:absolute;z-index:-1;right:8px;top:50%;transform:translateY(-50%);width:96px;height:96px;object-fit:contain;opacity:.11;pointer-events:none}
      .rank,.logo-wrap,.team-name,.stat{position:relative;z-index:1}
      .rank{font-size:13px;font-weight:800;text-align:center;color:var(--secondary-text-color,#c8c8c8)}
      .logo-wrap{width:34px;height:34px;display:grid;place-items:center}
      .logo{display:block;max-width:30px;max-height:30px;width:auto;height:auto;object-fit:contain}
      .logo-fallback{display:none;place-items:center;width:28px;height:28px;border-radius:50%;font-size:8px;font-weight:800;background:rgba(127,127,127,.18);color:var(--secondary-text-color,#ddd)}
      .team-name{min-width:0;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}
      .team-name>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .favorite-star{flex:0 0 auto;font-size:12px;color:#32c766}
      .stat{text-align:center;font-size:13px;font-variant-numeric:tabular-nums}
      .wins{font-weight:800}.losses,.gp{color:var(--secondary-text-color,#bbb)}
      .pct,.diff{font-weight:800;font-size:12px}
      .diff.positive{color:#32c766}.diff.negative{color:#ef5350}
      .center{text-align:center}.rows{padding:6px 0 2px}
      .zone-divider,.favorite-divider{display:flex;align-items:center;gap:8px;margin:7px 12px 6px;font-size:9px;font-weight:800;letter-spacing:.12em;color:var(--secondary-text-color,#999)}
      .zone-divider:before,.zone-divider:after,.favorite-divider:before,.favorite-divider:after{content:"";height:1px;flex:1;background:var(--divider-color,rgba(255,255,255,.12))}
      .favorite-divider span{color:#32c766;white-space:nowrap}
      .favorite-gap{height:3px}
      .legend{display:flex;flex-wrap:wrap;gap:12px;padding:5px 14px 12px;font-size:10px;color:var(--secondary-text-color,#aaa)}
      .legend span{display:flex;align-items:center;gap:5px}
      .dot{width:7px;height:7px;border-radius:50%;display:inline-block}.dot.playoff{background:#24a148}.dot.outside{background:#888}
      .empty{padding:18px;color:var(--secondary-text-color,#aaa);text-align:center}

      .density-compact .card-head{padding:9px 12px 7px}.density-compact .header-logo{width:64px;max-height:30px}.density-compact .title{font-size:16px}.density-compact .table-head{min-height:29px;padding:0 10px}.density-compact .team-row{min-height:39px;margin-bottom:3px}.density-compact .rows{padding-top:4px}.density-compact .row-bg-logo{width:80px;height:80px}.density-compact .legend{padding-top:4px;padding-bottom:9px}

      .density-super-compact .card-head{padding:5px 8px 4px;gap:7px}.density-super-compact .header-main{gap:6px}.density-super-compact .header-logo-shell{border-radius:4px;padding:2px 4px}.density-super-compact .header-logo{width:50px;max-height:22px}.density-super-compact .title{font-size:13px;line-height:1.05}.density-super-compact .season{font-size:9px}.density-super-compact .table-head{min-height:23px;padding:0 6px;font-size:8px;letter-spacing:.04em;column-gap:3px}.density-super-compact .team-row{min-height:28px;margin:0 5px 2px;padding:0 4px 0 3px;border-left-width:3px;border-radius:5px;column-gap:3px}.density-super-compact .team-row.appended{margin-bottom:4px}.density-super-compact .rank{font-size:10px}.density-super-compact .logo-wrap{width:22px;height:22px}.density-super-compact .logo{max-width:19px;max-height:19px}.density-super-compact .logo-fallback{width:19px;height:19px;font-size:6px}.density-super-compact .team-name{gap:3px;font-size:10px}.density-super-compact .favorite-star{font-size:8px}.density-super-compact .stat{font-size:10px}.density-super-compact .pct,.density-super-compact .diff{font-size:9px}.density-super-compact .row-bg-logo{right:5px;width:50px;height:50px;opacity:.09}.density-super-compact .rows{padding:3px 0 1px}.density-super-compact .zone-divider,.density-super-compact .favorite-divider,.density-super-compact .legend{display:none}

      @media(max-width:360px){.team-row{margin-left:6px;margin-right:6px}.team-name{font-size:12px}.header-logo{width:64px}.density-super-compact .team-row{margin-left:4px;margin-right:4px}.density-super-compact .team-name{font-size:9px}.density-super-compact .header-logo{width:46px}}
    `;
  }
}

class LklStandingsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("change", (event) => this._changed(event));
    this.shadowRoot.addEventListener("input", (event) => {
      if (["title"].includes(event.target?.dataset?.key)) this._changed(event);
    });
  }

  setConfig(config) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    merged.density = densityForConfig(config);
    delete merged.compact;
    this._config = merged;
    if (!this._rendered) this._render();
    else this._syncControls();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
  }

  _changed(event) {
    const el = event.target;
    const key = el?.dataset?.key;
    if (!key || !this._config) return;
    const value = el.type === "checkbox"
      ? el.checked
      : el.type === "number"
        ? asInt(el.value, 10)
        : el.value;
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _syncControls() {
    if (!this._rendered || !this._config) return;
    const active = this.shadowRoot.activeElement;
    if (active) return;
    this.shadowRoot.querySelectorAll("[data-key]").forEach((el) => {
      const key = el.dataset.key;
      const value = this._config[key];
      if (el.type === "checkbox") el.checked = value === true || (value !== false && !["show_diff"].includes(key));
      else if (el.type === "number") el.value = asInt(value, 10);
      else el.value = value ?? "";
    });
  }

  _render() {
    if (!this._config || this._rendered) return;
    const favoriteOptions = ["ZAL","RYT","LIE","NEP","JUV","SIA","GAR","HIP","TAU","NEV"]
      .map((code) => `<option value="${code}" ${this._config.favorite_team === code ? "selected" : ""}>${code}</option>`)
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 0}
        .full{grid-column:1/-1}
        label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--secondary-text-color)}
        input,select{box-sizing:border-box;width:100%;padding:8px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color)}
        .check{flex-direction:row;align-items:center}.check input{width:auto}
      </style>
      <div class="grid">
        <label class="full">Entity<input data-key="entity" value="${escapeHtml(this._config.entity)}"></label>
        <label>Pavadinimas<input data-key="title" value="${escapeHtml(this._config.title)}"></label>
        <label>Rodyti komandų<input data-key="count" type="number" min="1" max="10" value="${asInt(this._config.count,10)}"></label>
        <label>Mėgstama komanda<select data-key="favorite_team">${favoriteOptions}</select></label>
        <label>Komandų logotipai<select data-key="team_logo_mode">
          <option value="icon" ${this._config.team_logo_mode === "icon" ? "selected" : ""}>Ikona</option>
          <option value="background" ${this._config.team_logo_mode === "background" ? "selected" : ""}>Fonas</option>
          <option value="none" ${this._config.team_logo_mode === "none" ? "selected" : ""}>Nerodyti</option>
        </select></label>
        <label>Tankumas<select data-key="density">
          <option value="normal" ${this._config.density === "normal" ? "selected" : ""}>Normalus</option>
          <option value="compact" ${this._config.density === "compact" ? "selected" : ""}>Kompaktiškas</option>
          <option value="super_compact" ${this._config.density === "super_compact" ? "selected" : ""}>Super kompaktiškas</option>
        </select></label>
        ${[
          ["show_league_logo","Rodyti LKL logotipą", true],
          ["always_show_favorite","Visada rodyti mėgstamą", true],
          ["show_zones","Rodyti zonas", true],
          ["show_gp","Rodyti rungtynes", true],
          ["show_pct","Rodyti %", true],
          ["show_diff","Rodyti +/−", false],
          ["highlight_favorite","Pažymėti mėgstamą", true],
        ].map(([key, text, defaultOn]) => {
          const checked = defaultOn ? this._config[key] !== false : this._config[key] === true;
          return `<label class="check"><input data-key="${key}" type="checkbox" ${checked ? "checked" : ""}>${text}</label>`;
        }).join("")}
      </div>`;

    this._rendered = true;
  }
}

if (!customElements.get("lkl-standings-card")) customElements.define("lkl-standings-card", LklStandingsCard);
if (!customElements.get("lkl-standings-card-editor")) customElements.define("lkl-standings-card-editor", LklStandingsCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "lkl-standings-card",
  name: "LKL turnyrinė lentelė",
  description: "LKL turnyrinė lentelė iš lkl.lt",
  preview: true,
  documentationURL: "https://github.com/braticks/lkl-standings",
});
console.info(`%c LKL-TURNYRINE-LENTELE %c v${CARD_VERSION} `, "background:#1b5e20;color:white;font-weight:700", "background:#eee;color:#111");
