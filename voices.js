// 24 variations of CC0 DX7-emulated recordings, plus eight synthesized pads.
// The same selected instrument is used for every letter.
const sample=(bank,cutoff,attack,release,gain=.75,octave=0)=>({bank,cutoff,attack,release,gain,octave,pan:0});
const pad=(wave,cutoff,attack,release,detune,gain=.11)=>({kind:'pad',wave,cutoff,attack,release,detune,gain,octave:-12});
const palette=[
 sample('ep-soft',4600,.012,1.5,.85),sample('ep-soft',1800,.04,1.9,.9),sample('ep-soft',7800,.005,.7,.78),sample('ep-soft',3200,.08,2.2,.85,-12),
 sample('ep-classic',5200,.008,1.3,.78),sample('ep-classic',2600,.025,1.8,.85),sample('ep-classic',9000,.005,.55,.7),sample('ep-classic',4400,.06,2,.8,-12),
 sample('ep-bright',7000,.012,1.3,.78),sample('ep-bright',3600,.025,1.8,.82),sample('ep-bright',11500,.005,.5,.65),sample('ep-bright',5200,.08,2.1,.78,-12),
 sample('crystal',6800,.012,1.6,.65),sample('crystal',2600,.08,2.1,.78),sample('crystal',12500,.005,.6,.56),sample('crystal',4400,.1,2.4,.74,-12),
 sample('brass',2800,.025,.85,.6),sample('brass',1300,.12,1.8,.7),sample('brass',6200,.008,.5,.52),sample('brass',3600,.07,1.9,.62,-12),
 sample('ep-classic',7500,.004,.3,.7),sample('ep-bright',8500,.004,.35,.68),sample('crystal',9000,.005,.35,.6),sample('brass',5000,.005,.3,.52),
 pad('triangle',650,.3,2.4,4),pad('sawtooth',900,.38,2.8,7,.08),pad('sine',1800,.18,2.2,3,.14),pad('triangle',2300,.5,3.2,12,.1),
 pad('sawtooth',1600,.22,2.3,5,.07),pad('triangle',420,.45,3.5,2,.13),pad('sine',3200,.08,1.8,0,.13),pad('sawtooth',700,.65,4,15,.08)
];
// Voice indices 0–15 select melody; 16–31 select sustained backing pads.
export const MELODY_INSTRUMENTS=[0,4,8,12,1,5,9,13,16,17,18,19,20,22,24,27].map(i=>palette[i]);
export const PAD_INSTRUMENTS=[...palette.slice(24),
 pad('triangle',1100,.12,1.7,6,.1),pad('sawtooth',450,.55,3.2,9,.10),pad('sine',900,.4,3.8,8,.14),pad('triangle',3800,.2,2.1,3,.08),
 pad('sawtooth',2800,.35,2.7,10,.06),pad('triangle',800,.7,4.2,18,.11),pad('sine',2400,.025,1.4,1,.12),pad('sawtooth',1200,.08,1.9,4,.07)
];
export const INSTRUMENTS=[...MELODY_INSTRUMENTS,...PAD_INSTRUMENTS];
export const SAMPLE_BANKS=[...new Set(INSTRUMENTS.filter(p=>p.bank).map(p=>p.bank))];
export const SAMPLE_ROOTS=[48,60,72,84];
export const voiceFor=instrument=>INSTRUMENTS[instrument]||INSTRUMENTS[0];
export function rootFor(midi){return SAMPLE_ROOTS.reduce((best,n)=>Math.abs(n-midi)<Math.abs(best-midi)?n:best);}

export class InstrumentSampler{
 constructor(context,output,delay,{soften=false}={}){this.soften=soften;this.context=context;this.output=output;this.delay=delay;this.buffers=new Map();this.active=[];this.ready=false;this.loadPromise=null;}
 load(){
  if(this.loadPromise)return this.loadPromise;
  this.loadPromise=Promise.allSettled(SAMPLE_BANKS.flatMap(bank=>SAMPLE_ROOTS.map(async root=>{
   const response=await fetch(new URL(`samples/${bank}-${root}.wav`,import.meta.url));
   if(!response.ok)throw new Error(`Sample ${bank}-${root}: ${response.status}`);
   const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
   this.buffers.set(`${bank}-${root}`,buffer);
  }))).then(results=>{
   this.ready=true;
   const failed=results.filter(r=>r.status==='rejected');
   if(failed.length)console.warn('Some instrument samples could not load; synthesis is available as fallback.',failed.map(r=>String(r.reason)));
   return {loaded:this.buffers.size,total:SAMPLE_BANKS.length*SAMPLE_ROOTS.length};
  });
  return this.loadPromise;
 }
 release(){for(const voice of [...this.active])voice.stop(this.context.currentTime);}
 playPad(midi,accent,duration,patch,time=this.context.currentTime){
  const context=this.context,now=time;
  if(this.active.length>=16)this.active.shift().stop(now);
  const filter=context.createBiquadFilter(),env=context.createGain();
  filter.type='lowpass';filter.frequency.value=patch.cutoff;filter.Q.value=.35;
  filter.connect(env);env.connect(this.output);if(this.delay)env.connect(this.delay);
  const sustained=duration===Infinity,length=sustained?Infinity:Math.max(1.6,duration+patch.release),attack=sustained?patch.attack:Math.min(patch.attack,length*.3);
  env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(patch.gain*(.6+accent*.4),now+attack);
  if(!sustained){env.gain.setValueAtTime(patch.gain*(.6+accent*.4),now+length*.45);env.gain.exponentialRampToValueAtTime(.001,now+length);}
  const oscillators=[-1,1].map(direction=>{
   const oscillator=context.createOscillator();oscillator.type=patch.wave;
   oscillator.frequency.value=440*2**((midi-69)/12);oscillator.detune.value=direction*patch.detune;
   oscillator.connect(filter);oscillator.start(now);if(!sustained)oscillator.stop(now+length+.03);return oscillator;
  });
  let stopping=false;
  const voice={stop(time){if(stopping)return;stopping=true;if(env.gain.cancelAndHoldAtTime)env.gain.cancelAndHoldAtTime(time);else env.gain.cancelScheduledValues(time);env.gain.setTargetAtTime(.001,time,sustained?.18:.025);oscillators.forEach(o=>o.stop(time+(sustained?1:.1)));}};
  this.active.push(voice);
  oscillators[0].onended=()=>{this.active=this.active.filter(v=>v!==voice);oscillators.forEach(o=>o.disconnect());filter.disconnect();env.disconnect();};
  return true;
 }
 play(midi,accent,duration,instrument=0,level=1,time=this.context.currentTime){
  const patch=voiceFor(instrument);
  midi+=patch.octave||0;
  if(patch.kind==='pad')return this.playPad(midi,accent,duration,{...patch,gain:patch.gain*level},time);
  const root=rootFor(midi),buffer=this.buffers.get(`${patch.bank}-${root}`);
  if(!buffer)return false;
  const context=this.context,now=time;
  // Bound overlapping tails even for the shortest phrase and longest input.
  if(this.active.length>=16){const oldest=this.active.shift();oldest.stop(now);}
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain(),pan=context.createStereoPanner();
  source.buffer=buffer;source.playbackRate.value=2**((midi-root)/12);
  filter.type='lowpass';filter.frequency.value=patch.cutoff;filter.Q.value=.45;pan.pan.value=patch.pan;
  source.connect(filter);filter.connect(envelope);envelope.connect(pan);pan.connect(this.output);if(this.delay)pan.connect(this.delay);
  const end=Math.min(duration*patch.release/1.3,buffer.duration/source.playbackRate.value-.025);
  const length=Math.max(.09,end),attack=Math.min(Math.max(patch.attack,.22*(typeof this.soften==='number'?this.soften:this.soften?1:0)),length*.25);
  envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(patch.gain*(.55+accent*.45)*level,now+attack);
  envelope.gain.exponentialRampToValueAtTime(.001,now+length);
  source.start(now);source.stop(now+length+.025);
  const voice={stop(time){if(envelope.gain.cancelAndHoldAtTime)envelope.gain.cancelAndHoldAtTime(time);else envelope.gain.cancelScheduledValues(time);envelope.gain.setTargetAtTime(.001,time,.025);source.stop(time+.1);}};
  this.active.push(voice);
  source.onended=()=>{this.active=this.active.filter(s=>s!==voice);source.disconnect();filter.disconnect();envelope.disconnect();pan.disconnect();};
  return true;
 }
}
