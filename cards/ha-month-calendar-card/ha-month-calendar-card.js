/**
 * ha-month-calendar-card - braticks fork
 * Custom month-only version:
 * - plain coloured icons (no bubbles)
 * - selected day events below the calendar
 * - today selected by default
 */
const DAY_MS=86400000, REFRESH_MS=300000;
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DEF_COLOR='#03a9f4', DEF_ICON='mdi:calendar';
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const parse=b=>{if(!b)return null;if(b.date){const [y,m,d]=b.date.split('-').map(Number);return new Date(y,m-1,d)}return b.dateTime?new Date(b.dateTime):null};
const allDay=e=>!!(e?.start?.date&&!e?.start?.dateTime);
const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

class HaMonthCalendarCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._events=[];this._selected=sod(new Date());this._idx=[];this._detail=null}

  setConfig(c){
    if(!c?.calendars?.length)throw new Error('ha-month-calendar-card: calendars required');
    this._c={...c,
      first_day_of_week:c.first_day_of_week||'monday',
      event_display:c.event_display==='list'?'list':'icon',
      max_events_per_day:Number.isInteger(c.max_events_per_day)&&c.max_events_per_day>0?c.max_events_per_day:8,
      show_title:c.show_title!==false,
      header_font_size:Number(c.header_font_size)>0?Number(c.header_font_size):20,
      show_legend:c.show_legend===true,
      show_selected_day_events:c.show_selected_day_events!==false,
      selected_show_time:c.selected_show_time!==false,
      selected_show_location:c.selected_show_location===true,
      selected_show_calendar:c.selected_show_calendar===true,
      tap_action:['none','more-info','event-details'].includes(c.tap_action)?c.tap_action:'event-details',
      calendars:c.calendars.map(x=>({entity:x.entity,name:x.name||'',color:x.color||DEF_COLOR,icon:x.icon||DEF_ICON}))
    };
    this._key=null;this.render();this.fetchEvents();
  }
  set hass(h){this._h=h;this.fetchEvents()}
  get hass(){return this._h}
  connectedCallback(){if(!this._timer)this._timer=setInterval(()=>{this._key=null;this.fetchEvents()},REFRESH_MS)}
  disconnectedCallback(){clearInterval(this._timer);this._timer=null}
  getCardSize(){return 8}
  static getLayoutOptions(){return{grid_columns:'full',grid_rows:8,grid_min_rows:6,grid_max_rows:16,grid_min_columns:3}}

  range(){
    const n=new Date(),y=n.getFullYear(),m=n.getMonth(),first=new Date(y,m,1);
    let f=WEEKDAYS.indexOf(String(this._c.first_day_of_week).toLowerCase());if(f<0)f=1;
    const lead=(first.getDay()-f+7)%7,days=new Date(y,m+1,0).getDate(),cells=Math.ceil((lead+days)/7)*7;
    const start=new Date(first);start.setDate(first.getDate()-lead);const end=new Date(start);end.setDate(end.getDate()+cells);
    return{y,m,start,end,cells,f};
  }

  async fetchEvents(){
    if(!this._h||!this._c)return;const r=this.range();
    const k=JSON.stringify([this._c.calendars.map(x=>x.entity),r.start.toISOString(),r.end.toISOString()]);if(k===this._key)return;this._key=k;
    this._loading=true;this.render();
    const all=await Promise.all(this._c.calendars.map(async cal=>{try{
      const a=await this._h.callApi('GET',`calendars/${cal.entity}?start=${encodeURIComponent(r.start.toISOString())}&end=${encodeURIComponent(r.end.toISOString())}`);
      return(a||[]).map(e=>({...e,__cal:cal}));
    }catch(err){console.error(`ha-month-calendar-card: ${cal.entity}`,err);return[]}}));
    this._events=all.flat();this._loading=false;this.render();
  }

  eventsFor(day){
    const a=sod(day),b=new Date(a.getTime()+DAY_MS);
    return this._events.filter(e=>{const s=parse(e.start);let t=parse(e.end);if(!s)return false;if(!t)t=new Date(s.getTime()+DAY_MS);return s<b&&t>a})
      .sort((a,b)=>(allDay(a)?0:parse(a.start)?.getTime()||0)-(allDay(b)?0:parse(b.start)?.getTime()||0));
  }
  locale(){return this._h?.locale?.language||navigator.language||'lt-LT'}
  esc(s){const d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
  time(e){if(allDay(e))return'';const d=parse(e.start);return d?d.toLocaleTimeString(this.locale(),{hour:'2-digit',minute:'2-digit'}):''}
  dayLabel(){return this._selected.toLocaleDateString(this.locale(),{weekday:'long',month:'long',day:'numeric'})}
  monthLabel(){return new Date().toLocaleDateString(this.locale(),{month:'long',year:'numeric'})}
  weekLabels(f){const sun=new Date(2026,0,4);return Array.from({length:7},(_,i)=>{const d=new Date(sun);d.setDate(sun.getDate()+((f+i)%7));return d.toLocaleDateString(this.locale(),{weekday:'short'}).replace('.','')})}
  detail(e){const s=parse(e.start),t=parse(e.end);return{title:e.summary||'(Be pavadinimo)',icon:e.__cal?.icon||DEF_ICON,color:e.__cal?.color||DEF_COLOR,cal:e.__cal?.name||e.__cal?.entity||'',time:allDay(e)?'Visa diena':s?`${s.toLocaleTimeString(this.locale(),{hour:'2-digit',minute:'2-digit'})}${t?' – '+t.toLocaleTimeString(this.locale(),{hour:'2-digit',minute:'2-digit'}):''}`:'',loc:e.location||'',desc:clean(e.description)}}

  month(){
    const r=this.range(),today=sod(new Date()),iconMode=this._c.event_display==='icon';let cells='';
    for(let i=0;i<r.cells;i++){
      const d=new Date(r.start);d.setDate(r.start.getDate()+i);const evs=this.eventsFor(d);let items=[];
      if(iconMode){const g=new Map();for(const e of evs){const c=e.__cal;if(!g.has(c.entity))g.set(c.entity,{cal:c,evs:[]});g.get(c.entity).evs.push(e)}items=[...g.values()]}
      else items=evs.map(e=>({cal:e.__cal,evs:[e]}));
      let ehtml='';for(const it of items.slice(0,this._c.max_events_per_day)){
        const n=this._idx.push(it.evs.length===1?this.detail(it.evs[0]):{multiple:it.evs.map(e=>this.detail(e))})-1;
        const title=it.evs.map(e=>e.summary||'(Be pavadinimo)').join('\n');
        ehtml+=iconMode
          ?`<div class="event-icon" data-i="${n}" data-e="${it.cal.entity}" title="${this.esc(title)}"><ha-icon icon="${it.cal.icon}" style="color:${it.cal.color}"></ha-icon></div>`
          :`<div class="event-chip" data-i="${n}" data-e="${it.cal.entity}" style="border-left-color:${it.cal.color}"><ha-icon icon="${it.cal.icon}" style="color:${it.cal.color}"></ha-icon><span>${this.esc(title)}</span></div>`;
      }
      if(items.length>this._c.max_events_per_day)ehtml+=`<span class="more">+${items.length-this._c.max_events_per_day}</span>`;
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      cells+=`<div class="day ${d.getMonth()===r.m?'':'dim'} ${same(d,today)?'today':''} ${same(d,this._selected)?'selected':''}" data-date="${key}"><div class="num">${d.getDate()}</div><div class="events ${iconMode?'icons':''}">${ehtml}</div></div>`;
    }
    return`<div class="week">${this.weekLabels(r.f).map(x=>`<div>${this.esc(x)}</div>`).join('')}</div><div class="grid">${cells}</div>`;
  }

  selectedPanel(){
    if(!this._c.show_selected_day_events)return'';const evs=this.eventsFor(this._selected);
    const rows=evs.length?evs.map(e=>{const c=e.__cal,n=this._idx.push(this.detail(e))-1,t=this._c.selected_show_time?this.time(e):'',meta=[];if(this._c.selected_show_calendar)meta.push(c.name||c.entity);if(this._c.selected_show_location&&e.location)meta.push(e.location);return`<div class="sel-event" data-i="${n}" data-e="${c.entity}"><ha-icon icon="${c.icon}" style="color:${c.color}"></ha-icon>${t?`<b>${this.esc(t)}</b>`:''}<div><div>${this.esc(e.summary||'(Be pavadinimo)')}</div>${meta.length?`<small>${this.esc(meta.join(' · '))}</small>`:''}</div></div>`}).join(''):'<div class="empty">Įvykių nėra</div>';
    return`<div class="selected-panel"><div class="sel-title">${this.esc(this.dayLabel())}</div>${rows}</div>`;
  }

  legend(){return this._c.show_legend?`<div class="legend">${this._c.calendars.map(c=>`<span><ha-icon icon="${c.icon}" style="color:${c.color}"></ha-icon>${this.esc(c.name||c.entity)}</span>`).join('')}</div>`:''}
  popup(){if(!this._detail)return'';const one=e=>`<div class="block"><h3><ha-icon icon="${e.icon}" style="color:${e.color}"></ha-icon>${this.esc(e.title)}</h3>${e.cal?`<p>${this.esc(e.cal)}</p>`:''}${e.time?`<p>${this.esc(e.time)}</p>`:''}${e.loc?`<p>${this.esc(e.loc)}</p>`:''}${e.desc?`<p>${this.esc(e.desc)}</p>`:''}</div>`;return`<div class="back"><div class="pop"><button>×</button>${this._detail.multiple?this._detail.multiple.map(one).join('<hr>'):one(this._detail)}</div></div>`}
  eventClick(el){if(this._c.tap_action==='none')return;if(this._c.tap_action==='event-details'){const i=Number(el.dataset.i);if(this._idx[i]){this._detail=this._idx[i];this.render();return}}this.dispatchEvent(new CustomEvent('hass-more-info',{bubbles:true,composed:true,detail:{entityId:el.dataset.e}}))}

  render(){
    if(!this._c||!this.shadowRoot)return;this._idx=[];
    this.shadowRoot.innerHTML=`<style>${this.styles()}</style><ha-card>${this._c.show_title?`<div class="title" style="font-size:${this._c.header_font_size}px">${this.esc(this._c.title||this.monthLabel())}</div>`:''}${this._loading?'<div class="loading">Kraunami įvykiai…</div>':''}${this.month()}${this.selectedPanel()}${this.legend()}${this.popup()}</ha-card>`;
    this.shadowRoot.querySelectorAll('.day').forEach(el=>el.onclick=e=>{if(e.target.closest('.event-icon,.event-chip'))return;const[y,m,d]=el.dataset.date.split('-').map(Number);this._selected=new Date(y,m-1,d);this.render()});
    this.shadowRoot.querySelectorAll('.event-icon,.event-chip,.sel-event').forEach(el=>el.onclick=e=>{e.stopPropagation();this.eventClick(el)});
    this.shadowRoot.querySelector('.pop button')?.addEventListener('click',()=>{this._detail=null;this.render()});
    this.shadowRoot.querySelector('.back')?.addEventListener('click',e=>{if(e.target.classList.contains('back')){this._detail=null;this.render()}});
  }

  styles(){return`:host{display:block}ha-card{padding:12px;box-sizing:border-box}.title{font-weight:500;margin-bottom:8px}.loading,.empty,small{color:var(--secondary-text-color);font-size:.75rem}.week,.grid{display:grid;grid-template-columns:repeat(7,1fr)}.week{text-align:center;font-size:.75rem;font-weight:600;color:var(--secondary-text-color);padding-bottom:4px}.grid{padding:1px 0 0 1px}.day{border:1px solid var(--divider-color,#ddd);margin:-1px 0 0 -1px;padding:3px;min-height:52px;box-sizing:border-box;cursor:pointer;overflow:hidden}.day.dim{opacity:.35}.day.selected{box-shadow:inset 0 0 0 2px var(--primary-color);position:relative;z-index:1}.num{font-size:.78rem;width:20px;height:20px;display:flex;align-items:center;justify-content:center;margin-left:auto}.today .num{background:var(--primary-color);color:var(--text-primary-color,#fff);border-radius:50%}.events{display:flex;flex-direction:column;gap:2px}.events.icons{flex-direction:row;flex-wrap:wrap;gap:2px}.event-icon{line-height:0}.event-icon ha-icon{--mdc-icon-size:16px}.event-chip{display:flex;align-items:center;gap:2px;border-left:3px solid;font-size:.66rem;overflow:hidden}.event-chip ha-icon{--mdc-icon-size:12px}.event-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.more{font-size:.62rem;color:var(--secondary-text-color)}.selected-panel{border-top:1px solid var(--divider-color,#ddd);margin-top:8px;padding-top:7px}.sel-title{font-size:.82rem;font-weight:600;text-transform:capitalize;margin-bottom:3px}.sel-event{display:flex;align-items:center;gap:7px;padding:5px 2px;border-bottom:1px solid var(--divider-color,#eee);cursor:pointer}.sel-event>ha-icon{--mdc-icon-size:18px}.sel-event>b{font-size:.74rem;min-width:40px}.sel-event>div{min-width:0}.sel-event>div>div{font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.legend{border-top:1px solid var(--divider-color,#ddd);margin-top:7px;padding-top:7px;display:flex;flex-wrap:wrap;gap:8px 12px;font-size:.72rem}.legend span{display:flex;align-items:center;gap:3px}.legend ha-icon{--mdc-icon-size:14px}.back{position:fixed;inset:0;background:#0008;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}.pop{position:relative;background:var(--card-background-color,#fff);color:var(--primary-text-color);border-radius:10px;padding:18px;width:320px;max-width:100%;max-height:90vh;overflow:auto}.pop button{position:absolute;right:7px;top:5px;border:0;background:none;color:var(--secondary-text-color);font-size:24px;cursor:pointer}.block h3{display:flex;align-items:center;gap:7px;margin:0 24px 8px 0;font-size:1rem}.block p{margin:4px 0;font-size:.82rem;color:var(--secondary-text-color);white-space:pre-wrap}@media(max-width:450px){ha-card{padding:8px}.day{min-height:48px;padding:2px}.event-icon ha-icon{--mdc-icon-size:15px}}`}
}

if(!customElements.get('ha-month-calendar-card'))customElements.define('ha-month-calendar-card',HaMonthCalendarCard);
window.customCards=window.customCards||[];
if(!window.customCards.some(x=>x.type==='ha-month-calendar-card'))window.customCards.push({type:'ha-month-calendar-card',name:'Month Calendar Card (braticks fork)',description:'Month calendar with plain icons and selected-day event list.',preview:false});
