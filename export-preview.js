const origin=location.origin,source=window.opener,status=document.querySelector('#status'),frame=document.querySelector('#document'),download=document.querySelector('#download');
const id=new URLSearchParams(location.search).get('id');
let url=null,preparing=false;
document.querySelector('#close').addEventListener('click',()=>window.close());
function openCache(){return new Promise((resolve,reject)=>{const request=indexedDB.open('mglaa-export-previews',1);request.onupgradeneeded=()=>request.result.createObjectStore('previews',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Preview cache unavailable'));});}
async function cachePreview(blob,filename){
 if(!id||blob.size>50*1024*1024)return false;
 const db=await openCache();
 try {await new Promise((resolve,reject)=>{const tx=db.transaction('previews','readwrite'),store=tx.objectStore('previews');store.put({id,blob,filename,created:Date.now()});const all=store.getAll();all.onsuccess=()=>{const older=all.result.filter(item=>item.id!==id).sort((a,b)=>b.created-a.created);let bytes=blob.size;for(let i=0;i<older.length;i++){const item=older[i];bytes+=item.blob.size;if(i>=4||bytes>50*1024*1024)store.delete(item.id);}};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}finally{db.close();}
}
async function restorePreview(){
 if(!id)return;
 const db=await openCache();
 try{return await new Promise((resolve,reject)=>{const request=db.transaction('previews').objectStore('previews').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}
function showPreview(blob,filename){
 if(url)URL.revokeObjectURL(url);
 url=URL.createObjectURL(blob);download.href=url;download.download=filename;download.hidden=false;
 frame.src=url+(matchMedia('(max-width:600px)').matches?'#view=Fit&zoom=page-fit&toolbar=0&navpanes=0':'');frame.hidden=false;status.hidden=true;
}
addEventListener('message',async event=>{
 if(event.origin!==origin||event.source!==source)return;
 if(event.data?.type==='mglaa-preview-progress'){preparing=true;status.textContent=`preparing preview… ${event.data.rows} / ${event.data.total} rows`;return;}
 if(event.data?.type==='mglaa-preview-error'){status.textContent='The preview could not be created. Close this tab and try again.';return;}
 if(event.data?.type!=='mglaa-preview-pdf'||!(event.data.blob instanceof Blob))return;
 const blob=event.data.blob;preparing=false;
 // Keep the most recent five exports locally so mobile Back/reload can restore them.
 let cached=false;try{cached=await cachePreview(blob,event.data.filename);}catch{}
 showPreview(blob,event.data.filename);
 if(!cached){status.hidden=false;status.textContent='Preview could not be saved in this browser. Download now before closing this tab.';}
});
addEventListener('pagehide',event=>{if(!event.persisted&&url)URL.revokeObjectURL(url);});
restorePreview().then(saved=>{if(saved&&!url)showPreview(saved.blob,saved.filename);}).catch(()=>{});
if(source)source.postMessage({type:'mglaa-preview-ready'},origin);
else status.textContent='Open a preview using export in the instrument.';
setTimeout(()=>{if(!url&&!preparing)status.textContent='This preview is no longer available. Return to Mglaa and select export again.';},60000);
