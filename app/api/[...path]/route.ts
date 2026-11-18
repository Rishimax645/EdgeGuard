import {env} from 'cloudflare:workers';
const defaults={temperature:50,mq135:1500,mq2:1500,telegram:false};
function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
async function cfg(key:string,fallback:any=null){const row=await env.DB!.prepare('SELECT value FROM configs WHERE key=?').bind(key).first<{value:string}>();return row?JSON.parse(row.value):fallback}
async function put(key:string,value:unknown){await env.DB!.prepare('INSERT INTO configs(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run()}
async function telegram(method:string,body:unknown){const token=(env as any).TELEGRAM_BOT_TOKEN;if(!token)throw Error('Telegram bot token is not configured on the server.');const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const j:any=await r.json();if(!j.ok)throw Error('Telegram request failed. Check bot credentials, recipient and bot access.');return j.result}
async function addEvent(kind:string,title:string,detail:string,mode='demo',state='active'){
 const id=crypto.randomUUID();await env.DB!.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?)').bind(id,Date.now(),kind,title,detail,mode,state,'not requested').run();return id;
}
async function notify(id:string,title:string,detail:string,mode:string){
 const settings=await cfg('settings',defaults),chat=await cfg('telegram_chat');if(!settings.telegram||!chat)return;
 let state='accepted';try{await telegram('sendMessage',{chat_id:chat,text:`${mode==='demo'?'TEST • ':''}EdgeGuard\n${title}\n${detail}\n${new Date().toISOString()}`})}catch{state='failed'}
 await env.DB!.prepare('UPDATE events SET notification=? WHERE id=?').bind(state,id).run();
}
export async function GET(req:Request){
 if(!req.headers.get('oai-authenticated-user-id'))return response({error:'Sign in to access this workspace.'},401);
 try{const settings=await cfg('settings',defaults);const events=await env.DB!.prepare('SELECT * FROM events ORDER BY created DESC LIMIT 300').all();const rows=await env.DB!.prepare('SELECT * FROM readings ORDER BY created DESC LIMIT 120').all();return response({settings,events:events.results,readings:rows.results,telegram:{configured:!!(env as any).TELEGRAM_BOT_TOKEN,linked:!!await cfg('telegram_chat')}})}catch{return response({error:'Workspace storage is unavailable. Please retry.'},503)}
}
export async function POST(req:Request){
 const path=new URL(req.url).pathname.split('/').pop();
 const signed=!!req.headers.get('oai-authenticated-user-id');
 if(path==='readings'){
  const key=(env as any).DEVICE_API_KEY;
  if(!key||req.headers.get('Authorization')!==`Bearer ${key}`)return response({error:'Device credential required.'},401);
 }else if(!signed)return response({error:'Sign in required.'},401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return response({error:'Invalid origin'},403);
 if(Number(req.headers.get('content-length')||0)>8192)return response({error:'Payload too large'},413);
 try{
 const body=await req.json() as any;
 if(path==='settings'){
  const s={temperature:Number(body.temperature),mq135:Number(body.mq135),mq2:Number(body.mq2),telegram:body.telegram===true};
  if(!Number.isFinite(s.temperature)||s.temperature<0||s.temperature>300||!Number.isFinite(s.mq135)||s.mq135<1||s.mq135>2500||!Number.isFinite(s.mq2)||s.mq2<1||s.mq2>2500)return response({error:'Temperature must be 0–300 °C; gas thresholds 1–2500 mV.'},400);
  await put('settings',s);return response({ok:true});
 }
 if(path==='incident'){
  const scenarios:any={gas:['Gas signal elevated','MQ-2 simulated signal exceeded the configured demonstration threshold.'],temperature:['Probe temperature elevated','Simulated probe temperature exceeded the demonstration threshold.'],ppe:['PPE check requires attention','Manually simulated missing glove. This is not a camera detection.'],offline:['Device connection interrupted','Simulated device loss. No hardware is currently connected.']};
  const pair=scenarios[body.scenario];if(!pair)return response({error:'Unknown scenario'},400);
  const existing=await env.DB!.prepare("SELECT id FROM events WHERE kind=? AND mode='demo' AND state IN ('active','acknowledged')").bind(body.scenario).first();if(existing)return response({ok:true,deduplicated:true});
  const id=await addEvent(body.scenario,pair[0],pair[1]);await notify(id,pair[0],pair[1],'demo');return response({ok:true});
 }
 if(path==='event'){
  if(!['acknowledged','resolved'].includes(body.state)||typeof body.id!=='string')return response({error:'Invalid event update'},400);
  await env.DB!.prepare("UPDATE events SET state=? WHERE id=? AND state!='resolved'").bind(body.state,body.id).run();return response({ok:true});
 }
 if(path==='telegram-link'){
  const me=await telegram('getMe',{});const code=crypto.randomUUID().replaceAll('-','');await put('link',{code,expires:Date.now()+600000});return response({url:`https://t.me/${me.username}?start=${code}`});
 }
 if(path==='telegram-verify'){
  const pending=await cfg('link');if(!pending||Date.now()>pending.expires)return response({error:'Create a new connection link; the old one expired.'},400);
  const updates=await telegram('getUpdates',{limit:100,timeout:0});
  const match=updates.find((u:any)=>u.message?.chat?.type==='private'&&u.message?.text===`/start ${pending.code}`&&u.message.date*1000>pending.expires-600000);
  if(!match)return response({error:'Press Start in the bot, then verify again. Use a dedicated bot with no webhook.'},400);
  await put('telegram_chat',String(match.message.chat.id));await put('link',null);return response({ok:true});
 }
 if(path==='telegram-disconnect'){await put('telegram_chat',null);await put('link',null);return response({ok:true})}
 if(path==='telegram-test'){
  const chat=await cfg('telegram_chat');if(!chat)return response({error:'Connect your Telegram account first.'},400);
  const last=await cfg('last_test',0);if(Date.now()-last<10000)return response({error:'Wait 10 seconds before another test.'},429);
  await put('last_test',Date.now());await telegram('sendMessage',{chat_id:chat,text:'TEST • EdgeGuard\nYour notification connection is working. No real hazard has been detected.'});
  const id=await addEvent('notification','Telegram test accepted','Telegram accepted the test message. Read status is unavailable.','demo','resolved');await env.DB!.prepare('UPDATE events SET notification=? WHERE id=?').bind('accepted',id).run();return response({ok:true});
 }
 if(path==='readings'){
  if(body.device_id!=='edgeguard-01'||typeof body.boot_id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(body.boot_id)||!Number.isSafeInteger(body.sequence)||body.sequence<0)return response({error:'Invalid device identity or sequence'},400);
  const ranges:any={temperature_c:[-200,1300],pressure_hpa:[300,1100],mq135_adc_mv:[0,2500],mq2_adc_mv:[0,2500]};
  for(const [k,v] of Object.entries(ranges) as any){if(body[k]!==null&&(typeof body[k]!=='number'||!Number.isFinite(body[k])||body[k]<v[0]||body[k]>v[1]))return response({error:`Invalid ${k}`},400)}
  const prior=await cfg('device_sequence');
  if(prior?.boot===body.boot_id && body.sequence<=prior.sequence)return response({ok:true,ignored:'duplicate or out of order'});
  const id=`${body.boot_id}:${body.sequence}`;
  const result=await env.DB!.prepare('INSERT OR IGNORE INTO readings VALUES(?,?,?)').bind(id,Date.now(),JSON.stringify(body)).run();
  if(result.meta.changes){
   await put('device_sequence',{boot:body.boot_id,sequence:body.sequence});
   const previousSample=await cfg('last_live_sample',0);await put('last_live_sample',Date.now());
   const s=await cfg('settings',defaults);
   for(const [key,limit,name] of [['temperature_c',s.temperature,'Probe temperature'],['mq135_adc_mv',s.mq135,'MQ-135 signal'],['mq2_adc_mv',s.mq2,'MQ-2 signal']] as const){
    const kind=`live_${key}`,old=await cfg(kind,{since:0,event:null});
    if(Date.now()-previousSample>10000)old.since=0;
    if(body[key]===null){await put(kind,{since:0,event:old.event});continue}
    if(body[key]>limit){if(!old.since)old.since=Date.now();if(Date.now()-old.since>=5000&&!old.event){old.event=await addEvent(kind,`${name} threshold exceeded`,`${body[key]} exceeds configured demo limit ${limit}.`,'live');await notify(old.event,`${name} threshold exceeded`,String(body[key]),'live')}await put(kind,old)}
    else if(body[key]<limit*0.95){if(old.event)await env.DB!.prepare("UPDATE events SET state='resolved' WHERE id=?").bind(old.event).run();await put(kind,{since:0,event:null})}
   }
   await env.DB!.prepare('DELETE FROM readings WHERE id NOT IN (SELECT id FROM readings ORDER BY created DESC LIMIT 2000)').run();
  }
  return response({ok:true});
 }
 return response({error:'Unknown action'},404);
 }catch(e){return response({error:e instanceof Error?e.message:'Request failed'},400)}
}
