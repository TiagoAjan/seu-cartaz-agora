import { createHash } from 'node:crypto';
import { empty } from './model.mjs';
import { assetPattern, assetPrefix } from './cloud-assets.mjs';

export class SupabaseError extends Error {
  constructor(status,service,code) {
    super('Falha de comunicação com o Supabase.');
    this.status=status;
    this.service=service;
    this.code=code;
  }
}
export function makeSupabase({url,key,fetcher=fetch}) {
  const endpoint=new URL(url);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
  if((endpoint.protocol!=='https:' && !(loopback && endpoint.protocol==='http:')) ||
    endpoint.pathname!=='/' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw Error('SUPABASE_URL deve ser a URL do projeto.');
  if(!key || key.startsWith('sb_secret_')) throw Error('Configure uma chave publishable do Supabase.');
  if(key.startsWith('eyJ')) {
    let role;
    try {role=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role;}catch{}
    if(role!=='anon') throw Error('Use a chave publishable ou a anon legada do Supabase.');
  }
  async function call(path,{token,method='GET',body,headers={},raw=false}={}) {
    const response=await fetcher(endpoint.origin+path,{
      method, cache:'no-store', signal:AbortSignal.timeout(18000),
      headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...headers,
        ...(body && !raw ? {'Content-Type':'application/json'}:{})},
      ...(body?{body:raw?body:JSON.stringify(body)}:{})
    });
    if(!response.ok) {
      const detail=await response.json().catch(()=>null);
      throw new SupabaseError(response.status,path.split('/')[1],detail?.code || detail?.error);
    }
    if(raw && method==='GET')return response;
    return response.status===204 ? null : response.json();
  }
  async function workspace(token,account) {
    const rows=await call('/rest/v1/sca_workspaces?select=id,revision,data&limit=1',{token});
    if(!rows.length)return null;
    const row=rows[0];
    const email=account.email || '';
    const name=String(account.user_metadata?.name||account.user_metadata?.full_name||email.split('@')[0]||'Administrador').slice(0,100);
    return {user:{id:account.id,tenant:row.id,email,name,company:row.data.company.name},revision:row.revision,data:{...empty(),...row.data}};
  }
  return {
    login:(email,password)=>call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}),
    refresh:refresh_token=>call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token}}),
    async read(token,account) {
      const user=account || await call('/auth/v1/user',{token});
      return workspace(token,user);
    },
    logout:token=>call('/auth/v1/logout?scope=local',{method:'POST',token}),
    async save(token,revision,data){
      const rows=await call('/rest/v1/sca_workspaces?revision=eq.'+revision+'&select=revision',{
        token,method:'PATCH',body:{data,revision:revision+1},headers:{Prefer:'return=representation'}
      });
      return rows[0] || null;
    },
    async upload(token,value) {
      const {key:path,mime,bytes}=assetFromData(value);
      const user=await call('/auth/v1/user',{token});
      try {
        await call('/storage/v1/object/sca-assets/'+user.id+'/'+path,{method:'POST',token,body:bytes,raw:true,headers:{'Content-Type':mime,'x-upsert':'false'}});
      } catch(error) {
        if(error.status!==409 && !['Duplicate','ResourceAlreadyExists'].includes(error.code))throw error;
      }
      return {url:assetPrefix+path};
    },
    async asset(token,path) {
      if(!assetPattern.test(path))return null;
      const user=await call('/auth/v1/user',{token});
      return call('/storage/v1/object/authenticated/sca-assets/'+user.id+'/'+path,{token,raw:true});
    }
  };
}

export function assetFromData(value) {
  const match=typeof value==='string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match || match[2].length>2796204 || match[2].length%4!==0) throw Error('Imagem inválida ou maior que 2 MB.');
  const bytes=Buffer.from(match[2],'base64');
  const type=match[1];
  const valid=type==='png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):
    type==='jpeg'?bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):
    bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid || bytes.length>2097152) throw Error('Arquivo de imagem inválido ou maior que 2 MB.');
  const name=createHash('sha256').update(bytes).digest('hex');
  return {key:name+'.'+(type==='jpeg'?'jpg':type),mime:'image/'+type,bytes};
}

