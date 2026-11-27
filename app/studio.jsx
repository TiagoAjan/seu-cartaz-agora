'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Building2, ChevronDown, CircleAlert, CircleCheck, FileSpreadsheet, Files, Images, LayoutDashboard, LogIn, LogOut, Menu, Moon, Package, PanelLeftClose, PanelsTopLeft, Plus, Printer, Settings, ShieldCheck, Sparkles, Sun, Tags, Type, UserRound, X } from 'lucide-react';
import Dashboard,{HeroArt} from './dashboard';
import {Importer, ProductForm, Products} from './catalog';
import {Gallery,Generator} from './generator';
import {Account,Campaigns,Companies,Fonts,History,Media,Printing,Splashes,Templates} from './library';
import {Button,Empty,Field,IconButton,Modal} from './ui';
import {dateLabel,empty,event} from '@/lib/model.mjs';
import {externalizeImages} from '@/lib/cloud-assets.mjs';
import {clearGraphicImages} from '@/lib/graphic.mjs';

const groups=[
  {title:'ESPAÇO DE TRABALHO',links:[['dashboard','Visão geral',LayoutDashboard],['products','Produtos',Package],['import','Importar planilhas',FileSpreadsheet],['campaigns','Campanhas',Tags]]},
  {title:'ESTÚDIO',links:[['posters','Criar cartazes',Files],['leaflets','Criar encartes',PanelsTopLeft],['templates','Templates',LayoutDashboard],['fonts','Fontes',Type],['splashes','Splash de ofertas',Sparkles],['media','Banco de imagens',Images]]},
  {title:'GESTÃO',links:[['history','Histórico de lotes',Files],['printing','Histórico de impressão',Printer],['companies','Empresas e lojas',Building2],['users','Usuários',UserRound],['settings','Configurações',Settings],['admin','Administração',ShieldCheck]]}
];
const labels=Object.fromEntries(groups.flatMap(g=>g.links.map(([key,label])=>[key,label])));
function Mark(){return <span className="brandMark" aria-hidden="true"><svg viewBox="0 0 30 30" fill="none"><path d="M7 8.5h15l-2.1 13H6L7 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M10 12.5h8.5M9.5 16.8h6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M23.5 4v6M20.5 7h6" stroke="#FFC85A" strokeWidth="2" strokeLinecap="round"/></svg></span>;}
async function request(body){
  const res=await fetch('/api/workspace',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const value=await res.json();
  if(!res.ok)throw Error(value.error||'Falha na comunicação com o servidor.');
  return value;
}
function Login({onClose,onLogin,cloud}) {
  const [identifier,setIdentifier]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');
    const identity=cloud ? {identifier} : {email:identifier};
    try {onLogin(await request({action:'login',...identity,password}));}
    catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  return <Modal wide title="Entrar no estúdio" onClose={onClose}><div className="loginLayout">
    <div className="loginArt"><Mark/><h2>Crie.<br/>Personalize.<br/>Imprima.</h2><HeroArt/></div>
    <form onSubmit={submit}><h3>Acesse sua conta</h3>
      {error&&<p className="inlineError">{error}</p>}
      <Field label={cloud?'E-mail ou telefone':'E-mail'}><input type={cloud?'text':'email'} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required value={identifier} placeholder={cloud?'Ex. (85) 99999-0000':undefined} onChange={e=>setIdentifier(e.target.value)}/></Field>
      <Field label="Senha"><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></Field>
      <Button icon={LogIn} type="submit" variant="primary" disabled={busy}>{busy?'Entrando…':'Entrar'}</Button>
      <details className="details"><summary>Primeiro acesso ou senha esquecida?</summary>{cloud?<p>Solicite a criação da conta ou a troca de senha ao responsável pelo projeto Supabase.</p>:<p>Na pasta do projeto, use <code>npm run admin</code> para criar o espaço ou <code>npm run admin -- --reset</code> para trocar a senha.</p>}</details>
    </form>
  </div></Modal>;
}
export default function Studio() {
  const [page,setPage]=useState('dashboard');
  const [data,setData]=useState(empty);
  const [user,setUser]=useState(null);
  const [cloud,setCloud]=useState(false);
  const [revision,setRevision]=useState(0);
  const [theme,setTheme]=useState('light');
  const [collapsed,setCollapsed]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [login,setLogin]=useState(false);
  const [notices,setNotices]=useState(false);
  const [account,setAccount]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState(null);
  const [product,setProduct]=useState(null);
  const [generation,setGeneration]=useState({key:0});
  const [batch,setBatch]=useState(null);
  const [dirty,setDirty]=useState(false);
  const [filter,setFilter]=useState('Este mês');
  const [store,setStore]=useState('');
  const timer=useRef();
  const saving=useRef(false);
  const preservedDrafts=useRef(new Map());
  function notify(message,error=false){
    clearTimeout(timer.current);setToast({message,error});timer.current=setTimeout(()=>setToast(null),5400);
  }
  function hydrate(payload){
    if(payload.cloud!==undefined)setCloud(payload.cloud);
    setUser(payload.user);
    setData(payload.data||empty());
    setRevision(payload.revision||0);
  }
  useEffect(()=>{
    function hash(){
      const path=window.location.hash.slice(1);
      if(labels[path]||!path)setPage(path||'dashboard');
    }
    hash();
    window.addEventListener('hashchange',hash);
    setTheme(localStorage.getItem('sca-theme')==='dark'?'dark':'light');
    request().then(hydrate).catch(error=>notify(error.message||'Não foi possível conectar ao servidor.',true)).finally(()=>setLoading(false));
    return ()=>{window.removeEventListener('hashchange',hash);clearTimeout(timer.current);};
  },[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('sca-theme',theme);},[theme]);
  function go(key,keep=false){
    setPage(key);setMobile(false);setAccount(false);setNotices(false);
    if((key==='posters'||key==='leaflets')&&!keep)setGeneration(old=>({key:old.key+1}));
    if(key!=='gallery')window.history.pushState(null,'','#'+key);
    window.scrollTo(0,0);
  }
  function requireAccount(){
    if(user)return true;
    setLogin(true);
    return false;
  }
  async function commit(next){
    if(!requireAccount())return false;
    if(saving.current){notify('Aguarde o salvamento em andamento.',true);return false;}
    try {
      saving.current=true;
      setBusy(true);
      const newEvents=next.events.map(e=>e.user?e:{...e,user:user.name});
      const draft={...next,events:newEvents};
      const dataToSave=cloud?await externalizeImages(draft,async image=>(await request({action:'upload',image})).url):draft;
      const result=await request({action:'save',revision,data:dataToSave});
      setData(dataToSave);setRevision(result.revision);return true;
    } catch(e){notify(e.message,true);return false;}
    finally{saving.current=false;setBusy(false);}
  }
  function openProduct(value={}){if(requireAccount())setProduct(value);}
  function pick(selected,importId='',template=''){
    setGeneration(old=>({key:old.key+1,selection:[...selected],importId,template}));
    go('posters',true);
  }
  function useTemplate(template){pick(new Set(),'',template.id);}
  function storeDraft(value,clear=false){
    if(!user)return;
    const key='sca-draft-'+user.id+'-'+value.id;
    if(clear)preservedDrafts.current.delete(key);
    else preservedDrafts.current.set(key,value);
    try {if(clear)sessionStorage.removeItem(key);else sessionStorage.setItem(key,JSON.stringify(value));}
    catch {}
    setDirty(!clear);
  }
  function openBatch(saved) {
    let draft=null;
    if(user){
      const key='sca-draft-'+user.id+'-'+saved.id;
      draft=preservedDrafts.current.get(key);
      if(!draft)try{draft=JSON.parse(sessionStorage.getItem(key));}catch{}
    }
    setBatch(draft || saved);setDirty(!!draft);go('gallery');
  }
  async function signOut() {
    const prefix='sca-draft-'+user?.id+'-';
    const drafts=Object.keys(sessionStorage).filter(key=>key.startsWith(prefix));
    if((dirty||drafts.length)&&!window.confirm('Sair e descartar ajustes que ainda estão nos rascunhos desta aba?'))return;
    try {
      await request({action:'logout'});
      for(const key of drafts) sessionStorage.removeItem(key);
      preservedDrafts.current.clear();
      clearGraphicImages();
      hydrate({user:null});setStore('');setBatch(null);setDirty(false);go('dashboard');notify('Sessão encerrada.');
    }
    catch(e){notify(e.message,true);}
  }
  const shared={data,user,go,commit,notify,requireAccount};
  const title=page==='gallery'?'Galeria do lote':labels[page]||'Visão geral';
  return <div className={'studio '+(collapsed?'collapsed ':'')+(mobile?'mobileOpen':'')}>
    {mobile&&<button type="button" className="mobileOverlay" aria-label="Fechar menu" onClick={()=>setMobile(false)}/>}
    <aside className="sidebar">
      <button type="button" className="brand" onClick={()=>go('dashboard')}><Mark/><span>seu cartaz<strong>agora<span>.</span></strong></span></button>
      <div className="navScroll">{groups.map(group=><div className="navGroup" key={group.title}><p>{group.title}</p>{group.links.map(([key,label,Icon])=><button type="button" key={key} onClick={()=>go(key)} aria-current={page===key?'page':undefined} className={page===key?'navActive':''} title={label}><Icon size={18}/><span>{label}</span></button>)}</div>)}</div>
      <div className="sidebarFoot"><div className="workspaceIcon"><Building2 size={19}/></div><div><strong>{data.company?.name||'Meu estúdio'}</strong><small>Espaço de trabalho</small></div><button type="button" aria-label="Abrir empresas e lojas" title="Abrir empresas e lojas" onClick={()=>go('companies')}><ChevronDown size={16}/></button></div>
    </aside>
    <div className="workspace"><header className="topbar">
      <div className="breadcrumb"><IconButton icon={Menu} label="Abrir menu" className="mobileToggle" onClick={()=>setMobile(!mobile)}/><IconButton icon={PanelLeftClose} label={collapsed?'Expandir menu':'Recolher menu'} className="desktopToggle" onClick={()=>setCollapsed(!collapsed)}/><span className="crumbRoot">Estúdio</span><span className="slash">/</span><strong>{title}</strong></div>
      <div className="topActions">
        {busy&&<span className="saveStatus">Salvando…</span>}
        <IconButton icon={theme==='light'?Moon:Sun} label={theme==='light'?'Ativar modo escuro':'Ativar modo claro'} onClick={()=>setTheme(theme==='light'?'dark':'light')}/>
        <div className="popupAnchor"><IconButton icon={Bell} label="Abrir notificações" onClick={()=>{setNotices(!notices);setAccount(false);}} aria-expanded={notices}/>
          {notices&&<section className="popup"><h3>Atividade recente</h3>{data.events.length?<ul className="eventList">{data.events.slice(0,4).map(e=><li key={e.id}><div><strong>{e.name}</strong><small>{e.detail}</small></div><span>{dateLabel(e.created)}</span></li>)}</ul>:<p className="muted">Ainda não há atividades.</p>}</section>}
        </div><span className="topDivide"/>
        {user?<div className="popupAnchor"><button type="button" className="topAccount" onClick={()=>{setAccount(!account);setNotices(false);}} aria-expanded={account}><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><span><strong>{user.name.split(' ')[0]}</strong><small>Administrador</small></span><ChevronDown size={15}/></button>{account&&<section className="popup accountPopup"><Button icon={UserRound} onClick={()=>go('users')}>Minha conta</Button><Button icon={LogOut} onClick={signOut}>Sair</Button></section>}</div>:<Button icon={LogIn} className="topLogin" disabled={loading} onClick={()=>setLogin(true)}>Entrar</Button>}
      </div>
    </header>
    <main className="main" id="content">
      {page==='dashboard'&&<Dashboard {...shared} useTemplate={useTemplate} filter={filter} setFilter={setFilter} store={store} setStore={setStore} openProduct={openProduct}/>}
      {page==='products'&&<Products {...shared} openProduct={openProduct} pick={pick} store={store}/>}
      {page==='import'&&<Importer {...shared} pick={pick}/>}
      {(page==='posters'||page==='leaflets')&&<Generator key={page+generation.key} {...shared} kind={page==='leaflets'?'leaflet':'poster'} selection={generation.selection||[]} selectionBatch={generation.importId} initialTemplate={generation.template} onGenerate={openBatch}/>}
      {page==='gallery'&&batch&&<Gallery key={batch.id} {...shared} batch={batch} onBatch={setBatch} dirty={dirty} storeDraft={storeDraft}/>}
      {page==='templates'&&<Templates {...shared} useTemplate={useTemplate}/>}
      {page==='fonts'&&<Fonts {...shared}/>}
      {page==='splashes'&&<Splashes {...shared}/>}
      {page==='history'&&<History {...shared} openBatch={openBatch}/>}
      {page==='printing'&&<Printing {...shared}/>}
      {page==='companies'&&<Companies {...shared}/>}
      {page==='campaigns'&&<Campaigns {...shared}/>}
      {page==='media'&&<Media {...shared}/>}
      {['users','settings','admin'].includes(page)&&<Account {...shared} section={page} theme={theme} setTheme={setTheme} signOut={signOut}/>}
    </main></div>
    {login&&<Login cloud={cloud} onClose={()=>setLogin(false)} onLogin={payload=>{hydrate(payload);setLogin(false);notify('Bem-vindo, '+payload.user.name.split(' ')[0]+'.');}}/>}
    {product&&<ProductForm product={product} data={data} defaultStore={store} commit={commit} notify={notify} onClose={()=>setProduct(null)}/>}
    {toast&&<div className={'toast '+(toast.error?'bad':'')} role={toast.error?'alert':'status'}>{toast.error?<CircleAlert size={21}/>:<CircleCheck size={21}/>}<span>{toast.message}</span><IconButton icon={X} label="Dispensar aviso" onClick={()=>setToast(null)}/></div>}
  </div>;
}

