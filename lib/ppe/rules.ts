export const MODEL_ID='safetyvision-v2-640-56a71758';
export const LABELS=['Fall-Detected','Gloves','Goggles','Hardhat','Mask','NO-Gloves','NO-Goggles','NO-Hardhat','NO-Mask','NO-Safety Vest','No_Harness','Person','Safety Vest'];
export type Detection={label:string;score:number;x:number;y:number;w:number;h:number};
export type Evidence={label:string;confidence:number;samples:number;duration_ms:number;model:string};
export function decode(data:Float32Array,dims:readonly number[],width:number,height:number):Detection[]{
 if(dims.length!==3||dims[0]!==1||dims[1]!==17)throw Error('Unsupported PPE model output');
 const n=dims[2],scale=Math.min(640/width,640/height),px=Math.floor((640-Math.round(width*scale))/2),py=Math.floor((640-Math.round(height*scale))/2);const boxes:Detection[]=[];
 for(let i=0;i<n;i++){let cls=0,score=0;for(let c=0;c<13;c++){if(data[(c+4)*n+i]>score){score=data[(c+4)*n+i];cls=c}}
 if(score<.5||![1,3,5,7,11].includes(cls))continue;
 const x=Math.max(0,(data[i]-data[2*n+i]/2-px)/scale),y=Math.max(0,(data[n+i]-data[3*n+i]/2-py)/scale);
 const right=Math.min(width,(data[i]+data[2*n+i]/2-px)/scale),bottom=Math.min(height,(data[n+i]+data[3*n+i]/2-py)/scale);
 if(right>x&&bottom>y)boxes.push({label:LABELS[cls],score,x,y,w:right-x,h:bottom-y});}
 const keep:Detection[]=[];for(const b of boxes.sort((a,b)=>b.score-a.score).slice(0,300)){if(!keep.some(a=>{if(a.label!==b.label)return false;const inter=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return inter/(a.w*a.h+b.w*b.h-inter)>.45}))keep.push(b);if(keep.length>=40)break}return keep;
}
export class Confirmation{
 private history=new Map<string,{start:number;last:number;count:number;score:number}>();
 reset(){this.history.clear()}
 update(boxes:Detection[],now:number,helmet=true,gloves=true):Evidence[]{const result:Evidence[]=[];
 for(const label of ['NO-Hardhat','NO-Gloves']){const b=boxes.find(b=>b.label===label&&b.score>=.5);if(!b||(label==='NO-Hardhat'?!helmet:!gloves)){this.history.delete(label);continue}
 let h=this.history.get(label);if(!h||now-h.last>10000)h={start:now,last:now,count:0,score:0};h.last=now;h.count++;h.score=Math.max(h.score,b.score);this.history.set(label,h);
 if(h.count>=3&&now-h.start>=2000)result.push({label,confidence:h.score,samples:h.count,duration_ms:now-h.start,model:MODEL_ID});}return result;}
}
