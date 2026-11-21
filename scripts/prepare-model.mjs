import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='56a71758b55f0e9f2b4b2d6b51a779a1f882da10';
const folder='public/models/safetyvision-'+revision.slice(0,8);
await mkdir(folder,{recursive:true});
let model;
try{model=await readFile('.cache/ppe-model.onnx')}catch{
 console.log('Downloading pinned PPE model for hosting with EdgeGuard…');
 const response=await fetch(`https://huggingface.co/ayushgupta7777/safetyvision-yolov8/resolve/${revision}/v2/best_640.onnx`,{signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('PPE model download failed: HTTP '+response.status);
 model=Buffer.from(await response.arrayBuffer());
}
if(model.length<40000000||model.length>50000000)throw Error('Unexpected PPE model size');
const checksum=createHash('sha256').update(model).digest('hex');
if(checksum!=='ea18ae903a566e8fa76f3ee1c503075522dca269269315e9c862efa170430b35')throw Error('PPE model checksum mismatch');
const parts=[];for(let start=0;start<model.length;start+=16*1024*1024){const bytes=model.subarray(start,start+16*1024*1024),name=`part-${parts.length}.bin`;await writeFile(folder+'/'+name,bytes);parts.push({name,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
await writeFile(folder+'/manifest.json',JSON.stringify({revision,size:model.length,sha256:checksum,parts}));
console.log(`Prepared ${parts.length} same-origin model assets (${model.length} bytes)`);
