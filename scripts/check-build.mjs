import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const files=['server.mjs','database.mjs','scoring.mjs','api/index.mjs','public/app.js','public/question-editor.js','public/login-view.js'];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(1)}
for(const file of ['public/index.html','public/styles.css','public/brand.png','public/login-art.jpeg','public/app-header.jpeg'])if(!existsSync(file))throw Error(`Missing asset: ${file}`);
JSON.parse(readFileSync('vercel.json','utf8'));
if(process.env.VERCEL){
 for(const name of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','ADMIN_PASSWORD','LEADER_PASSWORD'])if(!process.env[name])throw Error(`Set ${name} in Vercel Environment Variables, then redeploy.`);
 for(const name of ['ADMIN_PASSWORD','LEADER_PASSWORD'])if(process.env[name].length<12)throw Error(`${name} must contain at least 12 characters.`);
 if(process.env.ADMIN_PASSWORD===process.env.LEADER_PASSWORD)throw Error('Use different passwords for admin and leader.');
 if(!['libsql:','https:','wss:'].includes(new URL(process.env.TURSO_DATABASE_URL).protocol))throw Error('Use an encrypted database URL.');
}
console.log('Build checks passed. Static assets and Vercel API entrypoint are ready.');
