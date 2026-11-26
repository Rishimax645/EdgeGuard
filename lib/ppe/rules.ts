import config from '../../ppe-model.json';
type Spec={classes:string[];map:Record<string,string>;thresholds:Record<string,number>};
const models=config.models as Record<string,Spec>;
// Build-time PPE_MODEL override is applied by prepare-model; the manifest id is checked in the worker.
export const MODEL_ID:string=config.active;
export const SPEC:Spec=models[MODEL_ID];
export const LABELS=SPEC.classes;
export type Detection={label:string;score:number;x:number;y:number;w:number;h:number};
export type Evidence={label:string;confidence:number;samples:number;duration_ms:number;model:string};
/** Decodes YOLOv8/YOLO11 output [1, 4+classes, anchors]; returns canonical labels Hardhat/NO-Hardhat/Gloves/NO-Gloves/Person. */
export function decode(data:Float32Array,dims:readonly number[],width:number,height:number,spec:Spec=SPEC):Detection[]{
 const nc=spec.classes.length;
 if(dims.length!==3||dims[0]!==1||dims[1]!==4+nc)throw Error('Unsupported PPE model output');
 const n=dims[2],scale=Math.min(640/width,640/height),px=Math.floor((640-Math.round(width*scale))/2),py=Math.floor((640-Math.round(height*scale))/2);const boxes:Detection[]=[];
 for(let i=0;i<n;i++){let cls=0,score=0;for(let c=0;c<nc;c++){const v=data[(c+4)*n+i];if(v>score){score=v;cls=c}}
  const label=spec.map[spec.classes[cls]];if(!label||score<(spec.thresholds[label]??.5))continue;
  const x=Math.max(0,(data[i]-data[2*n+i]/2-px)/scale),y=Math.max(0,(data[n+i]-data[3*n+i]/2-py)/scale);
  const right=Math.min(width,(data[i]+data[2*n+i]/2-px)/scale),bottom=Math.min(height,(data[n+i]+data[3*n+i]/2-py)/scale);
  if(right>x&&bottom>y)boxes.push({label,score,x,y,w:right-x,h:bottom-y});}
 const iou=(a:Detection,b:Detection)=>{const inter=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return inter/(a.w*a.h+b.w*b.h-inter)};
 const keep:Detection[]=[];for(const b of boxes.sort((a,b)=>b.score-a.score).slice(0,300)){
  // Same-class NMS, plus cross-class suppression between a positive and its negative (e.g. Gloves vs NO-Gloves on one hand).
  const pair=(l:string)=>l.startsWith('NO-')?l.slice(3):'NO-'+l;
  if(!keep.some(a=>(a.label===b.label&&iou(a,b)>.45)||(a.label===pair(b.label)&&iou(a,b)>.5)))keep.push(b);if(keep.length>=40)break}
 return keep;
}
export class Confirmation{
 private history=new Map<string,{start:number;last:number;count:number;score:number}>();
 reset(){this.history.clear()}
 update(boxes:Detection[],now:number,helmet=true,gloves=true):Evidence[]{const result:Evidence[]=[];
 for(const label of ['NO-Hardhat','NO-Gloves']){const b=boxes.find(b=>b.label===label);if(!b||(label==='NO-Hardhat'?!helmet:!gloves)){this.history.delete(label);continue}
 let h=this.history.get(label);if(!h||now-h.last>10000)h={start:now,last:now,count:0,score:0};h.last=now;h.count++;h.score=Math.max(h.score,b.score);this.history.set(label,h);
 if(h.count>=3&&now-h.start>=2000)result.push({label,confidence:h.score,samples:h.count,duration_ms:now-h.start,model:MODEL_ID});}return result;}
}
