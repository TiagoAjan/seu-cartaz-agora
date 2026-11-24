import { NextResponse } from 'next/server';
import { cloudSelected, getCloud, postCloud } from '@/lib/cloud-route.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookie = 'sca_session';
const maxLocalBytes = 32*1024*1024;
const maxCloudBytes = 3*1024*1024;
const respond = (data,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function sameOrigin(req) {
  const origin=req.headers.get('origin');
  if (!origin) return false;
  const host=req.headers.get('host');
  const expected=process.env.CARTAZ_ORIGIN || (host && req.nextUrl.protocol+'//'+host);
  return origin===expected;
}
async function json(req,maxBytes) {
  const sizeLabel=Math.floor(maxBytes/(1024*1024))+' MB';
  if (!req.headers.get('content-type')?.startsWith('application/json') || Number(req.headers.get('content-length'))>maxBytes) throw Error('Corpo da solicitação inválido ou maior que '+sizeLabel+'.');
  let size=0;
  const chunks=[];
  for await (const part of req.body || []) {
    size+=part.byteLength;
    if (size>maxBytes) throw Error('Espaço de trabalho maior que '+sizeLabel+'.');
    chunks.push(Buffer.from(part));
  }
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!body || typeof body!=='object' || Array.isArray(body))throw Error('Solicitação inválida.');
  return body;
}
export async function GET(req) {
  if(cloudSelected())return getCloud(req);
  const {open,verify,readWorkspace}=await import('@/lib/db.mjs');
  const db=open();
  try {
    const user=verify(db,req.cookies.get(cookie)?.value);
    return respond(user?{user,...readWorkspace(db,user)}:{user:null});
  } finally {db.close();}
}
export async function POST(req) {
  if (!sameOrigin(req)) return respond({error:'Origem da solicitação não autorizada.'},403);
  let payload;
  const cloud=cloudSelected();
  try {payload=await json(req,cloud?maxCloudBytes:maxLocalBytes);} catch(error) {return respond({error:error.message},400);}
  if(cloud)return postCloud(req,payload);
  const {open,login,logout,verify,readWorkspace,saveWorkspace}=await import('@/lib/db.mjs');
  const db=open();
  try {
    const current=req.cookies.get(cookie)?.value;
    if (payload.action==='login') {
      const result=login(db,payload.email,payload.password);
      if (!result) return respond({error:'Credenciais inválidas ou limite de tentativas temporariamente atingido.'},401);
      if(current) logout(db,current);
      const res=respond({user:result.user,...readWorkspace(db,result.user)});
      res.cookies.set(cookie,result.token,{httpOnly:true,sameSite:'strict',path:'/',secure:process.env.CARTAZ_SECURE_COOKIE==='true',maxAge:result.maxAge});
      return res;
    }
    if(payload.action==='logout') {
      logout(db,current);
      const res=respond({user:null});
      res.cookies.delete(cookie);
      return res;
    }
    const user=verify(db,current);
    if (!user) return respond({error:'Entre na sua conta para salvar.'},401);
    if (payload.action==='save') {
      const saved=saveWorkspace(db,user,payload.revision,payload.data);
      return saved?respond(saved):respond({error:'Os dados foram atualizados em outra aba. Recarregue antes de salvar.'},409);
    }
    return respond({error:'Operação inválida.'},400);
  } catch(error) {
    return respond({error:error.message},400);
  } finally {db.close();}
}
