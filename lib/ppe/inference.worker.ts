import * as ort from 'onnxruntime-web/wasm';
import {decode} from './rules';
let session:ort.InferenceSession;
self.onmessage=async({data})=>{try{
 if(data.type==='load'){
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=data.runtime;
 self.postMessage({type:'status',text:'Downloading PPE model (about 43 MB)…'});
 const r=await fetch('https://huggingface.co/ayushgupta7777/safetyvision-yolov8/resolve/56a71758b55f0e9f2b4b2d6b51a779a1f882da10/v2/best_640.onnx',{signal:AbortSignal.timeout(180000)});
 if(!r.ok)throw Error('Model download failed. Check your internet connection.');
 session=await ort.InferenceSession.create(await r.arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});self.postMessage({type:'ready'});
 }else if(data.type==='frame'){
 const bitmap:ImageBitmap=data.bitmap,w=bitmap.width,h=bitmap.height,scale=Math.min(640/w,640/h),dw=Math.round(w*scale),dh=Math.round(h*scale);
 const canvas=new OffscreenCanvas(640,640),ctx=canvas.getContext('2d')!;ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,640,640);ctx.drawImage(bitmap,Math.floor((640-dw)/2),Math.floor((640-dh)/2),dw,dh);bitmap.close();
 const pixels=ctx.getImageData(0,0,640,640).data,plane=640*640,input=new Float32Array(plane*3);
 for(let i=0;i<plane;i++){input[i]=pixels[4*i]/255;input[plane+i]=pixels[4*i+1]/255;input[2*plane+i]=pixels[4*i+2]/255}
 const tensor=new ort.Tensor('float32',input,[1,3,640,640]);const outputs=await session.run({[session.inputNames[0]]:tensor});const output=outputs[session.outputNames[0]];
 const boxes=decode(output.data as Float32Array,output.dims,w,h);tensor.dispose();Object.values(outputs).forEach(t=>t.dispose());self.postMessage({type:'result',boxes,width:w,height:h});
 }
 }catch(e){data.bitmap?.close();self.postMessage({type:'error',text:e instanceof Error?e.message:'PPE detection failed'});}};
