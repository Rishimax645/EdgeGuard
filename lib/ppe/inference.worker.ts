import * as ort from 'onnxruntime-web/wasm';
import {decode} from './rules';
let session:ort.InferenceSession;
self.onmessage=async({data})=>{try{
 if(data.type==='load'){
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=data.runtime;
 self.postMessage({type:'status',text:'Loading AI files from EdgeGuard…'});
 const folder=new URL('/models/safetyvision-56a71758/',data.runtime);
 async function getFile(url:URL){try{const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('HTTP '+r.status);return r}catch(e){throw Error('Cannot download '+url.pathname+': '+(e instanceof Error?e.message:'network failure'))}}
 const manifest=await (await getFile(new URL('manifest.json',folder))).json() as {revision:string;size:number;parts:{name:string;size:number;sha256:string}[]};
 if(manifest.revision!=='56a71758b55f0e9f2b4b2d6b51a779a1f882da10'||!Array.isArray(manifest.parts)||manifest.parts.length!==3||manifest.size<40000000||manifest.size>50000000)throw Error('PPE model manifest is invalid. Reload the latest deployment.');
 const model=new Uint8Array(manifest.size);let offset=0;
 for(let i=0;i<manifest.parts.length;i++){
  const part=manifest.parts[i];if(part.name!==`part-${i}.bin`)throw Error('Invalid model asset name');
  self.postMessage({type:'status',text:`Downloading AI model · part ${i+1} of ${manifest.parts.length}`});
  const bytes=new Uint8Array(await (await getFile(new URL(part.name,folder))).arrayBuffer());
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==part.size||hash!==part.sha256)throw Error('AI model download is incomplete. Retry AI.');
  model.set(bytes,offset);offset+=bytes.length;
 }
 if(offset!==model.length)throw Error('AI model size mismatch');
 self.postMessage({type:'status',text:'Starting AI runtime…'});
 try{session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'})}catch(e){throw Error('AI runtime failed to initialize: '+(e instanceof Error?e.message:String(e)))}
 self.postMessage({type:'ready'});
 }else if(data.type==='frame'){
 const bitmap:ImageBitmap=data.bitmap,w=bitmap.width,h=bitmap.height,scale=Math.min(640/w,640/h),dw=Math.round(w*scale),dh=Math.round(h*scale);
 const canvas=new OffscreenCanvas(640,640),ctx=canvas.getContext('2d')!;ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,640,640);ctx.drawImage(bitmap,Math.floor((640-dw)/2),Math.floor((640-dh)/2),dw,dh);bitmap.close();
 const pixels=ctx.getImageData(0,0,640,640).data,plane=640*640,input=new Float32Array(plane*3);
 for(let i=0;i<plane;i++){input[i]=pixels[4*i]/255;input[plane+i]=pixels[4*i+1]/255;input[2*plane+i]=pixels[4*i+2]/255}
 const tensor=new ort.Tensor('float32',input,[1,3,640,640]);const outputs=await session.run({[session.inputNames[0]]:tensor});const output=outputs[session.outputNames[0]];
 const boxes=decode(output.data as Float32Array,output.dims,w,h);tensor.dispose();Object.values(outputs).forEach(t=>t.dispose());self.postMessage({type:'result',boxes,width:w,height:h});
 }
 }catch(e){data.bitmap?.close();self.postMessage({type:'error',text:e instanceof Error?e.message:'PPE detection failed'});}};
