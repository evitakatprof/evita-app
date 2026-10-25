export function studentAPI({db,hash,requireUser,body,fail,json,audit,now,clean,makeInvite,participantAccess}){
 const profileFields=['name','unit','job','boss','bossJob'];
 async function saveEnrollment(tx,user,profile,cohortId){
  const cohort=await tx.prepare('SELECT * FROM cohorts WHERE id=?').get(cohortId);if(!cohort)fail('Angkatan tidak ditemukan. Hubungi Urmin.',404);
  const existing=await tx.prepare('SELECT id FROM participants WHERE cohort_id=? AND nrp=?').get(cohortId,user.username);
  if(existing)fail('NRP sudah terdaftar pada angkatan ini. Gunakan akun yang sama atau hubungi Urmin.',409);
  const row=await tx.prepare('INSERT INTO participants(cohort_id,name,nrp,unit,job,boss,boss_job,created) VALUES(?,?,?,?,?,?,?,?)').run(cohortId,profile.name,user.username,profile.unit,profile.job,profile.boss,profile.bossJob,now());
  await tx.prepare('INSERT INTO student_enrollments(user_id,participant_id,participant_created) VALUES(?,?,?) ON CONFLICT(user_id,participant_id) DO UPDATE SET participant_created=excluded.participant_created').run(user.id,Number(row.lastInsertRowid),now());
  // Ownership is explicit; registering an NRP never exposes previously entered records.
  const participant=await tx.prepare('SELECT created FROM participants WHERE id=?').get(Number(row.lastInsertRowid));
  await tx.prepare('UPDATE student_enrollments SET participant_created=? WHERE user_id=? AND participant_id=?').run(participant.created,user.id,Number(row.lastInsertRowid));
  return Number(row.lastInsertRowid);
 }
 return async function route(req,res,path){
  if(path==='/api/registration-data'){
   const units=await db.prepare("SELECT value FROM identity_options WHERE kind='unit' UNION SELECT DISTINCT unit AS value FROM participants ORDER BY value").all();
   const jobs=await db.prepare("SELECT value FROM identity_options WHERE kind='job' UNION SELECT DISTINCT job AS value FROM participants ORDER BY value").all();
   return json(res,{cohorts:await db.prepare('SELECT id,name,prodi FROM cohorts ORDER BY id DESC').all(),units:units.map(v=>v.value),jobs:jobs.map(v=>v.value)}),true;
  }
  if(path==='/api/register'&&req.method==='POST'){
   const b=await body(req),nrp=clean(b.nrp,30);if(!/^\d{4,30}$/.test(nrp))fail('NRP harus berupa 4–30 angka.');if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Kata sandi harus 12–128 karakter.');
   for(const field of profileFields)if(!clean(b[field],150))fail('Lengkapi nama, satuan kerja, jabatan, dan identitas atasan.');
   if(!['yes','no'].includes(b.previousTraining))fail('Pilih apakah sudah pernah mengikuti Diklat.');
   const profile=Object.fromEntries([...profileFields,'previousTraining'].map(k=>[k,clean(b[k],150)]));
   const passwordHash=hash(b.password);
   await db.transaction(async tx=>{
    if(await tx.prepare('SELECT id FROM users WHERE username=?').get(nrp))fail('NRP sudah mempunyai akun. Silakan login.',409);
    const account=await tx.prepare("INSERT INTO users(username,hash,role) VALUES(?,?,'student')").run(nrp,passwordHash);const user={id:Number(account.lastInsertRowid),username:nrp};
    await tx.prepare('INSERT INTO student_profiles(user_id,body) VALUES(?,?)').run(user.id,JSON.stringify(profile));
    await saveEnrollment(tx,user,profile,Number(b.cohortId));
    await tx.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(nrp,'Registrasi siswa dan pendaftaran angkatan',now());
   });
   return json(res,{ok:true},201),true;
  }
  if(path==='/api/student'){
   const user=await requireUser(req,'student');const record=await db.prepare('SELECT body FROM student_profiles WHERE user_id=?').get(user.id);
   const participants=await db.prepare('SELECT p.*,c.name cohort,c.prodi FROM student_enrollments e JOIN participants p ON p.id=e.participant_id AND p.created=e.participant_created JOIN cohorts c ON c.id=p.cohort_id WHERE e.user_id=? ORDER BY p.id DESC').all(user.id);
   const evaluations=[];
   for(const p of participants){
    const submissions=await db.prepare('SELECT type,score,created FROM submissions WHERE participant_id=? AND respondent=?').all(p.id,'participant');
    const invitations=await db.prepare("SELECT token,type,expires FROM invites WHERE participant_id=? AND respondent='participant' AND expires>?").all(p.id,Date.now());
    const access=await participantAccess(p);const available=access.status==='approved'?await db.prepare('SELECT DISTINCT type FROM instruments WHERE prodi=?').all(p.prodi):[];
    evaluations.push({...p,access,submissions,invitations:access.status==='approved'?invitations:[],available:available.map(i=>i.type)});
   }
   return json(res,{profile:record?JSON.parse(record.body):{},evaluations}),true;
  }
  if(path==='/api/student-enroll'&&req.method==='POST'){
   const user=await requireUser(req,'student'),b=await body(req);const record=await db.prepare('SELECT body FROM student_profiles WHERE user_id=?').get(user.id);if(!record)fail('Profil siswa belum tersedia.');
   await db.transaction(tx=>saveEnrollment(tx,user,JSON.parse(record.body),Number(b.cohortId)));await audit(user.username,'Mendaftar angkatan tambahan');return json(res,{ok:true}),true;
  }
  if(path==='/api/student-invitation'&&req.method==='POST'){
   const user=await requireUser(req,'student'),b=await body(req);
   const p=await db.prepare('SELECT p.*,c.prodi FROM student_enrollments e JOIN participants p ON p.id=e.participant_id AND p.created=e.participant_created JOIN cohorts c ON c.id=p.cohort_id WHERE e.user_id=? AND p.id=?').get(user.id,Number(b.participantId));
   if(!p)fail('Peserta tidak ditemukan pada akun ini.',403);if(!['pre','post'].includes(b.type))fail('Evaluasi ini memerlukan undangan Urmin.');
   return json(res,await makeInvite(p,b.type,'participant',user.username)),true;
  }
  if(path==='/api/participant-decision'&&req.method==='POST'){
   const user=await requireUser(req,'admin'),b=await body(req);
   if(!['approved','rejected'].includes(b.decision))fail('Keputusan tidak valid.');
   if(b.decision==='rejected'&&!clean(b.note))fail('Catatan perbaikan wajib diisi.');
   await db.transaction(async tx=>{
    const p=await tx.prepare('SELECT * FROM participants WHERE id=?').get(Number(b.participantId));if(!p)fail('Peserta tidak ditemukan.',404);
    if(b.decision==='approved'&&['name','nrp','unit','job','boss','boss_job'].some(k=>!clean(p[k],150)))fail('Identitas peserta dan atasan belum lengkap.');
    await tx.prepare('INSERT INTO participant_access(participant_id,participant_created,status,reviewed_by,reviewed_at,note) VALUES(?,?,?,?,?,?) ON CONFLICT(participant_id,participant_created) DO UPDATE SET status=excluded.status,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,note=excluded.note').run(p.id,p.created,b.decision,user.username,now(),clean(b.note));
    await tx.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(user.username,`Pemeriksaan data peserta #${p.id}: ${b.decision}`,now());
   });return json(res,{ok:true}),true;
  }
  if(path==='/api/student-profile'&&req.method==='POST'){
   const user=await requireUser(req,'student'),b=await body(req);
   for(const field of profileFields)if(!clean(b[field],150))fail('Lengkapi identitas peserta dan atasan.');
   await db.transaction(async tx=>{
    const p=await tx.prepare('SELECT p.* FROM student_enrollments e JOIN participants p ON p.id=e.participant_id AND p.created=e.participant_created WHERE e.user_id=? AND p.id=?').get(user.id,Number(b.participantId));if(!p)fail('Peserta tidak ditemukan pada akun ini.',403);
    const access=await tx.prepare('SELECT status FROM participant_access WHERE participant_id=? AND participant_created=?').get(p.id,p.created);if(access?.status==='approved')fail('Data sudah disetujui. Hubungi Urmin untuk perubahan.',409);
    await tx.prepare('UPDATE participants SET name=?,unit=?,job=?,boss=?,boss_job=? WHERE id=?').run(...profileFields.map(k=>clean(b[k],150)),p.id);
    await tx.prepare("INSERT INTO participant_access(participant_id,participant_created,status,note) VALUES(?,?,'pending','') ON CONFLICT(participant_id,participant_created) DO UPDATE SET status='pending',note='',reviewed_by=NULL,reviewed_at=NULL").run(p.id,p.created);
    const record=await tx.prepare('SELECT body FROM student_profiles WHERE user_id=?').get(user.id);const profile={...JSON.parse(record.body),...Object.fromEntries(profileFields.map(k=>[k,clean(b[k],150)]))};await tx.prepare('UPDATE student_profiles SET body=? WHERE user_id=?').run(JSON.stringify(profile),user.id);
   });await audit(user.username,'Memperbaiki identitas untuk pemeriksaan Urmin');return json(res,{ok:true}),true;
  }
  if(path==='/api/identity-options'&&req.method==='POST'){
   const user=await requireUser(req,'admin'),b=await body(req);if(!['unit','job'].includes(b.kind)||!clean(b.value,150))fail('Jenis dan nama pilihan wajib diisi.');
   await db.prepare('INSERT OR IGNORE INTO identity_options(kind,value) VALUES(?,?)').run(b.kind,clean(b.value,150));await audit(user.username,'Menambah pilihan identitas');return json(res,{ok:true}),true;
  }
  return false;
 };
}
