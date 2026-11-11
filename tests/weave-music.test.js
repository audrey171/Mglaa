import test from 'node:test';
import assert from 'node:assert/strict';
import {weaveLoop} from '../color-model.js';
import {WEAVES,CUSTOM,updateCustom} from '../weave-presets.js';
const colors=['#6D2A49','#EDDCA5'];
test('all drafts produce soft melodies fitted to their shared pad chord',()=>{
 for(const draft of WEAVES){const song=weaveLoop(colors,draft,96);assert.equal(song.length,96);assert.ok(song.events.length>0);const classes=song.pad.map(n=>n%12);for(const e of song.events){assert.ok(classes.includes(e.midi%12),draft.name);assert.ok(e.level<=.85);assert.ok(e.step>=0&&e.step<96);}}
});
test('pattern and palette each independently affect the next phrase',()=>{
 const song=weaveLoop(colors,WEAVES[0],96);assert.notDeepEqual(song.events,weaveLoop(colors,WEAVES[1],96).events);assert.notDeepEqual(song.events,weaveLoop(['#224E60','#C6DFD6'],WEAVES[0],96).events);
 const before=weaveLoop(colors,CUSTOM,32),shaft=CUSTOM.threading[0];updateCustom(0,3);assert.notDeepEqual(before.events,weaveLoop(colors,CUSTOM,32).events);updateCustom(0,shaft);
});
