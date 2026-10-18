import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {remoteDatabase} from '../database.mjs';
test('remote adapter preserves SQL bindings and asynchronous row/result semantics',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 const db=remoteDatabase({
  async executeMultiple(sql){assert.doesNotMatch(sql,/PRAGMA/i);sqlite.exec(sql)},
  async execute({sql,args}){
   await new Promise(resolve=>setTimeout(resolve,2));
   const statement=sqlite.prepare(sql);
   if(/^SELECT/.test(sql))return {rows:statement.all(...args),rowsAffected:0};
   const result=statement.run(...args);return {rows:[],rowsAffected:result.changes,lastInsertRowid:result.lastInsertRowid};
  }
 });
 try{
  await db.exec('PRAGMA journal_mode=WAL; CREATE TABLE records(id INTEGER PRIMARY KEY,name TEXT);');
  const result=await db.prepare('INSERT INTO records(name) VALUES(?)').run("O'Brien");
  assert.equal(Number(result.lastInsertRowid),1);assert.equal(result.changes,1);
  assert.equal((await db.prepare('SELECT * FROM records WHERE id=?').get(1)).name,"O'Brien");
  assert.equal(await db.prepare('SELECT * FROM records WHERE id=?').get(2),undefined);
  assert.equal((await db.prepare('SELECT * FROM records').all()).length,1);
 }finally{sqlite.close()}
});
