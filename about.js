import {readSettings,saveSettings} from './settings.js';
const settings=readSettings();
for(const name of ['softness','volume']){
  const input=document.querySelector('#'+name),output=document.querySelector('#'+name+'-value');
  input.value=Math.round(settings[name]*100);
  output.value=input.value+'%';
  input.addEventListener('input',()=>{
    settings[name]=Number(input.value)/100;
    saveSettings(settings);
    output.value=input.value+'%';
  });
}
