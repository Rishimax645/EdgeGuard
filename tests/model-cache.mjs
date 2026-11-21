import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
const js=ts.transpileModule(fs.readFileSync('lib/ppe/model-cache.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {modelPart}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const bytes=new Uint8Array([1,2,3]),part={size:3,sha256:createHash('sha256').update(bytes).digest('hex')};
let stored=null,downloads=0;const cache={match:async()=>stored?.clone(),put:async(u,r)=>{stored=r.clone()},delete:async()=>{stored=null}};
const original=globalThis.fetch;globalThis.fetch=async()=>{downloads++;return new Response(bytes)};
try{
 await modelPart('https://example.test/model',part,cache,()=>{},'1');assert.equal(downloads,1);
 await modelPart('https://example.test/model',part,cache,()=>{},'1');assert.equal(downloads,1,'Reopen must not download');
 stored=new Response(new Uint8Array([9]));await modelPart('https://example.test/model',part,cache,()=>{},'1');assert.equal(downloads,2,'Corrupt cache must be replaced');
 await modelPart('https://example.test/model',part,null,()=>{},'1');assert.equal(downloads,3,'No storage still permits inference');
 stored=null;globalThis.fetch=async()=>new Response(new Uint8Array([8]));await assert.rejects(()=>modelPart('https://example.test/model',part,cache,()=>{},'1'));assert.equal(stored,null,'Invalid download must not be cached');
 console.log('PASS: first download, reuse without fetch, corrupted-cache recovery, storage fallback and integrity failure');
}finally{globalThis.fetch=original}
