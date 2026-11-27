import {NextResponse} from 'next/server';
import {makeSupabase,SupabaseError} from './supabase.mjs';
import {validateWorkspace} from './workspace-data.mjs';

const access='sca_access';
const refresh='sca_refresh';
const refreshAge=7*86400;
const unauthorized=error=>error instanceof SupabaseError && [400,401,403,422].includes(error.status);
const response=(body,status=200)=>NextResponse.json({cloud:true,...body},{
  status,headers:{'Cache-Control':'private, no-store','Netlify-CDN-Cache-Control':'no-store'}
});

export function cloudSelected() {
  return Boolean(process.env.CARTAZ_REQUIRE_SUPABASE==='1'||process.env.CARTAZ_STORAGE==='supabase'||process.env.SUPABASE_URL||process.env.SUPABASE_PUBLISHABLE_KEY);
}
function cloudAccount(req) {
  const client=makeSupabase({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY});
  const accessToken=req.cookies.get(access)?.value;
  const refreshToken=req.cookies.get(refresh)?.value;
  const cookieOptions={httpOnly:true,sameSite:'strict',secure:process.env.CARTAZ_ORIGIN?.startsWith('https:') ||
    req.nextUrl.protocol==='https:' || process.env.CARTAZ_REQUIRE_SUPABASE==='1',path:'/'};
  function session(res,tokens) {
    res.cookies.set(access,tokens.access_token,{...cookieOptions,maxAge:Math.min(86400,Number(tokens.expires_in)||3600)});
    res.cookies.set(refresh,tokens.refresh_token,{...cookieOptions,maxAge:refreshAge});
    return res;
  }
  function clear(res){
    for(const name of [access,refresh])res.cookies.set(name,'',{...cookieOptions,maxAge:0});
    return res;
  }
  async function use(fn,{anonymous=false}={}) {
    const missing=()=>anonymous?response({user:null}):response({error:'Entre na sua conta para continuar.'},401);
    if(accessToken) {
      try {return await fn(accessToken);}
      catch(error) {if(!(error instanceof SupabaseError && error.status===401))throw error;}
    }
    if(!refreshToken)return clear(missing());
    let updated;
    try {updated=await client.refresh(refreshToken);}
    catch(error) {if(unauthorized(error))return clear(missing());throw error;}
    return session(await fn(updated.access_token,updated.user),updated);
  }
  return {client,accessToken,refreshToken,session,clear,use};
}
function handle(error) {
  if(error instanceof SupabaseError && error.status===429) return response({error:'Muitas tentativas. Aguarde e tente novamente.'},429);
  if(error instanceof SupabaseError && error.service==='rest' && error.code==='23514') return response({error:'O banco rejeitou os dados ou o espaço de trabalho atingiu o limite de armazenamento.'},422);
  return response({error:'Não foi possível conectar ao Supabase. Confira as variáveis da Netlify e a migração do banco.'},502);
}
const notProvisioned=()=>response({error:'A conta foi autenticada, mas a empresa ainda não foi provisionada no Supabase.'},403);

export async function getCloud(req) {
  try {
    const auth=cloudAccount(req);
    const path=req.nextUrl.searchParams.get('asset');
    if(path!==null) {
      return await auth.use(async token=>{
        let source;
        try {source=await auth.client.asset(token,path);}
        catch(error) {
          if(error instanceof SupabaseError && [400,403,404].includes(error.status))return response({error:'Imagem indisponível.'},404);
          throw error;
        }
        if(!source)return response({error:'Imagem indisponível.'},404);
        const mime=source.headers.get('Content-Type')?.split(';')[0];
        if(!['image/png','image/jpeg','image/webp'].includes(mime))return response({error:'Imagem inválida.'},415);
        const bytes=await source.arrayBuffer();
        return new NextResponse(bytes,{headers:{'Content-Type':mime,'Content-Length':String(bytes.byteLength),
          'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Netlify-CDN-Cache-Control':'no-store'}});
      });
    }
    return await auth.use(async (token,user)=>{
      const result=await auth.client.read(token,user);
      return result ? response(result) : notProvisioned();
    },{anonymous:true});
  } catch(error){return handle(error);}
}

export async function postCloud(req,payload) {
  try {
    const auth=cloudAccount(req);
    if(payload.action==='updatePassword') {
      if(typeof payload.recoveryToken!=='string'||payload.recoveryToken.length>4096||
        typeof payload.password!=='string'||payload.password.length<8||payload.password.length>200) {
        return response({error:'Informe uma senha com pelo menos 8 caracteres.'},400);
      }
      try {
        await auth.client.updatePassword(payload.recoveryToken,payload.password);
        return response({message:'Senha alterada. Entre com a nova senha.'});
      } catch(error) {
        if(unauthorized(error))return response({error:'O link expirou ou já foi usado. Peça uma nova redefinição de senha.'},400);
        throw error;
      }
    }
    if(payload.action==='login') {
      const identifier=payload.identifier ?? payload.email;
      if(typeof identifier!=='string'||typeof payload.password!=='string'||identifier.length>254||!payload.password||payload.password.length>200)return response({error:'Credenciais inválidas.'},401);
      let tokens;
      try {tokens=await auth.client.login(identifier,payload.password);}
      catch(error){if(unauthorized(error))return response({error:'Credenciais inválidas ou conta ainda sem confirmação.'},401);throw error;}
      const result=await auth.client.read(tokens.access_token,tokens.user);
      return result ? auth.session(response(result),tokens) : notProvisioned();
    }
    if(payload.action==='logout') {
      try {
        let token=auth.accessToken;
        if(!token&&auth.refreshToken)token=(await auth.client.refresh(auth.refreshToken)).access_token;
        if(token)await auth.client.logout(token);
      } catch(error) {if(!unauthorized(error))return auth.clear(handle(error));}
      return auth.clear(response({user:null}));
    }
    if(payload.action==='upload') {
      return await auth.use(async token=>{
        try {return response(await auth.client.upload(token,payload.image));}
        catch(error){if(error instanceof SupabaseError)throw error;return response({error:error.message},400);}
      });
    }
    if(payload.action==='save') {
      try {
        if(!Number.isInteger(payload.revision)||payload.revision<0||payload.revision>=2147483647)throw Error('Revisão inválida.');
        validateWorkspace(payload.data);
      } catch(error){return response({error:error.message},400);}
      return await auth.use(async token=>{
        const saved=await auth.client.save(token,payload.revision,payload.data);
        return saved ? response(saved) : response({error:'Os dados foram atualizados em outra aba ou o acesso mudou. Recarregue antes de salvar.'},409);
      });
    }
    return response({error:'Operação inválida.'},400);
  } catch(error){return handle(error);}
}

