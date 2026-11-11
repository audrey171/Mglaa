import test from 'node:test';
import assert from 'node:assert/strict';
import {PatternTimeline} from './timeline.js';
import {getWeave} from './weave-presets.js';
import {createPatternPDF} from './pattern-pdf.js';
import {PDFDocument} from './vendor/pdf-lib.esm.min.js';

test('pattern changes and custom edits cannot change earlier rows',()=>{
  const timeline=new PatternTimeline(),draft={id:'custom',threading:[0,1,2,3],picks:[[0,1],[2,3]]},colors=['#112233','#DDEEFF'];
  timeline.add(draft,-1,colors,80);const first=timeline.newest(0);
  draft.threading[0]=3;draft.picks[1][0]=0;colors[0]='#FF0000';
  timeline.add(draft,0,colors,80);timeline.add(getWeave('pond'),0,['#001100','#FFFFAA'],80);
  assert.deepEqual(timeline.newest(2),first);assert.equal(timeline.length,3);
  assert.notDeepEqual(timeline.newest(0),first);
});
test('all rows survive beyond the old screen history limit and a storage round trip',()=>{
  const timeline=new PatternTimeline();
  for(let i=1;i<=4097;i++)timeline.add(getWeave('pond'),-i,['#28594D','#D7E5B3'],100);
  assert.equal(timeline.sections.length,1);assert.equal(timeline.length,4097);
  const restored=new PatternTimeline(JSON.parse(JSON.stringify(timeline)));
  assert.equal([...restored.newestFirst()].length,4097);
  assert.deepEqual(restored.newest(4096),timeline.newest(4096));
});
test('PDF includes every row across page boundaries with a consistent square grid',async()=>{
  const timeline=new PatternTimeline();timeline.add(getWeave('pond'),-1,['#28594D','#D7E5B3'],100,4097);
  const pdf=await PDFDocument.load(await createPatternPDF(timeline.newestFirst(),timeline.width));
  const rowsPerPage=Math.floor((841.89-36)/((595.28-36)/100));
  assert.equal(pdf.getPageCount(),Math.ceil(4097/rowsPerPage));
  assert.match(pdf.getSubject(),/^4097 rows, 100 columns/);
  for(const p of pdf.getPages())assert.deepEqual(p.getSize(),{width:595.28,height:841.89});
});
