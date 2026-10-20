import http from 'node:http';
import {openDatabase} from './database.mjs';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import QRCode from 'qrcode';
import {score,delta,achievement} from './scoring.mjs';
import {removeRecord,restoreRecord} from './deletion.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||path.join(root,'data');
const db=await openDatabase(dataDir);
(await db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,hash TEXT,role TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER,expires INTEGER);
CREATE TABLE IF NOT EXISTS instruments(id INTEGER PRIMARY KEY,prodi TEXT,type TEXT,version INTEGER,body TEXT);
CREATE TABLE IF NOT EXISTS cohorts(id INTEGER PRIMARY KEY,name TEXT,prodi TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS participants(id INTEGER PRIMARY KEY,cohort_id INTEGER,name TEXT,nrp TEXT,unit TEXT,job TEXT,boss TEXT,boss_job TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS invites(token TEXT PRIMARY KEY,participant_id INTEGER,type TEXT,respondent TEXT,instrument_id INTEGER,expires INTEGER);
CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY,token TEXT UNIQUE,participant_id INTEGER,type TEXT,respondent TEXT,instrument_id INTEGER,body TEXT,score REAL,status TEXT DEFAULT 'submitted',review TEXT DEFAULT '',created TEXT);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,cohort_id INTEGER,summary TEXT,recommendation TEXT DEFAULT '',created TEXT);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT,action TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS deleted_records(id INTEGER PRIMARY KEY,kind TEXT,name TEXT,body TEXT,actor TEXT,created TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS instrument_version ON instruments(prodi,type,version);
CREATE UNIQUE INDEX IF NOT EXISTS submission_respondent ON submissions(participant_id,type,respondent);
CREATE UNIQUE INDEX IF NOT EXISTS participant_identity ON participants(cohort_id,nrp);`));
const now=()=>new Date().toISOString();
const audit=async(actor,action)=>(await db.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(actor,action,now()));
function hash(password,salt=randomBytes(16).toString('hex')) {return salt+':'+scryptSync(password,salt,64).toString('hex')}
function verify(password,stored){const [salt,key]=stored.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex'))}
if(!(await db.prepare('SELECT id FROM users LIMIT 1').get())) {
 if(process.env.TURSO_DATABASE_URL && (String(process.env.ADMIN_PASSWORD||'').length<12 || String(process.env.LEADER_PASSWORD||'').length<12)) throw Error('Database online baru memerlukan ADMIN_PASSWORD dan LEADER_PASSWORD berbeda, minimal 12 karakter.');
 if(process.env.TURSO_DATABASE_URL && process.env.ADMIN_PASSWORD===process.env.LEADER_PASSWORD) throw Error('Gunakan kata sandi yang berbeda untuk kedua akun.');
 const creds={admin:process.env.ADMIN_PASSWORD||randomBytes(9).toString('base64url'),pimpinan:process.env.LEADER_PASSWORD||randomBytes(9).toString('base64url')};
 for(const [username,password] of Object.entries(creds)) (await db.prepare('INSERT OR IGNORE INTO users(username,hash,role) VALUES(?,?,?)').run(username,hash(password),username==='admin'?'admin':'leader'));
 if(!process.env.TURSO_DATABASE_URL) writeFileSync(path.join(dataDir,'akses-awal.txt'),`AKSES LOKAL AWAL — jangan dibagikan\nAdmin Urmin\nUsername: admin\nPassword: ${creds.admin}\n\nKabagkatprof\nUsername: pimpinan\nPassword: ${creds.pimpinan}\n\nGanti kata sandi melalui menu akun setelah masuk.\n`);
}
const types=['pre','post','followup','performance'];
for(const prodi of ['DPDKN','DPMKN']) for(const type of types) if(!(await db.prepare('SELECT id FROM instruments WHERE prodi=? AND type=?').get(prodi,type))) {
 const label=prodi==='DPDKN'?'Deck':'Mesin';
 const questions=['pre','post'].includes(type)?[
 {text:`[CONTOH ${label}] Apa langkah awal sebelum menjalankan pekerjaan berisiko?`,options:['Langsung bekerja','Memeriksa prosedur dan keselamatan','Menunggu masalah'],key:1},
 {text:'[CONTOH] Bagaimana temuan gangguan didokumentasikan?',options:['Dicatat dan dilaporkan sesuai prosedur','Diabaikan','Disampaikan tanpa catatan'],key:0}
 ]:type==='followup'?['Kesesuaian Diklat dengan jabatan dan tugas','Penerapan pengetahuan dan keterampilan di satuan kerja','Perubahan perilaku kerja setelah Diklat','Kemampuan menerapkan kompetensi secara mandiri'].map(text=>({text:'[CONTOH] '+text})): [{text:'[CONTOH] Jelaskan kontribusi kompetensi Diklat terhadap kualitas, produktivitas, dan efektivitas tugas.'},{text:'[CONTOH] Jelaskan bukti hasil kerja dan tindak lanjut yang diperlukan.'}];
 (await db.prepare('INSERT OR IGNORE INTO instruments(prodi,type,version,body) VALUES(?,?,1,?)').run(prodi,type,JSON.stringify({title:`Instrumen contoh ${label}`,sample:true,questions})));
}
const clean=(v,max=3000)=>String(v??'').trim().slice(0,max);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const publicInstrument=(row,keys=false)=>({...row,body:undefined,...JSON.parse(row.body),questions:JSON.parse(row.body).questions.map(q=>keys?q:(({key,...rest})=>rest)(q))});
const latest=async(prodi,type)=>(await db.prepare('SELECT * FROM instruments WHERE prodi=? AND type=? ORDER BY version DESC LIMIT 1').get(prodi,type));
const sessions=new Map();
async function body(req){if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>3800000)fail('Ukuran permintaan terlalu besar',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail('Isian permintaan tidak valid')}}
async function userFor(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('evita='))?.slice(6);return (await db.prepare('SELECT users.id,username,role FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(token||'',Date.now()))}
async function requireUser(req,role){const user=(await userFor(req));if(!user)fail('Silakan masuk terlebih dahulu',401);if(role&&user.role!==role)fail('Akses tidak diizinkan',403);return user}
async function inviteFor(token){const inv=(await db.prepare('SELECT * FROM invites WHERE token=?').get(token));if(!inv||inv.expires<Date.now())fail('Undangan tidak ditemukan atau sudah kedaluwarsa',404);return inv}
async function rows(){return (await db.prepare(`SELECT s.*,p.name,p.nrp,p.unit,p.job,p.boss,c.name cohort,c.prodi FROM submissions s JOIN participants p ON p.id=s.participant_id JOIN cohorts c ON c.id=p.cohort_id ORDER BY s.id DESC`).all()).map(s=>({...s,token:undefined,body:JSON.parse(s.body)}))}
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
const port=Number(process.env.PORT||3010);
export async function handler(req,res){try{
 const url=new URL(req.url,'http://localhost');const route=url.pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)fail('Origin tidak diizinkan',403);
 if(route==='/api/login'&&req.method==='POST'){
  const key=req.socket.remoteAddress;const attempt=sessions.get(key)||{count:0,start:Date.now()};if(Date.now()-attempt.start>600000){attempt.count=0;attempt.start=Date.now()}if(++attempt.count>20)fail('Terlalu banyak percobaan. Coba 10 menit lagi.',429);sessions.set(key,attempt);
  const b=await body(req),u=(await db.prepare('SELECT * FROM users WHERE username=?').get(clean(b.username,80)));if(!u||!verify(String(b.password||''),u.hash))fail('Username atau kata sandi salah',401);
  const token=randomBytes(32).toString('hex');(await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,u.id,Date.now()+8*3600000));res.setHeader('Set-Cookie',`evita=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${(process.env.COOKIE_SECURE==='1'||process.env.VERCEL)?'; Secure':''}`);(await audit(u.username,'Masuk'));return json(res,{username:u.username,role:u.role});
 }
 if(route==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/evita=([a-f0-9]+)/)?.[1];(await db.prepare('DELETE FROM sessions WHERE token=?').run(token||''));res.setHeader('Set-Cookie','evita=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,{ok:true})}
 if(route==='/api/me')return json(res,(await userFor(req))||null);
 if(route==='/api/password'&&req.method==='POST'){const u=(await requireUser(req)),b=await body(req),stored=(await db.prepare('SELECT hash FROM users WHERE id=?').get(u.id));if(!verify(String(b.current||''),stored.hash))fail('Kata sandi lama salah');if(String(b.password||'').length<12)fail('Kata sandi baru minimal 12 karakter');(await db.prepare('UPDATE users SET hash=? WHERE id=?').run(hash(b.password),u.id));(await db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id));(await audit(u.username,'Mengubah kata sandi'));return json(res,{ok:true})}
 if(route==='/api/invite'){
  const inv=(await inviteFor(url.searchParams.get('token')));const p=(await db.prepare('SELECT p.*,c.name cohort,c.prodi FROM participants p JOIN cohorts c ON c.id=p.cohort_id WHERE p.id=?').get(inv.participant_id));const instrument=publicInstrument((await db.prepare('SELECT * FROM instruments WHERE id=?').get(inv.instrument_id)));const sent=(await db.prepare('SELECT id,created FROM submissions WHERE token=?').get(inv.token));return json(res,{participant:p,instrument,type:inv.type,respondent:inv.respondent,expires:inv.expires,sent});
 }
 if(route==='/api/submit'&&req.method==='POST'){
  const b=await body(req),inv=(await inviteFor(b.token));if((await db.prepare('SELECT id FROM submissions WHERE token=? OR (participant_id=? AND type=? AND respondent=?)').get(inv.token,inv.participant_id,inv.type,inv.respondent)))fail('Evaluasi untuk pengisi ini sudah dikirim',409);
  const i=publicInstrument((await db.prepare('SELECT * FROM instruments WHERE id=?').get(inv.instrument_id)),true);
  if(!Array.isArray(b.answers)||b.answers.length!==i.questions.length)fail('Lengkapi semua pertanyaan');
  if(['pre','post'].includes(inv.type)&&b.answers.some((a,n)=>!Number.isInteger(a)||a<0||a>=i.questions[n].options.length))fail('Pilihan jawaban tidak valid');
  if(inv.type==='followup'&&b.answers.some(a=>!Number.isInteger(a)||a<1||a>5))fail('Skor harus antara 1 dan 5');
  if(inv.type==='performance'&&b.answers.some(a=>typeof a!=='string'||!a.trim()||a.length>3000))fail('Jawaban uraian wajib diisi (maksimal 3000 karakter)');
  if(!clean(b.job)||!clean(b.respondentName))fail('Nama pengisi dan jabatan saat evaluasi wajib diisi');
  const metrics=inv.type==='performance'?(b.metrics||[]).map(m=>{const target=m.target===''?null:Number(m.target),actual=m.actual===''?null:Number(m.actual);if(!clean(m.name)||!(target>0)||!Number.isFinite(actual)||actual<0)fail('Indikator numerik memerlukan target > 0 dan realisasi ≥ 0');return {name:clean(m.name),unit:clean(m.unit,80),target,actual,achievement:achievement(actual,target)}}):[];
  if(metrics.length>20)fail('Maksimal 20 indikator');
  const files=(b.files||[]).map(f=>{if(!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data||''))fail('Berkas tidak valid');const buffer=Buffer.from(f.data,'base64');if(buffer.length>1*1024*1024)fail('Maksimal 1 MB per berkas');const pdf=f.type==='application/pdf'&&buffer.subarray(0,5).toString()==='%PDF-';const png=f.type==='image/png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const jpg=f.type==='image/jpeg'&&buffer[0]===255&&buffer[1]===216;if(!pdf&&!png&&!jpg)fail('Bukti harus berupa PDF, PNG, atau JPEG yang valid');return {name:clean(f.name,150),type:f.type,data:f.data}});
  if(files.length>2)fail('Maksimal 2 berkas');
  const payload={answers:b.answers,job:clean(b.job),respondentName:clean(b.respondentName,150),notes:clean(b.notes),metrics,files};
  const result=(await db.prepare('INSERT INTO submissions(token,participant_id,type,respondent,instrument_id,body,score,created) VALUES(?,?,?,?,?,?,?,?)').run(inv.token,inv.participant_id,inv.type,inv.respondent,inv.instrument_id,JSON.stringify(payload),score(i,b.answers),now()));(await audit('responden',`Mengirim evaluasi #${result.lastInsertRowid}`));return json(res,{id:Number(result.lastInsertRowid)},201);
 }
 if(route==='/api/dashboard'){
  (await requireUser(req));const participants=(await db.prepare('SELECT p.*,c.name cohort,c.prodi FROM participants p JOIN cohorts c ON c.id=p.cohort_id ORDER BY p.id DESC').all());const submissions=(await rows());
  const comparisons=participants.map(p=>{const pre=submissions.find(s=>s.participant_id===p.id&&s.type==='pre'),post=submissions.find(s=>s.participant_id===p.id&&s.type==='post');return {...p,pre:pre?.score??null,post:post?.score??null,delta:delta(pre?.score,post?.score)}});
  return json(res,{cohorts:(await db.prepare('SELECT * FROM cohorts ORDER BY id DESC').all()),participants,submissions:submissions.map(s=>({...s,body:{...s.body,files:s.body.files.map(f=>({name:f.name,type:f.type}))}})),comparisons,reports:(await db.prepare('SELECT r.*,c.name cohort,c.prodi FROM reports r JOIN cohorts c ON c.id=r.cohort_id ORDER BY r.id DESC').all()),audit:(await db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 30').all())});
 }
 if(route==='/api/submission'){(await requireUser(req));const s=(await db.prepare('SELECT * FROM submissions WHERE id=?').get(Number(url.searchParams.get('id'))));if(!s)fail('Hasil tidak ditemukan',404);return json(res,{instrument:publicInstrument((await db.prepare('SELECT * FROM instruments WHERE id=?').get(s.instrument_id)),true)})}
 if(route==='/api/cohorts'&&req.method==='POST'){const u=(await requireUser(req,'admin')),b=await body(req);if(!clean(b.name)||!['DPDKN','DPMKN'].includes(b.prodi))fail('Nama dan prodi wajib diisi');const r=(await db.prepare('INSERT INTO cohorts(name,prodi,created) VALUES(?,?,?)').run(clean(b.name,150),b.prodi,now()));(await audit(u.username,'Membuat angkatan'));return json(res,{id:Number(r.lastInsertRowid)},201)}
 if(route==='/api/participants'&&req.method==='POST'){const u=(await requireUser(req,'admin')),b=await body(req);if(!(await db.prepare('SELECT id FROM cohorts WHERE id=?').get(Number(b.cohortId))))fail('Angkatan tidak ditemukan');for(const k of ['name','nrp','unit','job','boss','bossJob'])if(!clean(b[k]))fail('Lengkapi identitas peserta dan atasan');if((await db.prepare('SELECT id FROM participants WHERE cohort_id=? AND nrp=?').get(Number(b.cohortId),clean(b.nrp))))fail('NRP sudah terdaftar pada angkatan ini');const r=(await db.prepare('INSERT INTO participants(cohort_id,name,nrp,unit,job,boss,boss_job,created) VALUES(?,?,?,?,?,?,?,?)').run(Number(b.cohortId),clean(b.name),clean(b.nrp),clean(b.unit),clean(b.job),clean(b.boss),clean(b.bossJob),now()));(await audit(u.username,'Menambah peserta'));return json(res,{id:Number(r.lastInsertRowid)},201)}
 if(route==='/api/instruments'&&req.method==='GET'){(await requireUser(req,'admin'));return json(res,await Promise.all(['DPDKN','DPMKN'].flatMap(p=>types.map(async t=>publicInstrument((await latest(p,t)),true)))))}
 if(route==='/api/instruments'&&req.method==='POST'){
  const u=(await requireUser(req,'admin')),b=await body(req);if(!['DPDKN','DPMKN'].includes(b.prodi)||!types.includes(b.type)||!clean(b.title)||!Array.isArray(b.questions)||!b.questions.length||b.questions.length>100)fail('Instrumen tidak valid');
  const questions=b.questions.map(q=>{if(!clean(q.text))fail('Teks pertanyaan wajib diisi');if(['pre','post'].includes(b.type)){if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(o=>!clean(o))||!Number.isInteger(q.key)||q.key<0||q.key>=q.options.length)fail('Pilihan/kunci jawaban tidak valid');return {text:clean(q.text),options:q.options.map(o=>clean(o,500)),key:q.key}}return {text:clean(q.text)}});
  const version=(await latest(b.prodi,b.type)).version+1;(await db.prepare('INSERT INTO instruments(prodi,type,version,body) VALUES(?,?,?,?)').run(b.prodi,b.type,version,JSON.stringify({title:clean(b.title,200),sample:b.sample!==false,questions})));(await audit(u.username,`Menerbitkan instrumen ${b.prodi}/${b.type} v${version}`));return json(res,{ok:true,version});
 }
 if(route==='/api/invitations'&&req.method==='POST'){
  const u=(await requireUser(req,'admin')),b=await body(req);const p=(await db.prepare('SELECT p.*,c.prodi FROM participants p JOIN cohorts c ON c.id=p.cohort_id WHERE p.id=?').get(Number(b.participantId)));if(!p||!types.includes(b.type)||!['participant','supervisor'].includes(b.respondent)||(['pre','post'].includes(b.type)&&b.respondent!=='participant'))fail('Penugasan tidak valid');
  if((await db.prepare('SELECT id FROM submissions WHERE participant_id=? AND type=? AND respondent=?').get(p.id,b.type,b.respondent)))fail('Penilaian untuk responden ini sudah dikirim');
  const instrument=(await latest(p.prodi,b.type));let inv=(await db.prepare('SELECT * FROM invites WHERE participant_id=? AND type=? AND respondent=? AND expires>? AND instrument_id=? ORDER BY expires DESC LIMIT 1').get(p.id,b.type,b.respondent,Date.now(),instrument.id));
  if(!inv){const token=randomBytes(24).toString('hex'),expires=Date.now()+7*86400000;(await db.prepare('INSERT INTO invites VALUES(?,?,?,?,?,?)').run(token,p.id,b.type,b.respondent,instrument.id,expires));inv={token,expires}}
  const deploymentHost=process.env.VERCEL_ENV==='production'?(process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL):process.env.VERCEL_URL;
  const base=process.env.PUBLIC_URL||(deploymentHost?`https://${deploymentHost}`:`http://localhost:${port}`);const link=`${base.replace(/\/$/,'')}/?invite=${inv.token}`;(await audit(u.username,`Membuat undangan ${p.id}/${b.type}/${b.respondent}`));return json(res,{link,qr:await QRCode.toDataURL(link,{width:280,margin:2}),expires:inv.expires,sample:JSON.parse(instrument.body).sample});
 }
 if(route==='/api/review'&&req.method==='POST'){const u=(await requireUser(req,'admin')),b=await body(req);if(!(await db.prepare('SELECT id FROM submissions WHERE id=?').get(Number(b.id))))fail('Hasil tidak ditemukan',404);if(!clean(b.review))fail('Catatan pemeriksaan wajib diisi');(await db.prepare("UPDATE submissions SET status='reviewed',review=? WHERE id=?").run(clean(b.review),Number(b.id)));(await audit(u.username,`Memeriksa hasil #${b.id}`));return json(res,{ok:true})}
 if(route==='/api/reports'&&req.method==='POST'){const u=(await requireUser(req,'admin')),b=await body(req);if(!clean(b.summary)||!(await db.prepare('SELECT id FROM cohorts WHERE id=?').get(Number(b.cohortId))))fail('Angkatan dan kesimpulan wajib diisi');(await db.prepare('INSERT INTO reports(cohort_id,summary,created) VALUES(?,?,?)').run(Number(b.cohortId),clean(b.summary,10000),now()));(await audit(u.username,'Menerbitkan laporan kepada Kabagkatprof'));return json(res,{ok:true})}
 if(route==='/api/recommendation'&&req.method==='POST'){const u=(await requireUser(req,'leader')),b=await body(req);if(!clean(b.text)||!(await db.prepare('SELECT id FROM reports WHERE id=?').get(Number(b.id))))fail('Laporan dan rekomendasi wajib diisi');(await db.prepare('UPDATE reports SET recommendation=? WHERE id=?').run(clean(b.text,10000),Number(b.id)));(await audit(u.username,`Memberikan rekomendasi laporan #${b.id}`));return json(res,{ok:true})}
 if(route==='/api/evidence'){(await requireUser(req));const s=(await db.prepare('SELECT body FROM submissions WHERE id=?').get(Number(url.searchParams.get('id'))));const f=s&&JSON.parse(s.body).files[Number(url.searchParams.get('index'))];if(!f)fail('Berkas tidak ditemukan',404);res.writeHead(200,{'Content-Type':f.type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'no-store'});return res.end(Buffer.from(f.data,'base64'))}
 if(route==='/api/delete'&&req.method==='POST'){const u=await requireUser(req,'admin'),b=await body(req);return json(res,await removeRecord(db,{kind:b.kind,id:Number(b.id),actor:u.username}))}
 if(route==='/api/trash'){await requireUser(req,'admin');return json(res,await db.prepare('SELECT id,kind,name,actor,created FROM deleted_records ORDER BY id DESC').all())}
 if(route==='/api/restore'&&req.method==='POST'){const u=await requireUser(req,'admin'),b=await body(req);return json(res,await restoreRecord(db,Number(b.id),u.username))}
 if(route.startsWith('/api/'))fail('Endpoint tidak ditemukan',404);
 const allowed={'/':'index.html','/app.js':'app.js','/login-view.js':'login-view.js','/login-art.jpeg':'login-art.jpeg','/app-header.jpeg':'app-header.jpeg','/question-editor.js':'question-editor.js','/styles.css':'styles.css','/brand.png':'brand.png'};const file=allowed[route];if(!file||!existsSync(path.join(root,'public',file)))fail('Halaman tidak ditemukan',404);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.jpeg')?'image/jpeg':file.endsWith('.png')?'image/png':'text/html; charset=utf-8','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"});res.end(readFileSync(path.join(root,'public',file)));
 }catch(error){if(/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/.test(error.message)){error.status=409;error.message='Data sudah tersimpan atau sedang diperbarui. Muat ulang sebelum mencoba lagi.'}if(!error.status)console.error(error);if(!res.headersSent)json(res,{error:error.status?error.message:'Terjadi kesalahan server'},error.status||500);else res.end()}}
if(!process.env.VERCEL && process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=http.createServer(handler);
 server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`EVITA KATPROF: http://localhost:${port}\nAkses awal lokal: data/akses-awal.txt\nInstrumen bawaan merupakan CONTOH, bukan instrumen resmi.`));
}


