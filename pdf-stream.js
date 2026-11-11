// Build and compress one page at a time. Retain compressed bytes, not a PDF object graph.
export async function createStreamingPDF(rows,width,{onProgress=()=>{},signal}={}){
 if(!Number.isInteger(width)||width<1||width>10000)throw new Error('Invalid pattern width');
 const parts=[],offsets=[0],pages=[],enc=new TextEncoder();let size=0,id=4,total=0;
 const add=value=>{const bytes=typeof value==='string'?enc.encode(value):value;parts.push(bytes);size+=bytes.byteLength;};
 const object=(n,text)=>{offsets[n]=size;add(`${n} 0 obj\n${text}\nendobj\n`);};
 const number=n=>Number(n.toFixed(4));
 const color=hex=>hex.slice(1).match(/../g).map(v=>number(parseInt(v,16)/255)).join(' ');
 const cell=559.28/width,perPage=Math.max(1,Math.floor(805.89/cell));
 const iterator=rows[Symbol.iterator]();let next=iterator.next();
 add('%PDF-1.7\n');object(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
 while(!next.done){
  if(signal?.aborted)throw new Error('Export cancelled');
  const page=id++,stream=id++,link=id++;pages.push(page);let commands=[],height=0;
  while(height<perPage&&!next.done){
   const row=next.value,y=number(823.89-(height+1)*cell);
   commands.push(`${color(row.colors[1])} rg 18 ${y} 559.28 ${number(cell)} re f`);
   for(let x=0;x<width;){if(!row.mask[x%row.mask.length]){x++;continue;}const start=x;while(x<width&&row.mask[x%row.mask.length])x++;commands.push(`${color(row.colors[0])} rg ${number(18+start*cell)} ${y} ${number((x-start)*cell)} ${number(cell)} re f`);}
   height++;total++;next=iterator.next();
  }
  const bottom=number(823.89-height*cell);commands.push(`0 0 0 RG ${number(Math.min(.5,cell/9))} w`);
  for(let x=0;x<=width;x++)commands.push(`${number(18+x*cell)} ${bottom} m ${number(18+x*cell)} 823.89 l S`);
  for(let y=0;y<=height;y++)commands.push(`18 ${number(823.89-y*cell)} m 577.28 ${number(823.89-y*cell)} l S`);
  commands.push('0 0 1 rg BT /F1 9 Tf 18 8 Td (Mglaa.com) Tj ET 0 0 1 RG .35 w 18 7 m 59 7 l S');
  const compressed=new Uint8Array(await new Response(new Blob([commands.join('\n')]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());commands=null;
  object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R >> >> /Contents ${stream} 0 R /Annots [${link} 0 R] >>`);
  offsets[stream]=size;add(`${stream} 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`);add(compressed);add('\nendstream\nendobj\n');
  object(link,'<< /Type /Annot /Subtype /Link /Rect [18 6 60 17] /Border [0 0 0] /A << /S /URI /URI (https://mglaa.com) >> >>');onProgress(total);
 }
 if(!pages.length)throw new Error('No pattern rows');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map(n=>`${n} 0 R`).join(' ')}] >>`);
 const info=id++;object(info,`<< /Title (Mglaa) /Creator (Mglaa.com) /Subject (${total} rows, ${width} columns; newest rows first) >>`);
 const xref=size;add(`xref\n0 ${id}\n0000000000 65535 f \n`);for(let n=1;n<id;n++)add(`${String(offsets[n]).padStart(10,'0')} 00000 n \n`);
 add(`trailer\n<< /Size ${id} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}
