import {InstrumentSampler,voiceFor} from './voices.js?v=softness-1';
export class ColorAudio{
 constructor(){this.context=null;this.sources=new Set();this.pads=[];this.chordId=null;this.volume=.55;this.softness=1;this.melodyInstrument=0;this.padInstrument=16;this.currentSong=null;}
 async start(){
  if(!this.context){
   const c=this.context=new AudioContext();this.master=c.createGain();this.master.gain.value=0;
   const limiter=c.createDynamicsCompressor();limiter.threshold.value=-19;limiter.knee.value=20;limiter.ratio.value=3;this.master.connect(limiter);limiter.connect(c.destination);
   this.delay=c.createDelay(1);this.delay.delayTime.value=.5357;const feedback=c.createGain(),wet=c.createGain(),filter=c.createBiquadFilter();feedback.gain.value=.17;wet.gain.value=.12;filter.type='lowpass';filter.frequency.value=1100;
   this.melodyTone=c.createBiquadFilter();this.melodyTone.type='lowpass';this.melodyTone.frequency.value=6500-5400*this.softness;
   const melodyGain=c.createGain();melodyGain.gain.value=.18;this.melodyTone.connect(melodyGain);melodyGain.connect(this.master);melodyGain.connect(this.delay);
   this.sampler=new InstrumentSampler(c,this.melodyTone,null,{soften:this.softness});this.padSampler=new InstrumentSampler(c,this.master,null);
   this.sampleLoad=this.sampler.load();
   this.delay.connect(filter);filter.connect(feedback);feedback.connect(this.delay);filter.connect(wet);wet.connect(this.master);
  }
  await this.context.resume();this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.12);
 }
 voice(midi,time,level,pad=false){
  const c=this.context,filter=c.createBiquadFilter(),env=c.createGain(),blend=c.createGain(),a=c.createOscillator(),b=c.createOscillator();
  filter.type='lowpass';filter.frequency.value=pad?2400-1750*this.softness:6500-5400*this.softness;filter.Q.value=.2;a.type='sine';b.type='triangle';blend.gain.value=.22-.15*this.softness;
  a.frequency.value=b.frequency.value=440*2**((midi-69)/12);a.detune.value=-2;b.detune.value=2;a.connect(filter);b.connect(blend);blend.connect(filter);filter.connect(env);env.connect(this.master);if(!pad)env.connect(this.delay);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+(pad?.12+1.08*this.softness:.008+.212*this.softness));
  if(!pad)env.gain.exponentialRampToValueAtTime(.0001,time+2.1);
  const voice={stopped:false,stop:(when,tail=.8)=>{if(voice.stopped)return;voice.stopped=true;if(env.gain.cancelAndHoldAtTime)env.gain.cancelAndHoldAtTime(when);else env.gain.cancelScheduledValues(when);env.gain.setTargetAtTime(.0001,when,tail/5);a.stop(when+tail);b.stop(when+tail);}};
  this.sources.add(voice);a.start(time);b.start(time);if(!pad){a.stop(time+2.2);b.stop(time+2.2);}
  a.onended=()=>{this.sources.delete(voice);for(const n of [a,b,blend,filter,env])n.disconnect();};return voice;
 }
 selectInstrument(index){
  if(!Number.isInteger(index)||index<0||index>31)return;
  if(index<16)this.melodyInstrument=index;
  else {this.padInstrument=index;if(this.context&&this.currentSong)this.chord(this.currentSong,this.context.currentTime+.02);}
 }
 chord(song,time){
  this.currentSong=song;const id=song.chordId+':'+this.padInstrument;if(id===this.chordId)return;
  this.pads.forEach(v=>v.stop(time,1.3));this.pads=[];
  for(const v of [...this.padSampler.active])v.stop(time);
  if(this.padInstrument===16)this.pads=song.pad.map(midi=>this.voice(midi,time,.025,true));
  else {const p=voiceFor(this.padInstrument);for(const midi of song.pad)this.padSampler.playPad(midi,.65,Infinity,{...p,attack:Math.max(.08+.72*this.softness,p.attack),cutoff:Math.min(6000-4500*this.softness,p.cutoff),gain:p.gain*.18},time);}
  this.chordId=id;
 }
 note(event,time){
  if(this.melodyInstrument!==0&&this.sampler.play(event.midi,.65,2.1,this.melodyInstrument,event.level,time))return;
  this.voice(event.midi,time,.045*event.level);
 }
 stop(){if(!this.context)return;const now=this.context.currentTime;this.master.gain.setTargetAtTime(0,now,.06);this.sources.forEach(v=>v.stop(now,.3));this.pads=[];this.chordId=null;this.currentSong=null;this.sampler?.release();this.padSampler?.release();}
 setVolume(value){this.volume=value;if(this.context)this.master.gain.setTargetAtTime(value,this.context.currentTime,.1);}
 setSoftness(value){
  if(!Number.isFinite(value))return;
  this.softness=Math.max(0,Math.min(1,value));
  if(!this.context)return;
  this.sampler.soften=this.softness;
  this.melodyTone.frequency.setTargetAtTime(6500-5400*this.softness,this.context.currentTime,.08);
  if(this.currentSong){this.chordId=null;this.chord(this.currentSong,this.context.currentTime+.02);}
 }
}
