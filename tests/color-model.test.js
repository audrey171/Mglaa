import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeHex,hslToHex,hexToHsl,colorSong,paletteSong,patternSong,colorLoop,textileRow,STEP} from '../color-model.js';
test('hex parsing is strict and color conversion round trips',()=>{
 assert.equal(normalizeHex(' 7b80d4 '),'#7B80D4');assert.equal(normalizeHex('#GGGGGG'),null);
 for(const hex of ['#000000','#FFFFFF','#7B80D4','#FF0000','#15E3A4']){const {h,s,l}=hexToHsl(hex);assert.equal(hslToHex(h,s,l),hex);}
});
test('each color has a deterministic phrase and notes match its pad',()=>{
 for(let hue=0;hue<360;hue+=15)for(const s of [0,.2,.6,1])for(const l of [0,.2,.5,.8,1]){
  const song=colorSong(hslToHex(hue,s,l));assert.deepEqual(song,colorSong(song.hex));assert(song.events.length>=4);
  for(const e of song.events){assert(e.step>=0&&e.step<16);assert(e.midi>=48&&e.midi<=95);assert(song.pad.some(n=>n%12===e.midi%12));}
 }
 assert.equal(STEP,60/84/2);
});
test('lightness shifts register while a fixed color retains its phrase',()=>{
 const low=colorSong(hslToHex(240,.6,.2)),high=colorSong(hslToHex(240,.6,.8));
 assert.equal(low.chordId,high.chordId);assert(high.events[0].midi>low.events[0].midi);
});

test('four colors form one deterministic tune with a shared harmony',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'];
 for(const palette of [colors,['#000000','#FFFFFF','#000000','#FFFFFF'],Array(4).fill('#7B80D4')]){
  const song=paletteSong(palette);assert.deepEqual(song,paletteSong(palette));
  assert.equal(new Set(song.events.map(e=>e.slot)).size,4);
  assert.equal(new Set(song.events.map(e=>e.step)).size,song.events.length);
  for(const e of song.events){assert(song.pad.some(n=>n%12===e.midi%12));assert.equal(e.hex,palette[e.slot]);assert(e.midi>=48&&e.midi<=88);}
 }
 const base=paletteSong(colors);
 for(let i=0;i<4;i++){const changed=[...colors];changed[i]='#193F8A';assert.notDeepEqual(paletteSong(changed).events,base.events);}
 assert.throws(()=>paletteSong(colors.slice(0,3)));
});

test('textile rows retain past palettes when the current colors change',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'],oldSong=paletteSong(colors);
 const oldRows=Array.from({length:16},(_,step)=>textileRow(oldSong,step,80));
 colors[0]='#FF2200';const newSong=paletteSong(colors);
 assert.deepEqual(Array.from({length:16},(_,step)=>textileRow(oldSong,step,80)),oldRows);
 assert.notDeepEqual(textileRow(newSong,0,80),oldRows[0]);
 for(const row of oldRows){assert.equal(row.length,80);assert(row.every(color=>color===null||oldSong.colors.includes(color)));}
});

test('drawing controls melody gates and pitch without changing harmony or timing',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'],blank=()=>Array.from({length:8},()=>Array(64).fill(0));
 assert.deepEqual(patternSong(colors,blank()),paletteSong(colors));
 const low=blank();low[7][0]=1;low[7][20]=1;
 const lowSong=patternSong(colors,low);assert.deepEqual(lowSong.events.map(e=>e.step),[0,5]);
 const high=blank();high[0][0]=1;high[0][20]=1;
 const highSong=patternSong(colors,high);assert(highSong.events[0].midi>lowSong.events[0].midi);
 assert.deepEqual(highSong.pad,lowSong.pad);assert(highSong.events.every(e=>highSong.pad.some(n=>n%12===e.midi%12)));
 const old=JSON.stringify(lowSong);low[7][0]=0;assert.equal(JSON.stringify(lowSong),old);
});

test('paint colors select their own voices and survive into textile history',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'],pattern=Array.from({length:8},()=>Array(64).fill(0));
 for(let slot=0;slot<4;slot++)pattern[slot][0]=slot+1;
 const song=patternSong(colors,pattern);assert.deepEqual(song.events.map(e=>e.slot),[0,1,2,3]);
 assert(song.events.every(e=>e.step<1&&e.hex===colors[e.slot]));
 const visible=new Set(Array.from({length:16},(_,step)=>textileRow(song,step,128)).flat().filter(Boolean));assert.equal(visible.size,4);
 const before=JSON.stringify(song);colors[0]='#FF0000';assert.equal(JSON.stringify(song),before);
});

test('confirmed loop lengths crop drawn columns and bound all scheduled notes',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'],pattern=Array.from({length:8},()=>Array(68).fill(0));
 pattern[1][0]=1;pattern[3][7]=2;pattern[6][30]=3;
 for(const length of [1,8,32,68]){const song=patternSong(colors,pattern,length);assert.equal(song.length,length);assert(song.events.every(e=>e.step<length));assert.deepEqual(song.events.map(e=>Math.floor(e.step)),[0,7,30].filter(x=>x<length));}
 const blank=pattern.map(row=>row.map(()=>0));assert.equal(patternSong(colors,blank,68).length,68);assert(patternSong(colors,blank,68).events.some(e=>e.step>16));
});

test('color-only loops repeat or truncate the base phrase without drawing input',()=>{
 const colors=['#7B80D4','#E5B17D','#85B6A3','#B96B83'],base=paletteSong(colors);
 for(const length of [1,8,16,68]){
  const song=colorLoop(colors,length);assert.equal(song.length,length);
  assert.deepEqual(song.events.filter(e=>e.step<16),base.events.filter(e=>e.step<length));
  for(const event of song.events){assert(event.step<length);assert.equal(event.midi,base.events.find(e=>e.step===event.step%16).midi);}
 }
});

test('two textile colors alternate notes in one shared harmony',()=>{
 for(const colors of [['#000000','#FFFFFF'],['#183B35','#F1D6AD'],['#7B80D4','#7B80D4']]){
  const song=paletteSong(colors);
  assert.deepEqual(song,paletteSong(colors));
  assert.deepEqual(song.colors,colors);
  assert.deepEqual([...new Set(song.events.map(e=>e.slot))],[0,1]);
  for(const event of song.events){
   assert.equal(event.slot,event.step%2);
   assert.equal(event.hex,colors[event.slot]);
   assert(song.pad.some(n=>n%12===event.midi%12));
   assert(event.midi>=48&&event.midi<=88);
  }
  const loop=colorLoop(colors,37);
  assert(loop.events.every(e=>e.step<37&&e.slot===e.step%2));
  assert.deepEqual(loop.events.filter(e=>e.step<16),song.events);
 }
 const colors=['#183B35','#F1D6AD'],base=paletteSong(colors);
 for(let slot=0;slot<2;slot++){
  const changed=[...colors];changed[slot]='#3248BE';const next=paletteSong(changed);
  assert.notDeepEqual(next.events.map(e=>[e.step,e.midi]),base.events.map(e=>[e.step,e.midi]));
 }
});
