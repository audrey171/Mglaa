import {PatternTimeline} from './timeline.js';
import {createStreamingPDF} from './pdf-stream.js';
self.onmessage=async({data})=>{
 try{const timeline=new PatternTimeline(data.sections);const blob=await createStreamingPDF(timeline.newestFirst(),data.width,{onProgress:rows=>self.postMessage({rows,total:timeline.length})});self.postMessage({blob});}
 catch(error){self.postMessage({error:error.message});}
};
