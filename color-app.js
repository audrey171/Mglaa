import {WEAVES,patternRow,getWeave,updateCustom} from './weave-presets.js?v=library-3';
import {colorSong,paletteSong,hslToHex,normalizeHex,colorLoop,weaveLoop,STEP} from './color-model.js?v=library-3';
import {ColorAudio} from './color-audio.js?v=background-1';
import {readSettings} from './settings.js?v=color-speed-1';
import {PatternTimeline,snapshotRow} from './timeline.js?v=recorded-1';
const field=document.querySelector('#color-field'),score=document.querySelector('#score'),sat=document.querySelector('#saturation'),playButton=document.querySelector('#play'),status=document.querySelector('#status'),sound=new ColorAudio(),paletteDialog=document.querySelector('#palette-dialog');
const randomWeave=()=>WEAVES[Math.floor(Math.random()*WEAVES.length)].id;
function readSession(){
 try {
  const state=JSON.parse(sessionStorage.getItem('mglaa-instrument-session')||'{}');
  const ids=new Set([...WEAVES.map(p=>p.id),'custom']);
  const palettes=(state.palettes??[]).filter(([id,colors])=>ids.has(id)&&Array.isArray(colors)&&colors.length===2&&colors.every(c=>typeof c==='string'&&normalizeHex(c)));
  const instruments=(state.instruments??[]).filter(([id,pair])=>ids.has(id)&&Array.isArray(pair)&&pair.length===2&&Number.isInteger(pair[0])&&pair[0]>=0&&pair[0]<16&&Number.isInteger(pair[1])&&pair[1]>=16&&pair[1]<32);
  if(Array.isArray(state.custom)&&state.custom.length===32&&state.custom.every(n=>Number.isInteger(n)&&n>=0&&n<4))state.custom.forEach((shaft,column)=>updateCustom(column,shaft));
  return {weave:ids.has(state.weave)?state.weave:randomWeave(),palettes,instruments,timeline:state.timeline,visualRow:state.visualRow,recordedOnly:state.recordedOnly};
 } catch {return {weave:randomWeave(),palettes:[],instruments:[]};}
}
const savedSession=readSession(),paletteOverrides=new Map(savedSession.palettes),instrumentOverrides=new Map(savedSession.instruments);
let patternColors=[...(paletteOverrides.get(savedSession.weave)??getWeave(savedSession.weave).colors??getWeave('pond').colors)],patternSelected=0;
let savedColorInterval=6000,nextSavedChange=0;
function applySoundSettings(){const settings=readSettings();sound.setSoftness(settings.softness);sound.setVolume(settings.volume);const interval=settings.colorInterval*1000;if(interval!==savedColorInterval){savedColorInterval=interval;nextSavedChange=Date.now()+interval;}}
applySoundSettings();
addEventListener('pageshow',applySoundSettings);
addEventListener('storage',applySoundSettings);
const patternPalette=document.querySelector('#pattern-palette');
let selectedColor=colorSong(patternColors[0]),position={h:selectedColor.h,s:selectedColor.s,l:selectedColor.l},desired=paletteSong(patternColors),scheduled=desired,shown=desired,playing=false,starting=false,token=0,step=0,nextTime=0,displayStep=-1,timer=null,visualQueue=[],dragging=false,satDragging=false,unit=12,weaveUnit=9,cols=64,rows=48;
let loopLength=64,initialized=false,draftColumns=32;
const weaveSelect=document.querySelector('#weave-select'),draftCanvas=document.querySelector('#weave-draft'),draftViewport=document.querySelector('#draft-viewport');let selectedWeave=savedSession.weave,scheduledWeave=selectedWeave,visualRow=0;
let timeline;
try {timeline=new PatternTimeline(savedSession.timeline??[]);} catch {timeline=new PatternTimeline();}
if(!savedSession.recordedOnly)timeline.removeOpeningPreview();
if(timeline.length&&Number.isInteger(savedSession.visualRow))visualRow=savedSession.visualRow;
const preview=[];let lastRowTime=0,frozenOffset=1,historyOffset=0;
const footer=document.querySelector('#footer'),exportButton=document.querySelector('#export');
weaveSelect.replaceChildren();
for(const book of [1,2]){const group=document.createElement('optgroup');group.label=book===1?'Part One':'Part Two';for(const preset of WEAVES.filter(p=>p.book===book)){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;group.append(option);}weaveSelect.append(group);}
const customOption=document.createElement('option');customOption.value='custom';customOption.textContent='Custom';weaveSelect.append(customOption);weaveSelect.value=selectedWeave;
function applyInstruments(){const pair=instrumentOverrides.get(selectedWeave)??getWeave(selectedWeave).instruments;sound.melodyInstrument=pair[0];sound.padInstrument=pair[1];}
applyInstruments();
function makeSong(){return weaveLoop(patternColors,getWeave(selectedWeave),loopLength);}
const panelPalette=document.querySelector('#panel-palette');
function selectColor(index){patternSelected=index;savedSelections[index]=-1;const c=colorSong(patternColors[index]);position={h:c.h,s:c.s||.7,l:c.l};renderSavedColors();drawPicker();update();}
const savedSwatches=document.querySelector('#saved-swatches');
let savedBanks=[Array(16).fill(null),Array(16).fill(null)],savedSelections=[-1,-1],savedLoops=[-1,-1];
try {
 const stored=JSON.parse(localStorage.getItem('mglaa-saved-color-banks')||'null');
 const legacy=JSON.parse(localStorage.getItem('mglaa-saved-colors')||'[]');
 const banks=Array.isArray(stored)?stored:[legacy,[]];
 savedBanks=savedBanks.map((bank,b)=>bank.map((_,i)=>typeof banks[b]?.[i]==='string'?normalizeHex(banks[b][i]):null));
} catch {}
function persistSavedColors(){try{localStorage.setItem('mglaa-saved-color-banks',JSON.stringify(savedBanks));}catch{}}
function renderSavedColors(){
 const colors=savedBanks[patternSelected],loop=savedLoops[patternSelected];
 savedSwatches.dataset.looping=String(loop>=0);
 [...savedSwatches.children].forEach((button,i)=>{button.style.backgroundColor=colors[i]??'#fff';button.setAttribute('aria-pressed',String(i===(loop>=0?loop:savedSelections[patternSelected])));button.setAttribute('aria-label',colors[i]?`Saved color ${i+1}: ${colors[i]}. Apply and cycle; tap the same slot again to remove.`:`Save current color in slot ${i+1}`);});
}
function stopSavedLoop(all=false){if(all)savedLoops=[-1,-1];else savedLoops[patternSelected]=-1;renderSavedColors();}
for(let i=0;i<16;i++){
 const button=document.createElement('button');button.type='button';
 button.addEventListener('click',()=>{
  const bank=patternSelected,colors=savedBanks[bank];
  if(colors[i]&&savedSelections[bank]===i){
   colors[i]=null;savedSelections[bank]=-1;
   const filled=colors.map((c,j)=>c?j:-1).filter(j=>j>=0);
   if(filled.length<2)savedLoops[bank]=-1;
   else if(savedLoops[bank]===i)savedLoops[bank]=filled[0];
   persistSavedColors();status.textContent='Saved color removed';
  }else if(!colors[i]){
   colors[i]=patternColors[bank];savedSelections[bank]=-1;persistSavedColors();status.textContent='Color saved';
  }else{
   const alreadyLooping=savedLoops.some(j=>j>=0);
   choose(colors[i],null,true);savedSelections[bank]=i;
   savedLoops[bank]=colors.filter(Boolean).length>1?i:-1;
   if(!alreadyLooping)nextSavedChange=Date.now()+savedColorInterval;
   start();
  }
  renderSavedColors();
 });savedSwatches.append(button);
}
renderSavedColors();
function advanceSavedColors(){
 if(!playing||!savedLoops.some(i=>i>=0)||Date.now()<nextSavedChange)return;
 nextSavedChange=Date.now()+savedColorInterval;
 let changed=false;
 savedBanks.forEach((colors,bank)=>{
  if(savedLoops[bank]<0)return;
  const filled=colors.map((c,i)=>c?i:-1).filter(i=>i>=0);
  if(filled.length<2){savedLoops[bank]=-1;return;}
  savedLoops[bank]=filled[(filled.indexOf(savedLoops[bank])+1)%filled.length];
  patternColors[bank]=colors[savedLoops[bank]];changed=true;
 });
 if(changed){paletteOverrides.set(selectedWeave,[...patternColors]);const c=colorSong(patternColors[patternSelected]);position={h:c.h,s:c.s,l:c.l};refreshMusic();update();drawPicker();drawDraft();draw();}
 renderSavedColors();
}
patternColors.forEach((color,index)=>{
 const button=document.createElement('button');button.type='button';button.className='pixel-button';button.style.backgroundColor=color;
 button.addEventListener('click',()=>{selectColor(index);paletteDialog.showModal();});patternPalette.append(button);
 const panelButton=document.createElement('button');panelButton.type='button';panelButton.className='pixel-button';panelButton.setAttribute('aria-label',index===0?'Edit pattern color':'Edit background color');
 panelButton.addEventListener('click',()=>selectColor(index));panelPalette.append(panelButton);
});

const voiceGrid=document.querySelector('#voice-grid');
for(let cell=0;cell<32;cell++){
 const row=Math.floor(cell/8),col=cell%8,i=col<4?row*4+col:16+row*4+col-4;
 const button=document.createElement('button');button.type='button';button.dataset.instrument=String(i);button.setAttribute('aria-label',(i<16?'Melody instrument ':'Pad instrument ')+(i%16+1));
 button.addEventListener('click',()=>{sound.selectInstrument(i);instrumentOverrides.set(selectedWeave,[sound.melodyInstrument,sound.padInstrument]);updateVoices();start();});
 button.addEventListener('keydown',e=>{const shift={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(shift){e.preventDefault();const next=Math.max(0,Math.min(31,cell+shift));voiceGrid.children[next].focus();voiceGrid.children[next].click();}});
 voiceGrid.append(button);
}
function updateVoices(){[...voiceGrid.children].forEach(button=>{const i=Number(button.dataset.instrument),on=i===(i<16?sound.melodyInstrument:sound.padInstrument);button.setAttribute('aria-pressed',String(on));button.style.backgroundColor=patternColors[on?0:1];});}
function refreshMusic(){
 desired=makeSong();if(!playing){shown=desired;return;}
 sound.stop();sound.setVolume(sound.volume);scheduled=shown=desired;scheduledWeave=selectedWeave;step=0;displayStep=-1;visualQueue=[];nextTime=sound.context.currentTime+.04;schedule();
}
updateVoices();
function fit(canvas,w,h){const dpr=devicePixelRatio||1;canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
function resize(){
 unit=innerWidth<500?10:12;weaveUnit=unit*.75;document.body.style.setProperty('--cell',unit+'px');
 cols=Math.max(16,Math.floor((innerWidth-32)/weaveUnit));rows=Math.max(8,Math.floor((innerHeight-32-unit*11-24)/weaveUnit));
 if(!initialized){loopLength=Math.max(16,Math.floor((innerWidth-32)/unit));desired=makeSong();shown=desired;initialized=true;}
 voiceGrid.style.left=(16+cols*weaveUnit-8*unit)+'px';draftColumns=Math.max(4,Math.floor((cols*weaveUnit-10*unit-1)/unit));draftViewport.style.width=(draftColumns*unit+1)+'px';
 historyOffset=Math.min(historyOffset,Math.max(0,timeline.length-rows));
 footer.style.left='16px';footer.style.top=(16+unit*11+(rows+1)*weaveUnit)+'px';footer.style.width=(cols*weaveUnit+1)+'px';
 fit(score,cols*weaveUnit+1,rows*weaveUnit+1);fit(field,16*unit+1,16*unit+1);fit(sat,16*unit+1,unit+1);drawPicker();drawDraft();previewWeave();draw();update();
}
function drawDraft(){const preset=getWeave(selectedWeave),count=draftColumns;fit(draftCanvas,count*unit+1,4*unit+1);const ctx=draftCanvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,count*unit+1,4*unit+1);for(let y=0;y<4;y++)for(let x=0;x<count;x++)square(ctx,x,y,preset.threading[x%preset.threading.length]===3-y?patternColors[0]:patternColors[1]);draftCanvas.setAttribute('aria-label',preset.name+' threading draft, '+count+' visible columns, '+preset.threading.length+' columns per repeat');}
function previewWeave(){preview.length=0;if(!timeline.length)visualRow=0;for(let row=0;row<rows+2;row++)preview.push(snapshotRow(getWeave(selectedWeave),row,patternColors,cols));if(!timeline.length)frozenOffset=1;}
weaveSelect.addEventListener('change',()=>{stopSavedLoop(true);selectedWeave=weaveSelect.value;visualRow=0;applyInstruments();patternColors=[...(paletteOverrides.get(selectedWeave)??getWeave(selectedWeave).colors??patternColors)];drawDraft();refreshMusic();previewWeave();draw();draftViewport.scrollLeft=0;document.body.dataset.weave=selectedWeave;draftCanvas.style.cursor=selectedWeave==='custom'?'crosshair':'default';update();});
let draftDragging=false,draftColumn=0;
function paintDraft(e){
 const r=draftCanvas.getBoundingClientRect(),p=getWeave('custom'),column=Math.max(0,Math.min(draftColumns-1,Math.floor((e.clientX-r.left)/unit)))%p.threading.length,shaft=3-Math.max(0,Math.min(3,Math.floor((e.clientY-r.top)/unit)));
 draftColumn=column;if(p.threading[column]===shaft)return;updateCustom(column,shaft);drawDraft();previewWeave();refreshMusic();draw();
}
draftCanvas.addEventListener('pointerdown',e=>{if(selectedWeave!=='custom')return;draftDragging=true;draftCanvas.setPointerCapture(e.pointerId);draftCanvas.focus();paintDraft(e);});
draftCanvas.addEventListener('pointermove',e=>{if(draftDragging)paintDraft(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])draftCanvas.addEventListener(type,()=>draftDragging=false);
draftCanvas.addEventListener('keydown',e=>{if(selectedWeave!=='custom'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();const p=getWeave('custom');if(e.key==='ArrowLeft'||e.key==='ArrowRight')draftColumn=Math.max(0,Math.min(p.threading.length-1,draftColumn+(e.key==='ArrowRight'?1:-1)));else {updateCustom(draftColumn,(p.threading[draftColumn]+(e.key==='ArrowDown'?3:1))%4);previewWeave();refreshMusic();}drawDraft();draw();});
function square(ctx,x,y,color,size=unit){ctx.fillStyle=color??'#fff';ctx.fillRect(x*size+1,y*size+1,size-1,size-1);}
function drawPicker(){
 const ctx=field.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,16*unit+1,16*unit+1);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++)square(ctx,x,y,hslToHex(x/16*360,position.s,1-y/15));
 const x=Math.min(15,Math.floor(position.h/360*16)),y=Math.round((1-position.l)*15);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(x*unit+2,y*unit+2,unit-4,unit-4);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(x*unit+2,y*unit+2,unit-4,unit-4);
 const c=sat.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,16*unit+1,unit+1);for(let i=0;i<16;i++)square(c,i,0,hslToHex(position.h,i/15,position.l));c.strokeStyle=position.l>.5?'#000':'#fff';c.lineWidth=2;c.strokeRect(Math.round(position.s*15)*unit+2,2,unit-4,unit-4);sat.setAttribute('aria-valuenow',String(Math.round(position.s*100)));
}
function draw(){
 const ctx=score.getContext('2d');ctx.fillStyle=patternColors[1];ctx.fillRect(0,0,cols*weaveUnit+1,rows*weaveUnit+1);
 const fraction=(timeline.length||preview.length)?(playing?Math.max(0,Math.min(1,(sound.context.currentTime-lastRowTime)/STEP)):1):0;
 ctx.save();ctx.beginPath();ctx.rect(0,0,cols*weaveUnit,rows*weaveUnit);ctx.clip();ctx.translate(0,Math.floor(fraction*weaveUnit)-weaveUnit-(historyOffset%1)*weaveUnit);
 for(let r=0;r<rows+2;r++){
  const index=r+Math.floor(historyOffset),entry=timeline.newest(index)??preview[Math.max(0,index-timeline.length)],pixels=entry?Array.from({length:cols},(_,x)=>entry.colors[entry.mask[x%entry.mask.length]?0:1]):null;
  for(let x=0;x<cols;x++)square(ctx,x,r,pixels?.[x],weaveUnit);
 }
 ctx.strokeStyle='#000';ctx.lineWidth=1;for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(x*weaveUnit+.5,0);ctx.lineTo(x*weaveUnit+.5,(rows+2)*weaveUnit);ctx.stroke();}for(let y=0;y<=rows+2;y++){ctx.beginPath();ctx.moveTo(0,y*weaveUnit+.5);ctx.lineTo(cols*weaveUnit,y*weaveUnit+.5);ctx.stroke();}ctx.restore();ctx.strokeStyle='#000';ctx.strokeRect(.5,.5,cols*weaveUnit,rows*weaveUnit);
}
function update(){
 score.style.touchAction=playing?'auto':'none';
 updateVoices();
 [...panelPalette.children].forEach((button,i)=>{button.style.backgroundColor=patternColors[i];button.setAttribute('aria-pressed',String(i===patternSelected));});
 [...patternPalette.children].forEach((button,i)=>{button.style.backgroundColor=patternColors[i];button.setAttribute('aria-label',(i===0?'Pattern color':'Background color')+': '+patternColors[i]);button.title=i===0?'Pattern color':'Background color';});
 document.body.dataset.selectedPalette=desired.id;document.body.dataset.playingPalette=playing?shown.id:'';score.dataset.historyRows=String(timeline.length);exportButton.disabled=!timeline.length||exportButton.getAttribute('aria-busy')==='true';exportButton.title=timeline.length?'Preview your pattern':'Play to begin your pattern';score.dataset.playbackStep=String(displayStep);
}
function scrollHistory(delta){
 if(playing)return;
 historyOffset=Math.max(0,Math.min(Math.max(0,timeline.length-rows),historyOffset+delta));
 score.dataset.scrollRow=String(Math.floor(historyOffset));draw();
}
score.addEventListener('wheel',e=>{if(playing)return;e.preventDefault();scrollHistory(e.deltaY*(e.deltaMode===1?weaveUnit:e.deltaMode===2?rows*weaveUnit:1)/weaveUnit);},{passive:false});
let historyDrag=null;
score.addEventListener('pointerdown',e=>{if(playing)return;score.focus();historyDrag={id:e.pointerId,y:e.clientY};score.setPointerCapture(e.pointerId);});
score.addEventListener('pointermove',e=>{if(!historyDrag||e.pointerId!==historyDrag.id)return;scrollHistory((historyDrag.y-e.clientY)/weaveUnit);historyDrag.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])score.addEventListener(type,()=>historyDrag=null);
score.addEventListener('keydown',e=>{if(playing)return;const moves={ArrowDown:1,ArrowUp:-1,PageDown:rows,PageUp:-rows,Home:-Infinity,End:Infinity};if(e.key in moves){e.preventDefault();scrollHistory(moves[e.key]);}});
function choose(hex,coordinates=null,fromSaved=false){
 const valid=normalizeHex(hex);if(!valid)return;if(!fromSaved)stopSavedLoop();
 patternColors[patternSelected]=valid;paletteOverrides.set(selectedWeave,[...patternColors]);
 const c=colorSong(valid);position=coordinates??{h:c.h,s:c.s,l:c.l};
 refreshMusic();
 update();drawPicker();drawDraft();draw();
}

function schedule(){if(!playing)return;advanceSavedColors();advanceTimeline();const now=sound.context.currentTime;if(nextTime<now-.1){const missed=Math.ceil((now-nextTime)/STEP);step=(step+missed)%scheduled.length;nextTime+=missed*STEP;sound.chord(scheduled,now);}while(nextTime<now+(document.hidden?1.2:.12)){if(step===0){scheduledWeave=selectedWeave;scheduled=desired;sound.chord(scheduled,nextTime);}for(const event of scheduled.events.filter(e=>Math.floor(e.step)===step))sound.note(event,nextTime+(event.step-step)*STEP);visualQueue.push({time:nextTime,step,song:scheduled,weave:scheduledWeave});nextTime+=STEP;step=(step+1)%scheduled.length;}}
async function start(){if(playing||starting)return;historyOffset=0;score.dataset.scrollRow='0';starting=true;const ticket=++token;try{await sound.start();if(ticket!==token){sound.stop();return;}playing=true;scheduled=desired;shown=desired;step=0;displayStep=-1;nextTime=sound.context.currentTime+.08;visualQueue=[];schedule();timer=setInterval(schedule,25);playButton.setAttribute('aria-pressed','true');playButton.setAttribute('aria-label','Pause music');playButton.querySelector('.play-label').textContent='pause';status.textContent='Playing two colors';document.body.dataset.playing='true';update();}catch(error){status.textContent='Audio could not start. Try again.';console.error(error);}finally{starting=false;}}
function stop(){if(playing)advanceTimeline();token++;if(playing&&timeline.length)frozenOffset=Math.max(0,Math.min(1,(sound.context.currentTime-lastRowTime)/STEP));playing=false;clearInterval(timer);sound.stop();visualQueue=[];playButton.setAttribute('aria-pressed','false');playButton.setAttribute('aria-label','Start music');playButton.querySelector('.play-label').textContent='play';status.textContent='Paused';document.body.dataset.playing='false';update();draw();}
function point(e){const r=field.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),coordinates={h:Math.min(359.99,x*360),s:position.s,l:1-y};choose(hslToHex(coordinates.h,coordinates.s,coordinates.l),coordinates);}
field.addEventListener('pointerdown',e=>{dragging=true;field.setPointerCapture(e.pointerId);field.focus();point(e);start();});field.addEventListener('pointermove',e=>{if(dragging)point(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])field.addEventListener(event,()=>dragging=false);
field.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const c={h:(position.h+(e.key==='ArrowRight'?3:e.key==='ArrowLeft'?-3:0)+360)%360,s:position.s,l:Math.max(0,Math.min(1,position.l+(e.key==='ArrowUp'?.02:e.key==='ArrowDown'?-.02:0)))};choose(hslToHex(c.h,c.s,c.l),c);start();});
function saturationPoint(e){const r=sat.getBoundingClientRect(),c={...position,s:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))};choose(hslToHex(c.h,c.s,c.l),c);}
sat.addEventListener('pointerdown',e=>{satDragging=true;sat.setPointerCapture(e.pointerId);saturationPoint(e);start();});sat.addEventListener('pointermove',e=>{if(satDragging)saturationPoint(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])sat.addEventListener(event,()=>satDragging=false);
sat.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const c={...position,s:Math.max(0,Math.min(1,position.s+(e.key==='ArrowRight'?1:-1)/15))};choose(hslToHex(c.h,c.s,c.l),c);start();});
playButton.addEventListener('click',()=>playing||starting?stop():start());document.querySelector('#palette-close').addEventListener('click',()=>paletteDialog.close());
paletteDialog.addEventListener('pointerdown',e=>{const r=paletteDialog.getBoundingClientRect();if(e.target===paletteDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))paletteDialog.close();});
addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.closest('input,select,button,dialog')){e.preventDefault();playing?stop():start();}if(e.key==='Escape'&&!document.querySelector('dialog[open]'))stop();});
function saveSession(){
 try {sessionStorage.setItem('mglaa-instrument-session',JSON.stringify({weave:selectedWeave,palettes:[...paletteOverrides],instruments:[...instrumentOverrides],custom:[...getWeave('custom').threading],timeline:timeline.toJSON(),visualRow,recordedOnly:true}));} catch {}
}
exportButton.addEventListener('click',async()=>{
 if(exportButton.disabled||!timeline.length)return;
 saveSession();exportButton.disabled=true;exportButton.setAttribute('aria-busy','true');
 let previewWindow,onReady,readyTimer;
 const ready=new Promise((resolve,reject)=>{
  onReady=e=>{if(e.origin===location.origin&&e.source===previewWindow&&e.data?.type==='mglaa-preview-ready'){clearTimeout(readyTimer);resolve();}};
  addEventListener('message',onReady);
  readyTimer=setTimeout(()=>reject(new Error('Preview did not open.')),30000);
 });
 previewWindow=window.open('export-preview.html?id='+crypto.randomUUID(),'_blank');
 if(!previewWindow){clearTimeout(readyTimer);removeEventListener('message',onReady);exportButton.removeAttribute('aria-busy');update();status.textContent='Allow a new tab to preview your pattern.';return;}
 try {
  const snapshot=new PatternTimeline(timeline.toJSON());
  const [{createPatternPDF}]=await Promise.all([import('./pattern-pdf.js?v=brand-1'),ready]);
  const bytes=await createPatternPDF(snapshot.newestFirst(),Math.max(cols,snapshot.width),{yieldPage:()=>new Promise(resolve=>setTimeout(resolve,0))});
  if(!previewWindow.closed)previewWindow.postMessage({type:'mglaa-preview-pdf',bytes,filename:'mglaa-pattern-'+new Date().toISOString().replace(/[:.]/g,'-')+'.pdf'},location.origin,[bytes.buffer]);
  status.textContent='Pattern PDF preview opened in a new tab';
 } catch(error){status.textContent='Could not preview the pattern. Please try again.';if(!previewWindow.closed)previewWindow.postMessage({type:'mglaa-preview-error'},location.origin);console.error(error);}
 finally {clearTimeout(readyTimer);removeEventListener('message',onReady);exportButton.removeAttribute('aria-busy');update();}
});
document.querySelector('#info').addEventListener('click',saveSession);
addEventListener('pagehide',saveSession);
addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(playing){if(!document.hidden&&sound.context.state!=='running')sound.context.resume().catch(()=>{});schedule();saveSession();}});addEventListener('resize',resize);
function advanceTimeline(){let changed=false;if(playing)while(visualQueue.length&&visualQueue[0].time<=sound.context.currentTime){const v=visualQueue.shift();shown=v.song;displayStep=v.step;lastRowTime=v.time;timeline.add(getWeave(v.weave),-++visualRow,v.song.colors,cols);changed=true;}if(changed)update();}
function frame(){advanceTimeline();draw();requestAnimationFrame(frame);}
update();resize();saveSession();requestAnimationFrame(frame);
