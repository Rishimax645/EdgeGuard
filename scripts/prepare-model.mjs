// Downloads (or reuses) the active PPE ONNX model from ppe-model.json, verifies it,
// and splits it into same-origin parts under public/models/ppe/.
// Override the active model with PPE_MODEL=<id>, or drop a local file at .cache/<id>.onnx.
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile('ppe-model.json','utf8'));
const id=process.env.PPE_MODEL||config.active,spec=config.models[id];
if(!spec)throw Error('Unknown PPE model '+id);
const folder='public/models/ppe';
const local='.cache/'+id+'.onnx';
let model;
try{model=await readFile(spec.path||local);console.log('Using local PPE model '+(spec.path||local))}catch{
 console.log('Downloading PPE model '+id+'…');
 const r=await fetch(spec.url,{signal:AbortSignal.timeout(300000)});
 if(!r.ok)throw Error(`PPE model download failed (HTTP ${r.status}) from ${spec.url}. Train it with training/train_ppe.ipynb and upload it as a GitHub release asset, or put it at ${local}.`);
 model=Buffer.from(await r.arrayBuffer());
 await mkdir('.cache',{recursive:true});await writeFile(local,model);
}
if(model.length<1e6||model.length>200e6)throw Error('Unexpected PPE model size '+model.length);
const sha256=createHash('sha256').update(model).digest('hex');
if(spec.sha256&&spec.sha256!==sha256)throw Error('PPE model checksum mismatch for '+id);
if(!spec.sha256)console.warn(`Note: pin "sha256": "${sha256}" for ${id} in ppe-model.json`);
await rm(folder,{recursive:true,force:true});await mkdir(folder,{recursive:true});
const parts=[];for(let s=0;s<model.length;s+=16*1024*1024){const b=model.subarray(s,s+16*1024*1024),name=`part-${parts.length}.bin`;await writeFile(folder+'/'+name,b);parts.push({name,size:b.length,sha256:createHash('sha256').update(b).digest('hex')})}
await writeFile(folder+'/manifest.json',JSON.stringify({id,size:model.length,sha256,parts}));
console.log(`Prepared ${parts.length} model part(s) for ${id} (${model.length} bytes)`);
