import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(process.argv[2]||'public'),out=path.resolve(process.argv[3]||'dist/server/index.js');
const files={};async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())await walk(full);else if(e.name!=='_headers')files['/'+path.relative(root,full).split(path.sep).join('/')]=(await fs.readFile(full)).toString('base64');}}await walk(root);
const headerText=await fs.readFile(path.join(root,'_headers'),'utf8'),headers={};for(const line of headerText.split('\n').slice(1)){const i=line.indexOf(':');if(i>0)headers[line.slice(0,i).trim()]=line.slice(i+1).trim();}
const source=`const assets=${JSON.stringify(files)};\nconst security=${JSON.stringify(headers)};\nconst types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',svg:'image/svg+xml',wav:'audio/wav',mp3:'audio/mpeg',json:'application/json',txt:'text/plain',otf:'font/otf',ttf:'font/ttf'};
export default {async fetch(request){
 const h=new Headers(security);h.set('Cache-Control','public, max-age=0, must-revalidate');
 if(!['GET','HEAD'].includes(request.method)){h.set('Allow','GET, HEAD');return new Response('Method not allowed',{status:405,headers:h});}
 let pathname;try{pathname=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Bad request',{status:400,headers:h});}
 if(pathname==='/')pathname='/index.html';else if(!Object.hasOwn(assets,pathname)&&Object.hasOwn(assets,pathname+'.html'))pathname+='.html';
 if(!Object.hasOwn(assets,pathname)){h.set('Content-Type','text/plain');return new Response('Not found',{status:404,headers:h});}
 h.set('Content-Type',types[pathname.split('.').pop()]||'application/octet-stream');
 return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(assets[pathname]),c=>c.charCodeAt(0)),{headers:h});
}};`;
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,source);console.log('Built secure asset responder:',Object.keys(files).length,'files');
