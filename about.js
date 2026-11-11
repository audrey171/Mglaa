import {readSettings,saveSettings} from './settings.js?v=color-speed-1';
const settings=readSettings();
for(const name of ['softness','volume','colorInterval']){
  const input=document.querySelector('#'+name),output=document.querySelector('#'+name+'-value');
  const scale=name==='colorInterval'?1:100,suffix=name==='colorInterval'?' s':'%';
  input.value=Math.round(settings[name]*scale);
  output.value=input.value+suffix;
  input.addEventListener('input',()=>{
    saveSettings({[name]:Number(input.value)/scale});
    output.value=input.value+suffix;
  });
}
