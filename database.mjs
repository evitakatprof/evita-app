import {mkdirSync} from 'node:fs';
import path from 'node:path';

export function remoteDatabase(client) {
  return {
    async exec(sql) { await client.executeMultiple(sql.replace(/PRAGMA[^;]*;/gi,'')); },
    prepare(sql) {
      const execute = args => client.execute({sql,args});
      return {
        async get(...args) { return (await execute(args)).rows[0]; },
        async all(...args) { return (await execute(args)).rows; },
        async run(...args) { const result=await execute(args);return {changes:result.rowsAffected,lastInsertRowid:result.lastInsertRowid}; }
      };
    }
  };
}

export async function openDatabase(dataDir) {
  if (process.env.TURSO_DATABASE_URL) {
    if (!process.env.TURSO_AUTH_TOKEN) throw Error('TURSO_AUTH_TOKEN wajib diatur untuk database online.');
    const url = new URL(process.env.TURSO_DATABASE_URL);
    if (!['libsql:','https:','wss:'].includes(url.protocol)) throw Error('Gunakan koneksi database terenkripsi (libsql/https/wss).');
    const {createClient}=await import('@libsql/client/web');
    return remoteDatabase(createClient({url:url.href,authToken:process.env.TURSO_AUTH_TOKEN,intMode:'number'}));
  }
  if (process.env.VERCEL) throw Error('Deployment Vercel memerlukan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN. SQLite sementara tidak digunakan.');
  mkdirSync(dataDir,{recursive:true});
  const {DatabaseSync}=await import('node:sqlite');
  return new DatabaseSync(path.join(dataDir,'evita.sqlite'));
}
