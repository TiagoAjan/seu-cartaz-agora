import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { empty } from './model.mjs';
import {validateWorkspace} from './workspace-data.mjs';

const sessionAge = 60 * 60 * 24 * 7;
const hash = value => createHash('sha256').update(value).digest('hex');
const minutes = value => Date.now() + value*60_000;
const file = () => resolve(process.env.CARTAZ_DB || 'data/cartazes.sqlite');
const collections = Object.keys(empty());

export function open(path = file()) {
  mkdirSync(dirname(path), {recursive:true});
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
  if (!db.prepare('PRAGMA user_version').get().user_version) {
    transact(db,()=>{
      db.exec(readFileSync(resolve('db/001-initial.sql'),'utf8'));
      db.exec('PRAGMA user_version=1');
    });
  }
  return db;
}
function transact(db, operation, write=true) {
  db.exec(write?'BEGIN IMMEDIATE':'BEGIN');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
function passwordDigest(password) {
  const salt = randomBytes(16).toString('hex');
  return salt+':'+scryptSync(password,salt,64).toString('hex');
}
const fallbackPassword = '0'.repeat(32)+':'+ '0'.repeat(128);
function passwordMatches(password, stored) {
  const [salt,digest] = stored.split(':');
  return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex'));
}
export function createAdmin(db,{email,name,company,password}) {
  if (![email,name,company,password].every(value=>typeof value==='string')) throw Error('Informe nome, empresa, e-mail e senha.');
  email=email.trim().toLowerCase();
  name=name.trim();
  company=company.trim();
  if (!name || !company || name.length>100 || company.length>150 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length<12 || password.length>200) throw Error('Informe nome, empresa, e-mail válido e senha de 12 a 200 caracteres.');
  const tenant = randomUUID();
  const id = randomUUID();
  transact(db,()=>{
    if (db.prepare('SELECT 1 FROM accounts WHERE email = ?').get(email)) throw Error('E-mail já cadastrado.');
    db.prepare('INSERT INTO tenants (id,name) VALUES (?,?)').run(tenant,company);
    db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?)').run(id,tenant,name,email,passwordDigest(password),Date.now());
    db.prepare('INSERT INTO workspace_records VALUES (?,?,?)').run(tenant,'company',JSON.stringify({name:company,cnpj:'',phone:'',address:''}));
  });
  return {id,tenant,name,email,company};
}
export function login(db,email,password,source='local') {
  if (typeof email!=='string' || typeof password!=='string' || email.length>254 || password.length>200) return null;
  email=email.trim().toLowerCase();
  const userKey=hash('email:'+email);
  const sourceKey=hash('source:'+source);
  const limits=[[userKey,8],[sourceKey,32]];
  db.prepare('DELETE FROM login_attempts WHERE expires_at <= ?').run(Date.now());
  if (limits.some(([key,limit])=>(db.prepare('SELECT count FROM login_attempts WHERE key = ?').get(key)?.count || 0)>=limit)) return null;
  const row = db.prepare('SELECT a.*,t.name AS company FROM accounts a JOIN tenants t ON t.id=a.tenant_id WHERE email = ?').get(email);
  if (!passwordMatches(password,row?.password || fallbackPassword) || !row) {
    const count=db.prepare('INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1');
    for(const [key] of limits) count.run(key,minutes(10));
    return null;
  }
  db.prepare('DELETE FROM login_attempts WHERE key = ?').run(userKey);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),row.id,Date.now()+sessionAge*1000);
  return {token,maxAge:sessionAge,user:{id:row.id,name:row.name,email:row.email,tenant:row.tenant_id,company:row.company}};
}
export function verify(db,token) {
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const row = db.prepare('SELECT a.id,a.tenant_id AS tenant,a.email,a.name,t.name AS company FROM sessions s JOIN accounts a ON a.id=s.account_id JOIN tenants t ON t.id=a.tenant_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now());
  return row || null;
}
export function logout(db,token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
}
export function resetPassword(db,email,password) {
  if (typeof password!=='string' || password.length<12 || password.length>200) throw Error('A senha deve ter de 12 a 200 caracteres.');
  transact(db,()=>{
    const account = db.prepare('SELECT id FROM accounts WHERE email=?').get(email.trim());
    if (!account) throw Error('Conta não encontrada.');
    db.prepare('UPDATE accounts SET password=? WHERE id=?').run(passwordDigest(password),account.id);
    db.prepare('DELETE FROM sessions WHERE account_id=?').run(account.id);
  });
}
export function readWorkspace(db,user) {
  return transact(db,()=>{
    const row=db.prepare('SELECT revision FROM tenants WHERE id=?').get(user.tenant);
  const data=empty();
  for (const record of db.prepare('SELECT collection,content FROM workspace_records WHERE tenant_id=?').all(user.tenant)) {
    if (collections.includes(record.collection)) data[record.collection]=JSON.parse(record.content);
  }
    return {data, revision:row.revision};
  },false);
}
export function saveWorkspace(db,user,revision,data) {
  validateWorkspace(data);
  return transact(db,()=>{
    const updated=db.prepare('UPDATE tenants SET revision=revision+1,name=? WHERE id=? AND revision=?').run(data.company.name,user.tenant,revision);
    if (!updated.changes) return null;
    const save=db.prepare('INSERT INTO workspace_records VALUES (?,?,?) ON CONFLICT(tenant_id,collection) DO UPDATE SET content=excluded.content');
    for (const key of collections) save.run(user.tenant,key,JSON.stringify(data[key]));
    return {revision:revision+1};
  });
}
