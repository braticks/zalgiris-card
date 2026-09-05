const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../zalgiris-card.js'), 'utf8');
const context = vm.createContext({HTMLElement: class {}, customElements: {get() {}, define() {}}, window: {}, console});
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
