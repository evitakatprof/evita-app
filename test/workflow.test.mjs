import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
test('full workflow enforces roles, versions, scoring and final submission',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'evita-test-'));
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3019',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin-password',LEADER_PASSWORD:'test-leader-password'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),8000).unref())]);
  async function req(route,body,cookie){const r=await fetch('http://127.0.0.1:3019/api/'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
  assert.equal((await req('dashboard')).status,401);
  const admin=(await req('login',{username:'admin',password:'test-admin-password'})).cookie;
  const leader=(await req('login',{username:'pimpinan',password:'test-leader-password'})).cookie;
  assert.ok(admin);assert.ok(leader);
  assert.equal((await req('cohorts',{name:'Angkatan uji',prodi:'DPDKN'},leader)).status,403);
  const cohort=(await req('cohorts',{name:'Angkatan uji',prodi:'DPDKN'},admin)).body.id;
  const person=(await req('participants',{cohortId:cohort,name:'Peserta Uji',nrp:'123',unit:'Satker',job:'Petugas',boss:'Atasan',bossJob:'Kepala'},admin)).body.id;
  const invite=(await req('invitations',{participantId:person,type:'pre',respondent:'participant'},admin)).body;
  assert.match(invite.qr,/^data:image\/png;base64,/);const token=new URL(invite.link).searchParams.get('invite');
  const form=(await req('invite?token='+token)).body;assert.equal(form.instrument.questions[0].key,undefined);
  const original=form.instrument.id;
  assert.equal((await req('instruments',{prodi:'DPDKN',type:'pre',title:'Versi baru',sample:true,questions:[{text:'Butir baru',options:['A','B'],key:0}]},admin)).status,200);
  const secondInvite=(await req('invitations',{participantId:person,type:'pre',respondent:'participant'},admin)).body;
  assert.equal((await req('invite?token='+token)).body.instrument.id,original);
  const submission={token,answers:[1,0],respondentName:'Peserta Uji',job:'Petugas',notes:'',metrics:[],files:[]};
  assert.equal((await req('submit',{...submission,answers:[8,0]})).status,400);
  const sent=await req('submit',submission);assert.equal(sent.status,201);
  assert.equal((await req('submit',submission)).status,409);
  assert.equal((await req('submit',{...submission,token:new URL(secondInvite.link).searchParams.get('invite'),answers:[0]})).status,409);
  let dashboard=(await req('dashboard',null,admin)).body;assert.equal(dashboard.comparisons[0].pre,100);assert.equal(dashboard.comparisons[0].delta,null);
  assert.equal((await req('review',{id:sent.body.id,review:'Diperiksa'},leader)).status,403);
  assert.equal((await req('review',{id:sent.body.id,review:'Diperiksa'},admin)).status,200);
  const post=(await req('invitations',{participantId:person,type:'post',respondent:'participant'},admin)).body;
  assert.equal((await req('submit',{...submission,token:new URL(post.link).searchParams.get('invite'),answers:[0,0]})).status,201);
  dashboard=(await req('dashboard',null,admin)).body;assert.equal(dashboard.comparisons[0].delta,-50);
  for(const respondent of ['participant','supervisor']){
   const follow=(await req('invitations',{participantId:person,type:'followup',respondent},admin)).body;
   assert.equal((await req('submit',{...submission,token:new URL(follow.link).searchParams.get('invite'),answers:[1,2,3,4]})).status,201);
  }
  dashboard=(await req('dashboard',null,leader)).body;assert.equal(dashboard.submissions.filter(s=>s.type==='followup').length,2);
  const performance=(await req('invitations',{participantId:person,type:'performance',respondent:'supervisor'},admin)).body;
  const performancePayload={...submission,token:new URL(performance.link).searchParams.get('invite'),answers:['Kompetensi diterapkan dalam tugas.','Bukti dilampirkan.'],metrics:[{name:'Tugas selesai',unit:'dokumen',actual:12,target:0}],files:[{name:'bukti.pdf',type:'application/pdf',data:Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}]};
  assert.equal((await req('submit',performancePayload)).status,400);
  performancePayload.metrics[0].target=10;
  const performanceSent=await req('submit',performancePayload);assert.equal(performanceSent.status,201);
  const evidence=await fetch(`http://127.0.0.1:3019/api/evidence?id=${performanceSent.body.id}&index=0`,{headers:{cookie:admin}});assert.equal(evidence.status,200);assert.equal(evidence.headers.get('content-type'),'application/pdf');
  dashboard=(await req('dashboard',null,admin)).body;const performanceResult=dashboard.submissions.find(s=>s.id===performanceSent.body.id);assert.equal(performanceResult.body.metrics[0].achievement,120);assert.equal(performanceResult.score,null);assert.equal(performanceResult.body.files[0].data,undefined);
  assert.equal((await req('submission?id='+performanceSent.body.id,null,admin)).body.instrument.questions.length,2);
  assert.equal((await req('reports',{cohortId:cohort,summary:'Kesimpulan uji'},admin)).status,200);
  const report=(await req('dashboard',null,leader)).body.reports[0];
  assert.equal((await req('recommendation',{id:report.id,text:'Tindak lanjut'},admin)).status,403);
  assert.equal((await req('recommendation',{id:report.id,text:'Tindak lanjut'},leader)).status,200);
  assert.equal((await req('evidence?id=1&index=0')).status,401);
 }finally{child.kill();await once(child,'exit');rmSync(dir,{recursive:true,force:true})}
});
