const tables=['cohorts','participants','invites','submissions','reports'];
const kinds={cohort:'Angkatan',participant:'Peserta',submission:'Hasil evaluasi',report:'Laporan'};
export async function removeRecord(db,{kind,id,actor}){
 if(!kinds[kind]||!Number.isSafeInteger(id)||id<1)throw Object.assign(Error('Pilihan data tidak valid'),{status:400});
 return db.transaction(async tx=>{
  const table={cohort:'cohorts',participant:'participants',submission:'submissions',report:'reports'}[kind];
  const record=await tx.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
  if(!record)throw Object.assign(Error('Data tidak ditemukan atau sudah dihapus'),{status:404});
  const saved=Object.fromEntries(tables.map(t=>[t,[]]));
  saved[table]=[record];
  if(kind==='cohort'){
   saved.participants=await tx.prepare('SELECT * FROM participants WHERE cohort_id=?').all(id);
   saved.reports=await tx.prepare('SELECT * FROM reports WHERE cohort_id=?').all(id);
  }
  if(kind==='cohort'||kind==='participant'){
   for(const p of saved.participants){
    saved.invites.push(...await tx.prepare('SELECT * FROM invites WHERE participant_id=?').all(p.id));
    saved.submissions.push(...await tx.prepare('SELECT * FROM submissions WHERE participant_id=?').all(p.id));
   }
  }
  if(kind==='submission')saved.invites=await tx.prepare('SELECT * FROM invites WHERE participant_id=? AND type=? AND respondent=?').all(record.participant_id,record.type,record.respondent);
  saved.parents={cohorts:[],participants:[]};
  for(const cohortId of new Set([...saved.participants,...saved.reports].map(row=>row.cohort_id)))if(!saved.cohorts.some(c=>c.id===cohortId)){const parent=await tx.prepare('SELECT id,created FROM cohorts WHERE id=?').get(cohortId);if(parent)saved.parents.cohorts.push(parent)}
  for(const participantId of new Set([...saved.submissions,...saved.invites].map(row=>row.participant_id)))if(!saved.participants.some(p=>p.id===participantId)){const parent=await tx.prepare('SELECT id,created FROM participants WHERE id=?').get(participantId);if(parent)saved.parents.participants.push(parent)}
  const name=record.name||`${kinds[kind]} #${id}`;
  const result=await tx.prepare('INSERT INTO deleted_records(kind,name,body,actor,created) VALUES(?,?,?,?,?)').run(kind,name,JSON.stringify(saved),actor,new Date().toISOString());
  for(const t of [...tables].reverse())for(const row of saved[t])await tx.prepare(`DELETE FROM ${t} WHERE ${t==='invites'?'token':'id'}=?`).run(t==='invites'?row.token:row.id);
  await tx.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(actor,`Menghapus ${kinds[kind]} #${id} ke Data terhapus`,new Date().toISOString());
  return {id:Number(result.lastInsertRowid),counts:Object.fromEntries(tables.map(t=>[t,saved[t].length]))};
 });
}
export async function restoreRecord(db,id,actor){
 if(!Number.isSafeInteger(id)||id<1)throw Object.assign(Error('Pilihan data tidak valid'),{status:400});
 return db.transaction(async tx=>{
  const deleted=await tx.prepare('SELECT * FROM deleted_records WHERE id=?').get(id);
  if(!deleted)throw Object.assign(Error('Data terhapus tidak ditemukan'),{status:404});
  const saved=JSON.parse(deleted.body);
  for(const table of ['cohorts','participants'])for(const parent of saved.parents?.[table]||[]){const current=await tx.prepare(`SELECT id,created FROM ${table} WHERE id=?`).get(parent.id);if(!current||current.created!==parent.created)throw Object.assign(Error('Data induk sudah dihapus atau diganti. Pulihkan data induk yang sesuai terlebih dahulu.'),{status:409})}
  for(const p of saved.participants)if(!saved.cohorts.some(c=>c.id===p.cohort_id)&&!await tx.prepare('SELECT id FROM cohorts WHERE id=?').get(p.cohort_id))throw Object.assign(Error('Pulihkan angkatan induknya terlebih dahulu.'),{status:409});
  for(const s of [...saved.submissions,...saved.invites])if(!saved.participants.some(p=>p.id===s.participant_id)&&!await tx.prepare('SELECT id FROM participants WHERE id=?').get(s.participant_id))throw Object.assign(Error('Pulihkan peserta induknya terlebih dahulu.'),{status:409});
  for(const r of saved.reports)if(!saved.cohorts.some(c=>c.id===r.cohort_id)&&!await tx.prepare('SELECT id FROM cohorts WHERE id=?').get(r.cohort_id))throw Object.assign(Error('Pulihkan angkatan induknya terlebih dahulu.'),{status:409});
  for(const table of tables)for(const row of saved[table]){
   const columns=Object.keys(row);
   await tx.prepare(`INSERT INTO ${table} (${columns.map(c=>`"${c}"`).join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...Object.values(row));
  }
  await tx.prepare('DELETE FROM deleted_records WHERE id=?').run(id);
  await tx.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(actor,`Memulihkan ${deleted.name}`,new Date().toISOString());
  return {ok:true};
 });
}
