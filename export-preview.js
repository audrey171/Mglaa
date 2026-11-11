const origin=location.origin,source=window.opener,status=document.querySelector('#status'),frame=document.querySelector('#document'),download=document.querySelector('#download');
let url=null;
document.querySelector('#close').addEventListener('click',()=>window.close());
addEventListener('message',event=>{
 if(event.origin!==origin||event.source!==source)return;
 if(event.data?.type==='mglaa-preview-error'){status.textContent='The preview could not be created. Close this tab and try again.';return;}
 if(event.data?.type!=='mglaa-preview-pdf'||!(event.data.bytes instanceof Uint8Array))return;
 if(url)URL.revokeObjectURL(url);
 url=URL.createObjectURL(new Blob([event.data.bytes],{type:'application/pdf'}));
 download.href=url;download.download=event.data.filename;download.hidden=false;
 frame.src=url+(matchMedia('(max-width:600px)').matches?'#view=Fit&zoom=page-fit&toolbar=0&navpanes=0':'');frame.hidden=false;status.hidden=true;
});
addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);});
if(source)source.postMessage({type:'mglaa-preview-ready'},origin);
else status.textContent='Open a preview using export in the instrument.';
