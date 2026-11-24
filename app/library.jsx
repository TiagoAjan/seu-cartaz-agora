'use client';
import {useState} from 'react';
import { ArrowDownToLine, Building2, Copy, FileArchive, Files, FolderOpen, Images, Pencil, Plus, Printer, Search, Sparkles, Star, Tags, Trash2, UserRound } from 'lucide-react';
import {Button, CanvasPreview, Check, Empty, Field, IconButton, ImageInput, Modal, PageHeading, ProductThumb, Select, TemplateCard, imageData} from './ui';
import {storeOptions} from './catalog';
import {builtins,campaignStatus,dateLabel,event,fonts,id,now,posterFromProduct,sample,splashes} from '@/lib/model.mjs';
import {download} from '@/lib/graphic.mjs';

const cfg={width:210,height:255,unit:'mm',dynamic:'Preço único'};
export function Templates({data,commit,notify,useTemplate,requireAccount}) {
  const [edit,setEdit]=useState(null);
  async function save(e) {
    e.preventDefault();
    const earlier=data.templates.find(t=>t.id===edit.id);
    const next={...edit,id:earlier?.id||id(),version:(earlier?.version||0)+1};
    const list=earlier?data.templates.map(t=>t.id===earlier.id?next:t):[next,...data.templates];
    if(await commit({...data,templates:list,events:[event('Modelo salvo',next.name),...data.events]})){setEdit(null);notify('Modelo salvo.');}
  }
  async function remove(){
    if(!window.confirm('Excluir este modelo personalizado? Os lotes existentes serão preservados.'))return;
    if(await commit({...data,templates:data.templates.filter(t=>t.id!==edit.id)})){setEdit(null);notify('Modelo excluído.');}
  }
  return <><PageHeading title="Editor de templates" subtitle="Explore modelos e personalize a identidade das suas ofertas."><Button icon={Plus} variant="primary" onClick={()=>requireAccount()&&setEdit({...builtins[0],id:'',name:'Novo modelo'})}>Novo modelo</Button></PageHeading>
    <div className="templateGrid">{[...data.templates,...builtins].map((t,index)=><TemplateCard key={t.id} template={t} index={index} onUse={useTemplate} onEdit={t=>requireAccount()&&setEdit({...t,name:builtins.some(b=>b.id===t.id)?t.name+' · Cópia':t.name})}/>)}</div>
    {edit&&<Modal wide title="Personalizar modelo" onClose={()=>setEdit(null)}>
      <form onSubmit={save}><div className="advancedPoster"><CanvasPreview poster={posterFromProduct(sample,edit,{shape:splashes[0],color:'#ffad24',splashPrice:false})} config={cfg}/><div className="formGrid two">
        <Field label="Nome do modelo"><input value={edit.name} required maxLength={100} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
        <Field label="Título do cartaz"><input value={edit.headline} required maxLength={75} onChange={e=>setEdit({...edit,headline:e.target.value})}/></Field>
        {Object.entries({bg:'Cor de fundo',accent:'Cor do cabeçalho',ink:'Cor do texto'}).map(([k,label])=><Field key={k} label={label}><input type="color" value={edit[k]} onChange={e=>setEdit({...edit,[k]:e.target.value})}/></Field>)}
        <Field label="Fonte da descrição"><Select options={fonts.map(f=>f.name)} value={edit.descFont} onChange={descFont=>setEdit({...edit,descFont})}/></Field>
        <Field label="Fonte do preço"><Select options={fonts.map(f=>f.name)} value={edit.priceFont} onChange={priceFont=>setEdit({...edit,priceFont})}/></Field>
        <Check checked={!!edit.photo} onChange={e=>setEdit({...edit,photo:e.target.checked})}>Incluir imagem do produto</Check>
        <Check checked={!!edit.paper} onChange={e=>setEdit({...edit,paper:e.target.checked})}>Cabeçalho econômico</Check>
      </div></div><div className="modalActions">
        {data.templates.some(t=>t.id===edit.id)&&<><Button icon={Trash2} onClick={remove}>Excluir</Button><Button icon={Copy} onClick={()=>setEdit({...edit,id:'',name:edit.name+' · Cópia'})}>Duplicar</Button></>}
        <Button variant="primary" type="submit">Salvar modelo</Button>
      </div></form>
    </Modal>}
  </>;
}
const fontSamples=['SUPER OFERTA','ARROZ 5 KG','R$ 19,97','PREÇO BAIXO'];
export function Fonts({data,commit,requireAccount}) {
  const [sample,setSample]=useState(fontSamples[0]);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [favorites,setFavorites]=useState(false);
  const source=fonts.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())&&(!category||f.category===category)&&(!favorites||data.favorites.includes(f.name)));
  const favorite=(name)=>requireAccount()&&commit({...data,favorites:data.favorites.includes(name)?data.favorites.filter(f=>f!==name):[...data.favorites,name]});
  return <><PageHeading title="Biblioteca de fontes" subtitle="Compare fontes promocionais com uma prévia em tamanho real."/>
    <section className="panel libraryFilters"><div className="toolbar"><div className="search"><Search size={17}/><input aria-label="Pesquisar fonte" placeholder="Pesquisar fonte" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <Select options={[...new Set(fonts.map(f=>f.category))]} placeholder="Todas as categorias" value={category} onChange={setCategory}/><Select options={fontSamples} value={sample} onChange={setSample}/><Check checked={favorites} onChange={e=>setFavorites(e.target.checked)}>Favoritas</Check>
    </div></section><div className="fontGrid">{source.map(f=><article className="panel fontCard" key={f.name}><div className="fontSample" style={{fontFamily:'"'+f.name+'", Arial'}}>{sample}</div><div className="templateMeta"><div><strong>{f.name}</strong><small>{f.category}</small></div><IconButton icon={Star} label={data.favorites.includes(f.name)?'Remover favorita':'Favoritar fonte'} aria-pressed={data.favorites.includes(f.name)} onClick={()=>favorite(f.name)}/></div></article>)}</div>{!source.length&&<Empty icon={Search} title="Nenhuma fonte encontrada"/>}
  </>;
}
export function Splashes({data,commit,requireAccount}) {
  const [color,setColor]=useState('#ffab20');
  const [only,setOnly]=useState(false);
  return <><PageHeading title="Splash de Ofertas" subtitle="Veja como cada forma destaca o preço. Aplique sua escolha na criação ou na galeria."/>
  <section className="panel libraryFilters"><div className="toolbar"><Field label="Cor da prévia"><input aria-label="Cor da prévia" type="color" value={color} onChange={e=>setColor(e.target.value)}/></Field><Check checked={only} onChange={e=>setOnly(e.target.checked)}>Favoritos</Check></div></section>
  <div className="templateGrid">{splashes.filter(shape=>!only||data.favorites.includes('splash:'+shape)).map(shape=><article className="templateCard" key={shape}>
    <CanvasPreview poster={posterFromProduct(sample,builtins[4],{shape,color,splashPrice:true})} config={cfg}/>
    <div className="templateMeta"><strong>{shape}</strong><IconButton icon={Star} label="Alternar favorito" aria-pressed={data.favorites.includes('splash:'+shape)} onClick={()=>requireAccount()&&commit({...data,favorites:data.favorites.includes('splash:'+shape)?data.favorites.filter(f=>f!=='splash:'+shape):[...data.favorites,'splash:'+shape]})}/></div>
  </article>)}</div>
  </>;
}
export function History({data,openBatch,commit,notify,go}) {
  const [query,setQuery]=useState('');
  const filtered=data.batches.filter(b=>b.name.toLowerCase().includes(query.toLowerCase()));
  async function copy(batch) {
    const clone={...structuredClone(batch),id:id(),name:batch.name+' · Cópia',created:now()};
    if(await commit({...data,batches:[clone,...data.batches],events:[event('Lote duplicado',clone.name,clone.config.store),...data.events]})){openBatch(clone);notify('Lote duplicado.');}
  }
  async function remove(batch) {
    if(!window.confirm('Excluir o lote '+batch.name+'?'))return;
    if(await commit({...data,batches:data.batches.filter(b=>b.id!==batch.id),events:[event('Lote excluído',batch.name,batch.config.store),...data.events]}))notify('Lote excluído.');
  }
  return <><PageHeading title="Histórico de lotes" subtitle="Reabra cartazes e encartes com os preços e estilos salvos."/><section className="panel tablePanel"><div className="toolbar"><div className="search"><Search size={17}/><input aria-label="Buscar lotes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pelo nome do lote"/></div></div>
    {filtered.length?<div className="tableScroll"><table><thead><tr><th>Lote</th><th>Data</th><th>Ofertas</th><th>Formato</th><th>Ações</th></tr></thead><tbody>{filtered.map(b=><tr key={b.id}><td><strong>{b.name}</strong><small>{b.kind==='leaflet'?'Encarte':'Cartazes'}</small></td><td>{dateLabel(b.created)}</td><td>{b.items.length}</td><td>{b.config.format}</td><td><div className="actions"><Button icon={FolderOpen} onClick={()=>openBatch(b)}>Reabrir</Button><IconButton icon={Copy} label="Duplicar lote" onClick={()=>copy(b)}/><IconButton icon={Trash2} label="Excluir lote" onClick={()=>remove(b)}/></div></td></tr>)}</tbody></table></div>:<Empty icon={Files} title="Nenhum lote encontrado" detail="Seus lotes aparecem após a geração."><Button onClick={()=>go('posters')}>Criar cartazes</Button></Empty>}
    </section></>;
}
export function Printing({data,go}) {
  const records=data.events.filter(e=>e.name==='Impressão solicitada'||e.name==='Exportação realizada');
  return <><PageHeading title="Histórico de impressão" subtitle="Consulte exportações e solicitações de impressão."/><section className="panel">
    {records.length?<ul className="eventList">{records.map(e=><li key={e.id}><div className="tileIcon blue">{e.name==='Impressão solicitada'?<Printer size={17}/>:<ArrowDownToLine size={17}/>}</div><div><strong>{e.name}</strong><small>{e.detail}</small></div><span>{dateLabel(e.created)}</span></li>)}</ul>:<Empty icon={Printer} title="Nenhuma solicitação de impressão" detail="Abra um lote salvo para preparar um PDF de impressão."><Button onClick={()=>go('history')}>Abrir histórico de lotes</Button></Empty>}
  </section></>;
}
export function Companies({data,commit,notify,requireAccount}) {
  const [editing,setEditing]=useState(null);
  const [error,setError]=useState('');
  async function save(e){
    e.preventDefault();
    if(!editing.name.trim()){setError('Informe um nome.');return;}
    let next;
    if(editing.kind==='company') {
      const {kind,...company}=editing;
      next={...data,company};
    } else {
      const {kind,...store}=editing;
      const entry={...store,id:store.id||id()};
      next={...data,stores:store.id?data.stores.map(s=>s.id===store.id?entry:s):[...data.stores,entry]};
    }
    if(await commit({...next,events:[event('Cadastro atualizado',editing.name),...data.events]})){setEditing(null);notify('Cadastro salvo.');}
  }
  async function remove(){
    if(data.offers.some(o=>o.store===editing.id)||data.campaigns.some(c=>c.store===editing.id)||data.batches.some(b=>b.config.store===editing.id)){setError('Essa loja possui ofertas, campanhas ou lotes vinculados.');return;}
    if(window.confirm('Excluir esta loja?')&&await commit({...data,stores:data.stores.filter(s=>s.id!==editing.id)})){setEditing(null);notify('Loja excluída.');}
  }
  function open(value){if(requireAccount()){setError('');setEditing(value);}}
  return <><PageHeading title="Empresas e lojas" subtitle="Gerencie os dados da sua empresa e cadastre filiais."><Button icon={Plus} variant="primary" onClick={()=>open({kind:'store',name:'',cnpj:'',address:'',phone:''})}>Nova loja</Button></PageHeading>
  <section className="panel"><div className="section-heading"><div><h2>{data.company?.name||'Sua empresa'}</h2><p>{data.company?.cnpj||'Dados do espaço de trabalho'}</p></div><Button icon={Pencil} onClick={()=>open({...data.company,kind:'company'})}>Editar empresa</Button></div>
  {data.stores.length?<ul className="eventList">{data.stores.map(s=><li key={s.id}><div className="tileIcon blue"><Building2 size={19}/></div><div><strong>{s.name}</strong><small>{s.address||s.cnpj||'Loja'}</small></div><IconButton icon={Pencil} label={'Editar '+s.name} onClick={()=>open({...s,kind:'store'})}/></li>)}</ul>:<Empty icon={Building2} title="Nenhuma loja cadastrada"/>}</section>
  {editing&&<Modal title={editing.kind==='company'?'Editar empresa':editing.id?'Editar loja':'Cadastrar loja'} onClose={()=>setEditing(null)}>
    <form onSubmit={save}>{error&&<p className="inlineError">{error}</p>}<div className="formGrid two">{Object.entries({name:'Nome',cnpj:'CNPJ',address:'Endereço',phone:'Telefone'}).map(([key,label])=><Field key={key} label={label}><input required={key==='name'} maxLength={150} value={editing[key]||''} onChange={e=>setEditing({...editing,[key]:e.target.value})}/></Field>)}</div>
    <div className="modalActions">{editing.id&&<Button icon={Trash2} onClick={remove}>Excluir loja</Button>}<Button variant="primary" type="submit">Salvar</Button></div></form>
  </Modal>}</>;
}
export function Campaigns({data,commit,notify,requireAccount}) {
  const [editing,setEditing]=useState(null);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState('');
  const work=data.campaigns.filter(c=>!filter||campaignStatus(c)===filter);
  const statuses=['Rascunho','Programada','Ativa','Encerrada','Arquivada'];
  function edit(value){if(requireAccount()){setEditing(value);setError('');}}
  async function save(e) {
    e.preventDefault();
    if(editing.start>editing.end){setError('Informe um período válido.');return;}
    const record={...editing,id:editing.id||id()};
    const campaigns=editing.id?data.campaigns.map(c=>c.id===editing.id?record:c):[record,...data.campaigns];
    if(await commit({...data,campaigns,events:[event('Campanha salva',editing.name,editing.store),...data.events]})){setEditing(null);notify('Campanha salva.');}
  }
  return <><PageHeading title="Campanhas" subtitle="Programe ofertas e acompanhe o período de cada campanha."><Button icon={Plus} variant="primary" onClick={()=>edit({name:'',start:'',end:'',status:'Rascunho',store:'',template:builtins[0].id,products:[]})}>Nova campanha</Button></PageHeading>
    <section className="panel"><div className="toolbar plain"><Select placeholder="Todos os status" options={statuses} value={filter} onChange={setFilter}/></div>
    {work.length?<ul className="eventList">{work.map(c=><li key={c.id}><div className="tileIcon orange"><Tags size={18}/></div><div><strong>{c.name}</strong><small>{dateLabel(c.start)} – {dateLabel(c.end)} · {c.products.length} produtos</small></div><span className="pill">{campaignStatus(c)}</span><IconButton icon={Pencil} label="Editar campanha" onClick={()=>edit(c)}/><IconButton icon={Copy} label="Duplicar campanha" onClick={()=>edit({...c,id:undefined,name:c.name+' · Cópia',status:'Rascunho'})}/></li>)}</ul>:<Empty icon={Tags} title="Nenhuma campanha encontrada"/>}</section>
    {editing&&<Modal wide title={editing.id?'Editar campanha':'Criar campanha'} onClose={()=>setEditing(null)}><form onSubmit={save}>{error&&<p className="inlineError">{error}</p>}<div className="formGrid three">
      <Field label="Nome"><input value={editing.name} required onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
      <Field label="Status"><Select options={[{value:'Rascunho',label:'Rascunho'},{value:'Ativa',label:'Publicada, conforme datas'},{value:'Arquivada',label:'Arquivada'}]} value={editing.status} onChange={status=>setEditing({...editing,status})}/></Field>
      <Field label="Loja"><Select options={storeOptions(data)} placeholder="Todas as lojas" value={editing.store} onChange={store=>setEditing({...editing,store})}/></Field>
      <Field label="Início"><input type="date" required value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></Field>
      <Field label="Fim"><input type="date" required value={editing.end} onChange={e=>setEditing({...editing,end:e.target.value})}/></Field>
      <Field label="Modelo"><Select options={[...data.templates,...builtins].map(t=>({value:t.id,label:t.name}))} value={editing.template} onChange={template=>setEditing({...editing,template})}/></Field>
    </div><details className="details"><summary>Produtos da campanha ({editing.products.length})</summary><div className="campaignProducts">{data.products.map(p=><Check key={p.id} checked={editing.products.includes(p.id)} onChange={e=>setEditing({...editing,products:e.target.checked?[...editing.products,p.id]:editing.products.filter(x=>x!==p.id)})}>{p.commercial||p.name}</Check>)}</div></details>
    <div className="modalActions"><Button variant="primary" type="submit">Salvar campanha</Button></div></form></Modal>}
  </>;
}
export function Media({data,commit,notify,requireAccount}) {
  const [query,setQuery]=useState('');
  const [edit,setEdit]=useState(null);
  const [busy,setBusy]=useState(false);
  async function add(files) {
    if(!requireAccount())return;
    setBusy(true);
    try {
      const entries=[];
      for(const file of files){
        const image=await imageData(file);
        if([...data.media,...entries].some(m=>m.image===image))continue;
        const name=file.name.replace(/\.[^.]+$/,'');
        const product=data.products.find(p=>p.ean&&p.ean===name)||data.products.find(p=>p.code&&p.code===name);
        entries.push({id:id(),name,ean:product?.ean||(/^\d{8,14}$/.test(name)?name:''),code:product?.code||name,brand:product?.brand||'',category:product?.category||'',image});
      }
      const products=data.products.map(p=>p.image?p:{...p,image:entries.find(m=>(p.ean&&m.ean===p.ean)||(!p.ean&&p.code&&m.code===p.code))?.image||''});
      if(entries.length&&await commit({...data,media:[...entries,...data.media],products}))notify(entries.length+' imagem(ns) adicionada(s).');
      else if(!entries.length)notify('As imagens já estavam cadastradas.');
    } catch(e){notify(e.message,true);}
    finally{setBusy(false);}
  }
  async function save(e){
    e.preventDefault();
    if(await commit({...data,media:data.media.map(m=>m.id===edit.id?edit:m)})){setEdit(null);notify('Imagem atualizada.');}
  }
  const images=data.media.filter(m=>[m.name,m.ean,m.code,m.brand,m.category].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <><PageHeading title="Banco de imagens" subtitle="Organize fotos e associe arquivos aos produtos pelo código ou EAN."><ImageInput label={busy?'Enviando…':'Enviar imagens'} onLoad={files=>{if(!busy)add(files);}} multiple/></PageHeading>
    <section className="panel libraryFilters"><div className="search"><Search size={17}/><input aria-label="Buscar imagens" placeholder="Buscar por nome, marca ou código" value={query} onChange={e=>setQuery(e.target.value)}/></div></section>
    {images.length?<div className="templateGrid">{images.map(m=><article className="templateCard mediaCard" key={m.id}><ProductThumb src={m.image} name={m.name}/><div className="templateMeta"><div><strong>{m.name}</strong><small>{m.ean||m.code}</small></div><IconButton icon={Pencil} label="Editar imagem" onClick={()=>setEdit(m)}/></div></article>)}</div>:<Empty icon={Images} title="Nenhuma imagem encontrada" detail="Para facilitar a associação automática, use o EAN ou código como nome do arquivo."/>}
    {edit&&<Modal title="Editar imagem" onClose={()=>setEdit(null)}><form onSubmit={save}><div className="formGrid two">{Object.entries({name:'Descrição',ean:'EAN / GTIN',code:'Código interno',brand:'Marca',category:'Categoria'}).map(([key,label])=><Field key={key} label={label}><input required={key==='name'} value={edit[key]} onChange={e=>setEdit({...edit,[key]:e.target.value})}/></Field>)}</div><div className="modalActions"><Button icon={Trash2} onClick={async()=>{if(window.confirm('Excluir imagem da biblioteca?')&&await commit({...data,media:data.media.filter(m=>m.id!==edit.id)}))setEdit(null);}}>Excluir</Button><Button type="submit" variant="primary">Salvar</Button></div></form></Modal>}
  </>;
}
export function Account({user,data,requireAccount,go,signOut,section,theme,setTheme}) {
  if(section==='settings')return <><PageHeading title="Configurações" subtitle="Ajuste a aparência e confira as preferências regionais."/><section className="panel formGrid three"><Field label="Aparência"><Select options={[{value:'light',label:'Claro'},{value:'dark',label:'Escuro'}]} value={theme} onChange={setTheme}/></Field><Field label="Idioma e moeda"><input readOnly value="Português (Brasil) · BRL"/></Field><Field label="Fuso horário"><input readOnly value="America/Fortaleza"/></Field></section></>;
  if(section==='admin')return <><PageHeading title="Administração" subtitle="Consulte o uso do seu espaço de trabalho."/><section className="panel">{user?<><ul className="eventList">{[['Empresa',data.company.name],['Lojas cadastradas',data.stores.length],['Produtos',data.products.length],['Lotes salvos',data.batches.length],['Imagens cadastradas',data.media.length]].map(([label,count])=><li key={label}><div><strong>{label}</strong></div><span>{count}</span></li>)}</ul><div className="actions innerHeading"><Button icon={Building2} onClick={()=>go('companies')}>Gerenciar lojas</Button></div></>:<Empty icon={Building2} title="Entre para ver seu espaço"><Button variant="primary" onClick={requireAccount}>Entrar</Button></Empty>}</section></>;
  return <><PageHeading title="Usuários" subtitle="Consulte a conta administradora do espaço."/><section className="panel">{user?<><ul className="eventList"><li><div className="tileIcon blue"><UserRound size={19}/></div><div><strong>{user.name}</strong><small>{user.email}</small></div><span className="pill">Administrador</span></li></ul><div className="modalActions"><Button onClick={signOut}>Sair da conta</Button></div></>:<Empty icon={UserRound} title="Nenhuma sessão iniciada"><Button variant="primary" onClick={requireAccount}>Entrar</Button></Empty>}</section></>;
}

