import {WEAVES} from './weave-library.js?v=library-3';
export {WEAVES};
// Shaft 1 is the bottom draft row. Each pick lists the lowered shafts.
export const CUSTOM={id:'custom',name:'Custom',instruments:[0,16],threading:Array.from({length:32},(_,i)=>i%4),picks:Array.from({length:32},(_,i)=>[i%4,(i+1)%4])};
export function updateCustom(column,shaft){CUSTOM.threading[column]=shaft;CUSTOM.picks=CUSTOM.threading.map(s=>[s,(s+1)%4]);}
export const getWeave=id=>id==='custom'?CUSTOM:(WEAVES.find(p=>p.id===id)??WEAVES.find(p=>p.id==='flanders'));
const mod=(value,length)=>((value%length)+length)%length;
export function patternRow(id,row,width){
 const preset=getWeave(id);
 const down=preset.picks[mod(row,preset.picks.length)];
 return Array.from({length:width},(_,x)=>down.includes(preset.threading[x%preset.threading.length]));
}
export function weaveRow(id,row,colors,width){
 const preset=getWeave(id);
 const down=preset.picks[mod(row,preset.picks.length)];
 // Apply the book's Dimes and Dollars color grouping to all four drafts:
 // 1–2 / 3–4 share one pattern color; 1–4 and 2–3 each have their own.
 // The fourth color supplies the ground, preserving the motif's negative space.
 const pair=down.map(n=>n+1).join('');
 const weft=colors[pair==='14'?2:pair==='23'?3:1];
 return patternRow(id,row,width).map(over=>over?weft:colors[0]);
}
