// Cache only integrity-checked model parts, keyed by immutable model revision.
export async function modelPart(url:string,part:{size:number;sha256:string},cache:Cache|null,status:(text:string)=>void,label:string):Promise<Uint8Array>{
 async function valid(bytes:Uint8Array){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))).map(b=>b.toString(16).padStart(2,'0')).join('');return bytes.length===part.size&&hash===part.sha256}
 try{const saved=await cache?.match(url);if(saved){const bytes=new Uint8Array(await saved.arrayBuffer());if(await valid(bytes)){status('Loading saved AI model · '+label);return bytes}await cache?.delete(url)}}catch{/* Storage can be unavailable; continue with download. */}
 status('Downloading AI model · '+label);
 let response:Response;try{response=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('HTTP '+response.status)}catch(e){throw Error('Model '+label+' download failed: '+(e instanceof Error?e.message:'network error'))}
 const bytes=new Uint8Array(await response.arrayBuffer());if(!await valid(bytes))throw Error('Model '+label+' is incomplete. Retry AI.');
 try{await cache?.put(url,new Response(bytes as BodyInit));}catch{status('Model loaded · browser storage is full or unavailable; it may download again')}
 return bytes;
}
