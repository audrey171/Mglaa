// Store one immutable draft per continuous section, not one copy per beat.
// Sections are chronological; the display and export read newest rows first.
export function snapshotRow(draft,phase,colors,width){
  const pick=draft.picks[((phase%draft.picks.length)+draft.picks.length)%draft.picks.length];
  return {mask:draft.threading.map(shaft=>pick.includes(shaft)),colors:[...colors],width};
}
export class PatternTimeline{
  constructor(sections=[]){
    this.sections=[];this.length=0;this.width=0;
    for(const section of sections){
      const {draft,colors,width,phase,count}=section;
      if(!Number.isSafeInteger(count)||count<1||!Number.isInteger(phase)||!Number.isInteger(width)||width<1||width>10000||!Array.isArray(colors)||colors.length!==2||!colors.every(c=>/^#[0-9a-f]{6}$/i.test(c))||!Array.isArray(draft?.threading)||!draft.threading.length||!draft.threading.every(n=>Number.isInteger(n)&&n>=0&&n<4)||!Array.isArray(draft.picks)||!draft.picks.length||!draft.picks.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<4)))throw new Error('Invalid pattern timeline');
      this.add(draft,phase,colors,width,count);
    }
  }
  add(draft,phase,colors,width,count=1){
    const copy={id:draft.id,threading:[...draft.threading],picks:draft.picks.map(p=>[...p])};
    const key=JSON.stringify([copy,colors,width]),last=this.sections.at(-1);
    if(last&&last.key===key&&phase===last.phase-last.count){last.count+=count;last.end+=count;}
    else this.sections.push({draft:copy,colors:[...colors],width,phase,count,key,end:this.length+count});
    this.length+=count;this.width=Math.max(this.width,width);
  }
  newest(index){
    const chronological=this.length-1-index;
    if(chronological<0||chronological>=this.length)return null;
    let lo=0,hi=this.sections.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(this.sections[mid].end<=chronological)lo=mid+1;else hi=mid;}
    const s=this.sections[lo],offset=chronological-(s.end-s.count);
    return snapshotRow(s.draft,s.phase-offset,s.colors,s.width);
  }
  *newestFirst(){
    for(let i=this.sections.length-1;i>=0;i--){const s=this.sections[i];for(let row=s.count-1;row>=0;row--)yield snapshotRow(s.draft,s.phase-row,s.colors,s.width);}
  }
  toJSON(){return this.sections.map(({draft,colors,width,phase,count})=>({draft,colors,width,phase,count}));}
}
