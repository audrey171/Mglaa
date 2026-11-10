export const BPM=84,STEP=60/BPM/2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function normalizeHex(value){const hex=value.trim().replace(/^#/,'');return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toUpperCase():null;}
export function hslToHex(h,s,l){
 h=((h%360)+360)%360;s=clamp(s,0,1);l=clamp(l,0,1);
 const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function hexToHsl(hex){
 const values=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),[r,g,b]=values,max=Math.max(...values),min=Math.min(...values),d=max-min,l=(max+min)/2;
 let h=0;if(d)h=max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
 return {h:(h+360)%360,s:d?d/(1-Math.abs(2*l-1)):0,l};
}
export function colorSong(value){
 const hex=normalizeHex(value);if(!hex)throw new Error('Use a six-digit hex color.');
 const {h,s,l}=hexToHsl(hex),sector=Math.floor(h/30)%12,pc=(sector*7)%12,root=36+pc;
 const minor=s<.3,intervals=minor?[0,3,7,10]:[0,4,7,11],nibbles=[...hex.slice(1)].map(v=>parseInt(v,16));
 const pad=[root,root+7,root+intervals[3],root+12+intervals[1]],register=12+12*Math.round(l*2),events=[];
 for(let step=0;step<16;step++){
  const digit=nibbles[step%6],threshold=(nibbles[(step+3)%6]+(step%3)*3)%16;
  if(step%4!==0&&threshold/16>.12+.68*s)continue;
  const degree=step%8===0?0:Math.round(digit/15*3),midi=root+register+intervals[degree];
  events.push({step,midi,level:(step%4===0?1:.7)*(midi>76?.65:1)});
 }
 const name=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][pc]+(minor?'m7':'maj7');
 return {hex,h,s,l,pad,name,chordId:pc+':'+minor,events};
}

export function paletteSong(colors){
 if(![2,4].includes(colors.length))throw new Error('Choose two or four colors.');
 const parts=colors.map(colorSong);
 let x=0,y=0;
 for(const part of parts){x+=Math.cos(part.h*Math.PI/180)*part.s;y+=Math.sin(part.h*Math.PI/180)*part.s;}
 const h=Math.hypot(x,y)<.000001?parts[0].h:(Math.atan2(y,x)*180/Math.PI+360)%360;
 const average=key=>parts.reduce((sum,p)=>sum+p[key],0)/parts.length;
 const harmony=colorSong(hslToHex(h,average('s'),average('l'))),classes=new Set(harmony.pad.map(n=>n%12));
 const pitches=Array.from({length:41},(_,i)=>48+i).filter(n=>classes.has(n%12));
 const events=[];
 for(let step=0;step<16;step++){
  const slot=step%parts.length,part=parts[slot],turn=Math.floor(step/parts.length),digits=[...part.hex.slice(1)].map(c=>parseInt(c,16));
  if(turn>0&&digits[(turn+slot)%6]/15>.3+.7*part.s)continue;
  const target=part.events[(turn+slot)%part.events.length].midi;
  const midi=pitches.reduce((best,n)=>Math.abs(n-target)<Math.abs(best-target)?n:best);
  events.push({step,midi,slot,hex:part.hex,level:(turn===0?.85:.68)*(midi>76?.65:1)});
 }
 return {...harmony,colors:parts.map(p=>p.hex),id:parts.map(p=>p.hex).join('/'),events};
}

// A sounding step becomes a repeatable textile row. Each event keeps its own color.
export function textileRow(song,step,width){
 const notes=new Map();for(const event of song.events){const key=Math.floor(event.step);if(!notes.has(key))notes.set(key,[]);notes.get(key).push(event);}
 return Array.from({length:width},(_,x)=>{
  const length=song.length??16,repeat=Math.floor(x/length),phase=((x+step+(repeat%2?length-step*2:0))%length+length)%length;
  const group=notes.get(phase);if(!group)return null;const note=group[(repeat+step)%group.length];
  return (note.midi+step+repeat)%5===0?null:note.hex;
 });
}

export function patternSong(colors,pattern,loopLength=null){
 const song=paletteSong(colors),length=loopLength??16;
 if(!pattern.some(row=>row.some(Boolean))){
  if(loopLength===null)return song;
  const events=[];for(let step=0;step<length;step++){const event=song.events.find(e=>e.step===step%16);if(event)events.push({...event,step});}
  return {...song,length,events,id:song.id+'|length:'+length};
 }
 const width=pattern[0].length,classes=new Set(song.pad.map(n=>n%12));
 const pitches=Array.from({length:41},(_,i)=>48+i).filter(n=>classes.has(n%12)),events=[];
 for(let step=0;step<length;step++){
  const groups=Array.from({length:4},()=>({ink:0,height:0}));
  for(let x=loopLength===null?Math.floor(step*width/16):step;x<(loopLength===null?Math.floor((step+1)*width/16):step+1);x++)for(let y=0;y<pattern.length;y++){
   const value=pattern[y][x];if(value>=1&&value<=4){groups[value-1].ink++;groups[value-1].height+=y;}
  }
  const voices=groups.filter(g=>g.ink).length;let order=0;
  groups.forEach((group,slot)=>{
   if(!group.ink)return;
   const part=colorSong(colors[slot]),target=60+(7-group.height/group.ink)*3+(part.l-.5)*12;
   const midi=pitches.reduce((best,n)=>Math.abs(n-target)<Math.abs(best-target)?n:best);
   events.push({step:step+order++*.15,midi,slot,hex:part.hex,level:(step%4===0?.85:.68)*(midi>76?.65:1)/Math.sqrt(voices)});
  });
 }
 return {...song,length,events,id:song.id+'|length:'+length+'|'+pattern.map(row=>row.join('')).join('/')};
}


export function colorLoop(colors,length){
 const song=paletteSong(colors),events=[];
 for(let step=0;step<length;step++){const event=song.events.find(e=>e.step===step%16);if(event)events.push({...event,step});}
 return {...song,length,events,id:song.id+'|length:'+length};
}

// Read the same threading and harness sequence that produces the visible cloth.
// Geometry moves through chord tones, never outside the palette's harmony.
export function weaveLoop(colors,draft,length){
 const song=colorLoop(colors,length),classes=new Set(song.pad.map(n=>n%12));
 const pitches=Array.from({length:37},(_,i)=>45+i).filter(n=>classes.has(n%12));
 const events=song.events.map(event=>{
  const shaft=draft.threading[event.step%draft.threading.length];
  const down=draft.picks[event.step%draft.picks.length];
  const base=pitches.reduce((best,n,i)=>Math.abs(n-event.midi)<Math.abs(pitches[best]-event.midi)?i:best,0);
  const offset=shaft-1+(down[1]-down[0]>1?1:0);
  const midi=pitches[clamp(base+offset,0,pitches.length-1)];
  return {...event,midi,level:event.level*(down.includes(shaft)?.8:.6)};
 });
 return {...song,events,id:song.id+'|draft:'+draft.id+':'+draft.threading.join('')+':'+draft.picks.map(p=>p.join('')).join('.')};
}
