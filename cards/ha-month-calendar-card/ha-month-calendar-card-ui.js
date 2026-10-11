import './ha-month-calendar-card.js';

const CARD_TYPE = 'custom:ha-month-calendar-card';
const DEF_COLOR = '#03a9f4';
const DEF_ICON = 'mdi:calendar';
const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const normalize = (c={}) => ({
  ...c,
  type: CARD_TYPE,
  first_day_of_week: c.first_day_of_week || 'monday',
  event_display: c.event_display === 'list' ? 'list' : 'icon',
  max_events_per_day: Number.isInteger(c.max_events_per_day) && c.max_events_per_day > 0 ? c.max_events_per_day : 8,
  show_title: c.show_title !== false,
  header_font_size: Number(c.header_font_size) > 0 ? Number(c.header_font_size) : 20,
  show_legend: c.show_legend === true,
  show_selected_day_events: c.show_selected_day_events !== false,
  selected_show_time: c.selected_show_time !== false,
  selected_show_location: c.selected_show_location === true,
  selected_show_calendar: c.selected_show_calendar === true,
  tap_action: ['none','more-info','event-details'].includes(c.tap_action) ? c.tap_action : 'event-details',
  calendars: Array.isArray(c.calendars) ? c.calendars.map(x => ({
    entity: x.entity || '',
    name: x.name || '',
    color: x.color || DEF_COLOR,
    icon: x.icon || DEF_ICON,
  })) : [],
});

class HaMonthCalendarCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._config = null;
    this._hass = null;
  }

  setConfig(config) { this._config = normalize(config); this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  get hass() { return this._hass; }

  _fire(config) {
    this._config = normalize(config);
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: {config: this._config},
      bubbles: true,
      composed: true,
    }));
  }

  _top(key, value) { this._fire({...this._config, [key]: value}); }

  _cal(index, key, value) {
    const calendars = this._config.calendars.map((c,i) => i===index ? {...c,[key]:value} : c);
    this._fire({...this._config, calendars});
  }

  _esc(s) {
    const d=document.createElement('div');
    d.textContent=s==null?'':String(s);
    return d.innerHTML;
  }

  _entities() {
    return this._hass ? Object.keys(this._hass.states).filter(e=>e.startsWith('calendar.')).sort() : [];
  }

  _color(c) { return /^#[0-9a-fA-F]{6}$/.test(c||'') ? c : DEF_COLOR; }
  _validColor(c) { return /^#[0-9a-fA-F]{6}$/.test((c||'').trim()); }

  render() {
    if (!this.shadowRoot || !this._config) return;
    const c = this._config;
    const entities = this._entities();
    const hasIconPicker = !!customElements.get('ha-icon-picker');

    const days = WEEKDAYS.map(w => `<option value="${w}" ${c.first_day_of_week===w?'selected':''}>${w.charAt(0).toUpperCase()+w.slice(1)}</option>`).join('');

    const calendars = c.calendars.map((cal,i) => {
      const options = entities.map(e => `<option value="${e}" ${cal.entity===e?'selected':''}>${e}</option>`).join('');
      const fallback = cal.entity && !entities.includes(cal.entity) ? `<option value="${cal.entity}" selected>${cal.entity}</option>` : '';
      const iconField = hasIconPicker
        ? `<ha-icon-picker class="icon-picker" data-i="${i}"></ha-icon-picker>`
        : `<input class="icon-text" data-i="${i}" value="${this._esc(cal.icon||DEF_ICON)}" placeholder="mdi:calendar">`;

      return `<div class="cal">
        <div class="head">
          <ha-icon class="preview-icon" data-i="${i}" icon="${cal.icon||DEF_ICON}" style="color:${this._color(cal.color)}"></ha-icon>
          <b>${this._esc(cal.name||cal.entity||'Calendar')}</b>
          <button class="remove" data-i="${i}" title="Remove calendar"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
        </div>

        <label>Calendar entity<select class="entity" data-i="${i}"><option value="">Select calendar…</option>${fallback}${options}</select></label>
        <label>Display name<input class="name" data-i="${i}" value="${this._esc(cal.name)}" placeholder="Optional"></label>

        <div class="two">
          <label>Icon${iconField}</label>
          <label>Color<div class="color-row">
            <input class="color-picker" data-i="${i}" type="color" value="${this._color(cal.color)}" title="Choose color">
            <input class="color-hex" data-i="${i}" value="${this._esc(this._color(cal.color))}" maxlength="7" spellcheck="false">
          </div></label>
        </div>
      </div>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${this.styles()}</style><div class="editor">
      <section><h3>General</h3>
        <label>Title<input id="title" value="${this._esc(c.title||'')}" placeholder="Current month if empty"></label>
        <div class="two">
          <label>First day of week<select id="first-day">${days}</select></label>
          <label>Event display<select id="display"><option value="icon" ${c.event_display==='icon'?'selected':''}>Icons only</option><option value="list" ${c.event_display==='list'?'selected':''}>Event list</option></select></label>
        </div>
        <div class="two">
          <label>Header size<input id="header-size" type="number" min="10" max="60" value="${c.header_font_size}"></label>
          <label>Max items/day<input id="max-events" type="number" min="1" max="20" value="${c.max_events_per_day}"></label>
        </div>
        <div class="checks">
          <label><input id="show-title" type="checkbox" ${c.show_title?'checked':''}> Show title</label>
          <label><input id="show-legend" type="checkbox" ${c.show_legend?'checked':''}> Show legend</label>
        </div>
        <label>On event click<select id="tap"><option value="event-details" ${c.tap_action==='event-details'?'selected':''}>Event details</option><option value="more-info" ${c.tap_action==='more-info'?'selected':''}>More info</option><option value="none" ${c.tap_action==='none'?'selected':''}>Do nothing</option></select></label>
      </section>

      <section><h3>Selected day panel</h3>
        <div class="checks">
          <label><input id="show-selected" type="checkbox" ${c.show_selected_day_events?'checked':''}> Show selected day events</label>
          <label><input id="selected-time" type="checkbox" ${c.selected_show_time?'checked':''}> Show time</label>
          <label><input id="selected-calendar" type="checkbox" ${c.selected_show_calendar?'checked':''}> Show calendar name</label>
          <label><input id="selected-location" type="checkbox" ${c.selected_show_location?'checked':''}> Show location</label>
        </div>
      </section>

      <section><h3>Calendars</h3>${calendars || '<div class="empty">No calendars</div>'}<button id="add" class="add"><ha-icon icon="mdi:plus"></ha-icon>Add calendar</button></section>
    </div>`;

    this.bind(hasIconPicker);
  }

  bind(hasIconPicker) {
    const r = this.shadowRoot;
    r.getElementById('title')?.addEventListener('input', e => this._top('title', e.target.value));
    r.getElementById('first-day')?.addEventListener('change', e => this._top('first_day_of_week', e.target.value));
    r.getElementById('display')?.addEventListener('change', e => this._top('event_display', e.target.value));
    r.getElementById('header-size')?.addEventListener('change', e => this._top('header_font_size', Math.max(10,parseInt(e.target.value)||20)));
    r.getElementById('max-events')?.addEventListener('change', e => this._top('max_events_per_day', Math.max(1,parseInt(e.target.value)||8)));
    r.getElementById('show-title')?.addEventListener('change', e => this._top('show_title', e.target.checked));
    r.getElementById('show-legend')?.addEventListener('change', e => this._top('show_legend', e.target.checked));
    r.getElementById('tap')?.addEventListener('change', e => this._top('tap_action', e.target.value));
    r.getElementById('show-selected')?.addEventListener('change', e => this._top('show_selected_day_events', e.target.checked));
    r.getElementById('selected-time')?.addEventListener('change', e => this._top('selected_show_time', e.target.checked));
    r.getElementById('selected-calendar')?.addEventListener('change', e => this._top('selected_show_calendar', e.target.checked));
    r.getElementById('selected-location')?.addEventListener('change', e => this._top('selected_show_location', e.target.checked));

    r.querySelectorAll('.entity').forEach(el => el.addEventListener('change', e => this._cal(+e.target.dataset.i,'entity',e.target.value)));
    r.querySelectorAll('.name').forEach(el => el.addEventListener('input', e => this._cal(+e.target.dataset.i,'name',e.target.value)));

    if (hasIconPicker) {
      r.querySelectorAll('ha-icon-picker.icon-picker').forEach(el => {
        const i = +el.dataset.i;
        const cal = this._config.calendars[i];
        el.hass = this._hass;
        el.label = 'Icon';
        el.value = cal.icon || DEF_ICON;
        el.addEventListener('value-changed', e => {
          e.stopPropagation();
          const value = e.detail?.value || DEF_ICON;
          this._cal(i,'icon',value);
          const preview = r.querySelector(`.preview-icon[data-i="${i}"]`);
          if (preview) preview.setAttribute('icon', value);
        });
      });
    } else {
      r.querySelectorAll('.icon-text').forEach(el => el.addEventListener('input', e => {
        const i = +e.target.dataset.i;
        const value = e.target.value || DEF_ICON;
        this._cal(i,'icon',value);
        const preview = r.querySelector(`.preview-icon[data-i="${i}"]`);
        if (preview) preview.setAttribute('icon', value);
      }));
    }

    r.querySelectorAll('.color-picker').forEach(el => el.addEventListener('input', e => {
      const i = +e.target.dataset.i;
      const value = e.target.value;
      this._cal(i,'color',value);
      const hex = r.querySelector(`.color-hex[data-i="${i}"]`);
      if (hex) hex.value = value.toUpperCase();
      const preview = r.querySelector(`.preview-icon[data-i="${i}"]`);
      if (preview) preview.style.color = value;
    }));

    r.querySelectorAll('.color-hex').forEach(el => el.addEventListener('change', e => {
      const i = +e.target.dataset.i;
      let value = e.target.value.trim();
      if (value && !value.startsWith('#')) value = `#${value}`;
      if (!this._validColor(value)) value = this._color(this._config.calendars[i]?.color);
      value = value.toUpperCase();
      e.target.value = value;
      this._cal(i,'color',value);
      const picker = r.querySelector(`.color-picker[data-i="${i}"]`);
      if (picker) picker.value = value;
      const preview = r.querySelector(`.preview-icon[data-i="${i}"]`);
      if (preview) preview.style.color = value;
    }));

    r.querySelectorAll('.remove').forEach(el => el.addEventListener('click', e => {
      const i = +e.currentTarget.dataset.i;
      this._fire({...this._config, calendars:this._config.calendars.filter((_,x)=>x!==i)});
      this.render();
    }));

    r.getElementById('add')?.addEventListener('click', () => {
      const used = new Set(this._config.calendars.map(x=>x.entity));
      const entity = this._entities().find(x=>!used.has(x)) || '';
      this._fire({...this._config, calendars:[...this._config.calendars,{entity,name:'',color:DEF_COLOR,icon:DEF_ICON}]});
      this.render();
    });
  }

  styles() {
    return `:host{display:block}.editor{display:flex;flex-direction:column;gap:16px;padding:4px 0}section{display:flex;flex-direction:column;gap:10px}h3{font-size:1rem;margin:0;color:var(--primary-text-color)}label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;color:var(--secondary-text-color)}input,select{box-sizing:border-box;width:100%;padding:8px;border:1px solid var(--divider-color,#ccc);border-radius:5px;background:var(--card-background-color,#fff);color:var(--primary-text-color);font:inherit;font-size:.9rem}ha-icon-picker{width:100%;display:block}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.checks label{flex-direction:row;align-items:center;color:var(--primary-text-color)}.checks input{width:auto}.cal{border:1px solid var(--divider-color,#ddd);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px}.head{display:flex;align-items:center;gap:7px}.head b{flex:1;font-size:.9rem}.head ha-icon{--mdc-icon-size:18px}.remove{width:30px;height:30px;padding:3px;border:0;background:var(--error-color,#db4437);color:#fff;border-radius:5px;cursor:pointer}.add{display:flex;align-items:center;gap:5px;align-self:flex-start;width:auto;border:1px solid var(--primary-color);color:var(--primary-color);background:none;border-radius:5px;padding:7px 10px;cursor:pointer}.empty{color:var(--secondary-text-color);font-size:.85rem}.color-row{display:grid;grid-template-columns:52px 1fr;gap:7px;align-items:center}.color-picker{height:38px;padding:2px;cursor:pointer}.color-hex{text-transform:uppercase;font-family:monospace}@media(max-width:600px){.two,.checks{grid-template-columns:1fr}}`;
  }
}

if (!customElements.get('ha-month-calendar-card-editor')) {
  customElements.define('ha-month-calendar-card-editor', HaMonthCalendarCardEditor);
}

const Card = customElements.get('ha-month-calendar-card');
if (Card) {
  Card.getConfigElement = () => document.createElement('ha-month-calendar-card-editor');
  Card.getStubConfig = hass => {
    const calendars = hass ? Object.keys(hass.states).filter(e=>e.startsWith('calendar.')) : [];
    const first = calendars[0] || 'calendar.example';
    return normalize({calendars:[{entity:first,name:'',color:DEF_COLOR,icon:DEF_ICON}]});
  };
}
