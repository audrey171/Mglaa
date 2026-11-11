import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamingPDF} from '../pdf-stream.js';
import {PDFDocument} from '../vendor/pdf-lib.esm.min.js';
function* rows(count){for(let i=0;i<count;i++)yield {mask:[true,false,true],colors:['#28594D','#D7E5B3']};}
test('streaming export retains every row across page boundaries',async()=>{
 let progress=0;const blob=await createStreamingPDF(rows(1001),160,{onProgress:n=>progress=n});
 const pdf=await PDFDocument.load(await blob.arrayBuffer());assert.equal(progress,1001);assert.equal(pdf.getPageCount(),5);assert.equal(pdf.getSubject(),'1001 rows, 160 columns; newest rows first');assert.equal(pdf.getTitle(),'Mglaa');assert.ok(blob.size<500000);
});
test('streaming export rejects empty or invalid inputs and supports cancellation',async()=>{
 await assert.rejects(()=>createStreamingPDF(rows(0),160));await assert.rejects(()=>createStreamingPDF(rows(1),0));await assert.rejects(()=>createStreamingPDF(rows(10),160,{signal:{aborted:true}}));
});
