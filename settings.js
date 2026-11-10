const key='mglaa-sound-settings';
export function readSettings(){
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    return {softness:valid(saved.softness,1),volume:valid(saved.volume,.55)};
  } catch { return {softness:1,volume:.55}; }
}
function valid(value,fallback){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;}
export function saveSettings(settings){
  const next={softness:valid(settings.softness,1),volume:valid(settings.volume,.55)};
  try {localStorage.setItem(key,JSON.stringify(next));} catch {}
  return next;
}
