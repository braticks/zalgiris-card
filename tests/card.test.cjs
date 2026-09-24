const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../zalgiris-card.js'), 'utf8');
const context = vm.createContext({HTMLElement: class { attachShadow() { this.shadowRoot = {innerHTML: '', addEventListener: (type, fn) => {this.click = fn;}}; } }, customElements: {get() {}, define() {}}, window: {}, console});
vm.runInContext(code, context);
test('partial and tied scores are not treated as finished', () => {
  context.game = {start: new Date(Date.now() - 600000).toISOString(), score_home: 50, score_away: 50};
  assert.equal(vm.runInContext('gameState(game)', context), 'IN');
});
test('explicit finished status and future games', () => {
  context.game = {status: 'finished'};
  assert.equal(vm.runInContext('gameState(game)', context), 'POST');
  context.game = {start: new Date(Date.now() + 600000).toISOString()};
  assert.equal(vm.runInContext('gameState(game)', context), 'PRE');
});
test('away game preserves home/away scores and identifies Zalgiris', () => {
  const sides = vm.runInContext('ZalgirisCard.prototype._sides({home:"Paris",away:"Žalgiris",score_home:70,score_away:80})', context);
  assert.equal(sides.left.name, 'Paris');
  assert.equal(sides.right.score, 80);
  assert.equal(sides.zalLeft, false);
});
test('league aliases are precise', () => {
  assert.equal(vm.runInContext('leagueKey("Lietuvos Krepšinio Lyga")', context), 'lkl');
  assert.equal(vm.runInContext('leagueKey("Euroleague")', context), 'eurolyga');
  assert.equal(vm.runInContext('leagueKey("EuroCup")', context), 'eurocup');
  assert.notEqual(vm.runInContext('leagueKey("Nacionalinė krepšinio lyga")', context), 'lkl');
});
test('league list and venue combine; missing team is not an away game', () => {
  const result = vm.runInContext(`filterGames([
    {league:'Euroleague',home:'Žalgiris',away:'Paris',id:1},
    {league:'LKL',home:'Rytas',away:'Žalgiris',id:2},
    {league:'LKL',home:'Rytas',id:3}, null
  ], ['eurolyga','lkl'], 'away')`, context);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});
test('defaults preserve appearance, card selections stay isolated and YAML resets them', () => {
  vm.runInContext(`globalThis.a = new ZalgirisCard(); globalThis.b = new ZalgirisCard();
    a.setConfig({entity:'sensor.games',show_filters:true});
    b.setConfig({entity:'sensor.games'});
    a.click({target:{closest:()=>({dataset:{filter:'venue',value:'home'}})}});`, context);
  assert.equal(vm.runInContext('a._selectedVenue', context), 'home');
  assert.equal(vm.runInContext('b._selectedVenue', context), 'all');
  assert.equal(vm.runInContext('b._config.show_filters', context), false);
  assert.equal(vm.runInContext('b._config.accent', context), 'time');
  vm.runInContext(`a.setConfig({entity:'sensor.games',venue:'away'})`, context);
  assert.equal(vm.runInContext('a._selectedVenue', context), 'away');
});
test('filters apply before main game selection to both arrays', () => {
  vm.runInContext(`globalThis.c = new ZalgirisCard();
    c.setConfig({entity:'sensor.games',league:'lkl',venue:'home',accent:'date',show_filters:true});
    c.hass = {states:{'sensor.games':{attributes:{
      upcoming:[{game_id:1,home:'Žalgiris',away:'EXCLUDED',league:'Euroleague'},
                {game_id:2,home:'Žalgiris',away:'INCLUDED',league:'LKL'}],
      finished:[{game_id:3,home:'Žalgiris',away:'LIVE_EXCLUDED',league:'Euroleague',is_live:true}]
    }}}};`, context);
  const html = vm.runInContext('c.shadowRoot.innerHTML', context);
  assert.ok(html.includes('INCLUDED'));
  assert.ok(!html.includes('EXCLUDED'));
  assert.ok(html.includes('class="accent-date"'));
  assert.ok(html.includes('aria-pressed="true"'));
});
