'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import PpeWorker from '../lib/ppe/inference.worker?worker';
import {Confirmation,type Detection,type Evidence} from '../lib/ppe/rules';
type Props={video:RefObject<HTMLVideoElement|null>;helmet:boolean;gloves:boolean;onViolation:(e:Evidence)=>Promise<void>};
export default function PpeMonitor({video,helmet,gloves,onViolation}:Props){
 const [status,setStatus]=useState('Loading PPE model…'),[error,setError]=useState(''),[retry,setRetry]=useState(0),[boxes,setBoxes]=useState<Detection[]>([]),[size,setSize]=useState([640,480]),[warning,setWarning]=useState('');
 const latest=useRef({helmet,gloves,onViolation});latest.current={helmet,gloves,onViolation};
 useEffect(()=>{let disposed=false,ready=false,inflight=false,last=0;const confirmation=new Confirmation(),sent=new Map<string,number>();let worker:Worker;
 setError('');setStatus('Loading PPE model…');setBoxes([]);setWarning('');
 try{worker=new PpeWorker();}catch(e){setError('Cannot start PPE engine: '+(e instanceof Error?e.message:'Worker unavailable'));return}
 const fail=(message:string)=>{if(disposed)return;ready=false;inflight=false;confirmation.reset();setBoxes([]);setWarning('');setError(message);worker.terminate()};
 worker.onerror=()=>fail('PPE engine could not start. Check model access, then retry.');
 const loadTimeout=setTimeout(()=>fail('Model loading timed out. Check your internet connection and retry.'),210000);
 worker.onmessage=({data})=>{if(disposed)return;if(data.type==='error'){clearTimeout(loadTimeout);fail(data.text);return}if(data.type==='status'){setStatus(data.text);return}if(data.type==='ready'){clearTimeout(loadTimeout);ready=true;setStatus('AI ready · show your head and hands');return}
 if(data.type==='result'){inflight=false;if(document.hidden){confirmation.reset();setBoxes([]);setWarning('');return}setBoxes(data.boxes);setSize([data.width,data.height]);
 const confirmed=confirmation.update(data.boxes,Date.now(),latest.current.helmet,latest.current.gloves);
 setWarning(confirmed.map(e=>e.label==='NO-Hardhat'?'Possible missing helmet':'Possible missing gloves').join(' · '));
 const relevant=data.boxes.filter((b:Detection)=>b.label!=='Person');setStatus(relevant.length?'AI running · review highlighted detections':'Unable to assess PPE · move closer; show head and hands');
 for(const e of confirmed){const now=Date.now();if(now-(sent.get(e.label)||0)<60000)continue;sent.set(e.label,now);latest.current.onViolation(e).catch(()=>{if(!disposed){setError('Warning detected, but saving or notification failed. Check the connection.');sent.set(e.label,Date.now()-45000)}})}
 }};
 worker.postMessage({type:'load',runtime:new URL('/ort/',location.origin).href});
 const timer=setInterval(async()=>{if(document.hidden){confirmation.reset();setBoxes([]);setWarning('');setStatus('Paused while this tab is hidden');return}if(inflight&&Date.now()-last>30000){fail('PPE inference timed out. Retry or close other heavy applications.');return}const v=video.current;if(!ready||inflight||!v||v.readyState<2)return;inflight=true;last=Date.now();try{const bitmap=await createImageBitmap(v);if(disposed){bitmap.close();return}worker.postMessage({type:'frame',bitmap},[bitmap])}catch{fail('Cannot read the camera frame. Restart the camera.')}},500);
 return()=>{disposed=true;clearTimeout(loadTimeout);clearInterval(timer);worker.terminate()};
 },[retry,video]);
 return <><svg className="ppe-overlay" viewBox={`0 0 ${size[0]} ${size[1]}`} preserveAspectRatio="xMidYMid meet" aria-label="PPE detections">{boxes.map((b,i)=><g key={i} stroke={b.label.startsWith('NO-')?'#ff5e62':'#45e6a5'}><rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" strokeWidth={3}/><text x={b.x+4} y={Math.max(20,b.y+20)} fill="white" stroke="black" strokeWidth={.5} fontSize={18}>{b.label} {Math.round(b.score*100)}%</text></g>)}</svg><div className={'ppe-status '+(error?'ppe-error':'')} role={error?'alert':'status'}>{error||status}{error&&<button onClick={()=>setRetry(x=>x+1)}>Retry AI</button>}</div>{warning&&<div className="ppe-warning" role="alert">{warning} — check now</div>}</>;
}
