/** A high-entropy owner key is required; platform identity headers are not trusted. */
export async function authorized(req:Request, key:unknown):Promise<boolean>{
 if(typeof key!=='string'||key.length<32)return false;
 const supplied=req.headers.get('Authorization');
 if(!supplied?.startsWith('Bearer ')||supplied.length>1024)return false;
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(supplied.slice(7)),digest(key)]);
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
