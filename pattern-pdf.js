import {PDFDocument,rgb,StandardFonts,PDFString} from './vendor/pdf-lib.esm.min.js';

// Vector cells retain their square shape at any zoom. No screen capture or upload.
export async function createPatternPDF(rows,width,{yieldPage=()=>Promise.resolve()}={}){
  if(!Number.isInteger(width)||width<1)throw new Error('A pattern needs at least one column.');
  const doc=await PDFDocument.create();
  doc.setTitle('Mglaa');doc.setCreator('Mglaa.com');
  const font=await doc.embedFont(StandardFonts.TimesRoman),blue=rgb(0,0,1);
  const pageWidth=595.28,pageHeight=841.89,margin=18,cell=(pageWidth-margin*2)/width;
  const perPage=Math.max(1,Math.floor((pageHeight-margin*2)/cell)),ink=rgb(0,0,0),colors=new Map();
  const color=hex=>{if(!colors.has(hex))colors.set(hex,rgb(...hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255)));return colors.get(hex);};
  const iterator=rows[Symbol.iterator]();let next=iterator.next(),rowCount=0;
  if(next.done)throw new Error('There are no pattern rows to export.');
  while(!next.done){
    const page=doc.addPage([pageWidth,pageHeight]);let height=0;
    while(height<perPage&&!next.done){
      const row=next.value,y=pageHeight-margin-(height+1)*cell,rowWidth=width;
      page.drawRectangle({x:margin,y,width:rowWidth*cell,height:cell,color:color(row.colors[1])});
      for(let x=0;x<rowWidth;){
        if(!row.mask[x%row.mask.length]){x++;continue;}
        const start=x;while(x<rowWidth&&row.mask[x%row.mask.length])x++;
        page.drawRectangle({x:margin+start*cell,y,width:(x-start)*cell,height:cell,color:color(row.colors[0])});
      }
      height++;rowCount++;next=iterator.next();
    }
    const top=pageHeight-margin,bottom=top-height*cell,thickness=Math.min(.5,cell/9);
    for(let x=0;x<=width;x++)page.drawLine({start:{x:margin+x*cell,y:bottom},end:{x:margin+x*cell,y:top},thickness,color:ink});
    for(let y=0;y<=height;y++)page.drawLine({start:{x:margin,y:top-y*cell},end:{x:pageWidth-margin,y:top-y*cell},thickness,color:ink});
    const label='Mglaa.com',labelWidth=font.widthOfTextAtSize(label,9);
    page.drawText(label,{x:margin,y:8,size:9,font,color:blue});
    page.drawLine({start:{x:margin,y:7},end:{x:margin+labelWidth,y:7},thickness:.35,color:blue});
    page.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[margin,6,margin+labelWidth,17],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of('https://mglaa.com')}})));
    await yieldPage();
  }
  doc.setSubject(`${rowCount} rows, ${width} columns; newest rows first`);
  return doc.save();
}
