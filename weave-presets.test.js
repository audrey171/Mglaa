import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAVES,patternRow,weaveRow,CUSTOM,updateCustom} from './weave-presets.js';

test('source A repeats keep the original square motif proportions',()=>{
 assert.deepEqual(['flanders','pond','dimes','chariot'].map(id=>WEAVES.find(p=>p.id===id)).map(p=>[p.id,p.threading.length,p.picks.length]),[
  ['flanders',38,38],['pond',36,36],['dimes',26,26],['chariot',32,32]
 ]);
});
test('first eight crossings agree with the scan, using bottom-up shaft numbering',()=>{
 const sourceRows={flanders:'10000101',pond:'00010001',dimes:'10111001',chariot:'10011011'};
 for(const [id,expected] of Object.entries(sourceRows))assert.equal(patternRow(id,0,8).map(Number).join(''),expected,id);
});
test('repeat boundaries join exactly, including rows arriving above zero',()=>{
 for(const p of WEAVES){
  const width=p.threading.length;
  assert.deepEqual(patternRow(p.id,-1,width),patternRow(p.id,p.picks.length-1,width));
  assert.deepEqual(patternRow(p.id,0,width*2),[...patternRow(p.id,0,width),...patternRow(p.id,0,width)]);
  assert.deepEqual(patternRow(p.id,p.picks.length,width),patternRow(p.id,0,width));
 }
});
test('four colors recolor the source mask without introducing extra pattern cells',()=>{
 const palette=['#fff','#000','#123456','#abcdef'];
 for(const p of WEAVES){
  const seen=new Set();
  for(let r=0;r<p.picks.length;r++){
   const bits=patternRow(p.id,r,p.threading.length),colors=weaveRow(p.id,r,palette,p.threading.length);
   colors.forEach((c,x)=>{seen.add(c);assert.equal(c!==palette[0],bits[x]);});
  }
  assert.equal(seen.size,4,p.id);
 }
});

test('both books contain every named pattern with a distinct default palette',()=>{
 assert.equal(WEAVES.length,48);assert.equal(new Set(WEAVES.map(p=>p.id)).size,48);assert.equal(new Set(WEAVES.map(p=>p.colors.join('/'))).size,48);
 for(const book of [1,2])assert.deepEqual(WEAVES.filter(p=>p.book===book).map(p=>p.page),Array.from({length:24},(_,i)=>i+1));
 for(const p of WEAVES){assert.equal(p.threading.length,p.picks.length,p.name);assert.ok(p.threading.every(n=>Number.isInteger(n)&&n>=0&&n<4),p.name);assert.ok(p.picks.every(pair=>pair.length===2&&new Set(pair).size===2&&pair.every(n=>n>=0&&n<4)),p.name);assert.ok(p.colors.every(c=>/^#[0-9A-F]{6}$/.test(c)));}
});
test('custom draft edits alter the cloth at the edited crossing',()=>{
 const prior=CUSTOM.threading[0],before=patternRow('custom',1,32);updateCustom(0,1);assert.notDeepEqual(patternRow('custom',1,32),before);updateCustom(0,prior);
});
