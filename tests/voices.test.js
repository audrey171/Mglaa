import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {INSTRUMENTS,MELODY_INSTRUMENTS,PAD_INSTRUMENTS,SAMPLE_BANKS,SAMPLE_ROOTS,InstrumentSampler} from '../voices.js';
test('32 selectable voices have complete sample banks or sustained pad engines',()=>{
 assert.equal(INSTRUMENTS.length,32);assert.equal(MELODY_INSTRUMENTS.length,16);assert.equal(PAD_INSTRUMENTS.length,16);assert.ok(PAD_INSTRUMENTS.every(p=>p.kind==='pad'));
 assert.equal(new Set(MELODY_INSTRUMENTS.map(p=>JSON.stringify(p))).size,16);assert.equal(new Set(PAD_INSTRUMENTS.map(p=>JSON.stringify(p))).size,16);
 for(const bank of SAMPLE_BANKS)for(const root of SAMPLE_ROOTS)assert.ok(existsSync(new URL(`../samples/${bank}-${root}.wav`,import.meta.url)));
});
test('every instrument starts a valid voice and polyphony remains bounded',()=>{
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
 const sources=[];const node=()=>({connect(){},disconnect(){},frequency:param(),gain:param(),Q:param(),pan:param(),detune:param(),playbackRate:param(),start(){this.started=true;},stop(){}});
 const source=()=>{const s=node();sources.push(s);return s;};
 const context={currentTime:0,createBiquadFilter:node,createGain:node,createStereoPanner:node,createBufferSource:source,createOscillator:source};
 const sampler=new InstrumentSampler(context,node(),node());
 for(const bank of SAMPLE_BANKS)for(const root of SAMPLE_ROOTS)sampler.buffers.set(`${bank}-${root}`,{duration:4});
 for(let instrument=0;instrument<32;instrument++)assert.equal(sampler.play(64,.7,.4,instrument),true);
 assert.equal(sampler.active.length,16);assert.ok(sources.every(s=>s.started));
 assert.equal(sources.length,14+18*2);
});

test('held pads sustain without scheduled endings and release smoothly on a chord change',()=>{
 const stops=[],ramps=[];
 const param=()=>({setValueAtTime(v,t){assert(Number.isFinite(t));},linearRampToValueAtTime(v,t){assert(Number.isFinite(t));},exponentialRampToValueAtTime(v,t){ramps.push(t);},cancelAndHoldAtTime(){},setTargetAtTime(v,t,constant){assert.equal(constant,.18);}});
 const node=()=>({connect(){},disconnect(){},frequency:{value:0},detune:{value:0},Q:{value:0},gain:param(),start(){},stop(time){stops.push(time);}});
 const context={currentTime:0,createBiquadFilter:node,createGain:node,createOscillator:node};
 const sampler=new InstrumentSampler(context,node(),null);
 for(const midi of [48,55,60,64])sampler.playPad(midi,.65,Infinity,PAD_INSTRUMENTS[0]);
 assert.equal(sampler.active.length,4);assert.equal(stops.length,0);assert.equal(ramps.length,0);
 context.currentTime=120;sampler.release();assert.equal(stops.length,8);assert(stops.every(t=>t===121));
 sampler.release();assert.equal(stops.length,8);
});

test('sampled melody and synthesized pads respect the shared scheduled clock',()=>{
 const starts=[];const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({connect(){},disconnect(){},frequency:param(),gain:param(),Q:param(),pan:param(),detune:param(),playbackRate:param(),start(t){starts.push(t);},stop(){}});
 const context={currentTime:5,createBiquadFilter:node,createGain:node,createStereoPanner:node,createBufferSource:node,createOscillator:node};
 const sampler=new InstrumentSampler(context,node(),null);sampler.buffers.set('ep-soft-60',{duration:4});sampler.play(60,.7,2,0,.5,5.125);sampler.playPad(48,.7,Infinity,PAD_INSTRUMENTS[0],5.125);
 assert.deepEqual(starts,[5.125,5.125,5.125]);
});
