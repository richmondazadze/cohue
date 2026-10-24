import { Mastra } from '@mastra/core/mastra';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { LibSQLStore } from '@mastra/libsql';
import { z } from 'zod';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
const [engine, action] = process.argv.slice(2);
if (engine === 'custom') {
 const db = new DatabaseSync('./custom.db');
 db.exec('CREATE TABLE IF NOT EXISTS mission (id TEXT PRIMARY KEY, state TEXT, objective TEXT, activations INTEGER DEFAULT 0)');
 if(action==='start') {
  db.prepare('INSERT INTO mission(id,state,objective) VALUES(?,?,?)').run('mission-1','AWAITING_APPROVAL','accessibility collaboration');
 } else if(action==='resume') {
  db.prepare("UPDATE mission SET state='ACTIVATED',activations=activations+1 WHERE id=? AND state='AWAITING_APPROVAL'").run('mission-1');
 }
 const row=db.prepare('SELECT * FROM mission WHERE id=?').get('mission-1');
 assert.equal(row.objective,'accessibility collaboration');
 assert.equal(row.state,action==='start'?'AWAITING_APPROVAL':'ACTIVATED');
 assert.equal(row.activations,action==='start'?0:1);
 console.log(JSON.stringify({engine,action,...row})); db.close();
} else {
 const schema=z.object({missionId:z.string(),objective:z.string()});
 const approval=createStep({id:'approval',inputSchema:schema,outputSchema:schema,
 resumeSchema:z.object({approved:z.boolean()}),execute:async({inputData,resumeData,suspend})=>{
  if(!resumeData?.approved) return await suspend({missionId:inputData.missionId});
  return inputData;
 }});
 const activation=createStep({id:'activate',inputSchema:schema,outputSchema:z.object({missionId:z.string(),state:z.string(),objective:z.string()}),execute:async({inputData})=>({...inputData,state:'ACTIVATED'})});
 const workflow=createWorkflow({id:'approval-spike',inputSchema:schema,outputSchema:activation.outputSchema}).then(approval).then(activation).commit();
 const storage=new LibSQLStore({id:'spike-storage',url:'file:./mastra.db'});
 const mastra=new Mastra({storage,workflows:{approval:workflow}});
 const wf=mastra.getWorkflow('approval');
 if(action==='inspect') {
  const state=await wf.getWorkflowRunById('mission-run-1');
  assert.equal(state.status,'suspended');
  console.log(JSON.stringify({engine,action,status:state.status}));
 } else {
  const run=await wf.createRun({runId:'mission-run-1'});
  const result=action==='start'?await run.start({inputData:{missionId:'mission-1',objective:'accessibility collaboration'}}):await run.resume({step:'approval',resumeData:{approved:action!=='reject'}});
  assert.equal(result.status,action==='start'||action==='reject'?'suspended':'success');
  if(action==='resume') {assert.equal(result.result.state,'ACTIVATED');assert.equal(result.result.objective,'accessibility collaboration');}
  console.log(JSON.stringify({engine,action,status:result.status,result:result.result}));
 }
 await storage.close();
}
