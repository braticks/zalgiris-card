const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/braticks-cards.js'), 'utf8');
async function run(existing = [], fail = '') {
 const loaded = [], errors = [];
 const context = vm.createContext({URL, customElements:{get:n=>existing.includes(n)}, console:{error:(...args)=>errors.push(args)}});
 const entry = new vm.SourceTextModule(source, {context, initializeImportMeta:meta=>{meta.url='https://ha.test/hacsfiles/braticks-cards/braticks-cards.js';}, importModuleDynamically:async url=>{
  loaded.push(url);
  if(url.endsWith(fail) && fail) throw new Error('simulated failure');
  assert.ok(fs.existsSync(path.join(__dirname,'../dist',new URL(url).pathname.split('/').pop())));
  const mod=new vm.SyntheticModule([],()=>{},{context}); await mod.link(()=>{}); await mod.evaluate(); return mod;
 }});
 await entry.link(()=>{}); await entry.evaluate(); return {loaded,errors};
}
(async()=>{
 const all=await run(); assert.equal(all.loaded.length,6); assert.equal(all.errors.length,0);
 assert.ok(all.loaded.some(u=>u.endsWith('/ha-month-calendar-card-ui.js')));
 const skip=await run(['euroleague-standings-card','lkl-standings-card']); assert.equal(skip.loaded.length,4);
 const broken=await run([],'zalgiris-card.js'); assert.equal(broken.loaded.length,6); assert.equal(broken.errors.length,1);
 const done=await run(['ha-lithuanian-date-card','zalgiris-card','euroleague-standings-card','lkl-standings-card','ha-month-calendar-card-editor','threedy-card']); assert.equal(done.loaded.length,0);
 console.log('Loader checks passed: six cards, editor, existing cards, isolated failure, repeat load.');
})().catch(e=>{console.error(e);process.exit(1)});
