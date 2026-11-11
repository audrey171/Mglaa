const key='mglaa-sound-settings';
export function readSettings(){
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    return {softness:valid(saved.softness,1),volume:valid(saved.volume,.55),colorInterval:interval(saved.colorInterval)};
  } catch { return {softness:1,volume:.55,colorInterval:6}; }
}
function valid(value,fallback){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;}
function interval(value){return Number.isFinite(value)?Math.max(2,Math.min(30,value)):6;}
export function saveSettings(settings){
  settings={...readSettings(),...settings};
  const next={softness:valid(settings.softness,1),volume:valid(settings.volume,.55),colorInterval:interval(settings.colorInterval)};
  try {localStorage.setItem(key,JSON.stringify(next));} catch {}
  return next;
}
