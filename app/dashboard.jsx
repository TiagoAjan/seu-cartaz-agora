'use client';
import { ArrowUpRight, CalendarDays, ChevronRight, Clock3, Files, FileSpreadsheet, LayoutGrid, Package, Plus, Printer, Tags, Zap, Sparkles, PanelsTopLeft, Store, TrendingUp } from 'lucide-react';
import { Button, Empty, Select, TemplateCard } from './ui';
import { builtins, campaignStatus, dateLabel, today } from '@/lib/model.mjs';

export function HeroArt() {
  return <div className="heroArt" aria-hidden="true">
    <div className="heroOrbit orbit1"/><div className="heroOrbit orbit2"/><div className="heroOrbit orbit3"/>
    <Sparkles className="heroSpark s1" size={29}/><Sparkles className="heroSpark s2" size={23}/>
    <div className="showPoster posterBack"><span>FEIRÃO</span><strong>PREÇOS<br/>BAIXOS</strong><i>APROVEITE!</i></div>
    <div className="showPoster posterFront"><span>OFERTA DO DIA</span><strong>SUPER<br/>OFERTA</strong><div className="heroPrice"><small>R$</small>19<sup>,97</sup></div><i>SÓ POR TEMPO LIMITADO</i></div>
  </div>;
}
const quick = [
  {name:'Cadastrar produto',detail:'Adicione um item ao catálogo',icon:Package,key:'products',tone:'blue'},
  {name:'Importar planilha',detail:'Envie um arquivo XLS, XLSX ou CSV',icon:FileSpreadsheet,key:'import',tone:'green'},
  {name:'Criar encarte',detail:'Organize ofertas em páginas',icon:PanelsTopLeft,key:'leaflets',tone:'orange'},
  {name:'Histórico de impressão',detail:'Consulte suas solicitações',icon:Printer,key:'printing',tone:'violet'}
];
export default function Dashboard({data,user,go,useTemplate,filter,setFilter,store,setStore,openProduct}) {
  const current=today();
  const from=filter==='Hoje'?current:filter==='Este mês'?current.slice(0,7)+'-01':'';
  const includes=(time,shop)=> (!from || today(new Date(time))>=from) && (!store || store===shop);
  const batches=data.batches.filter(b=>includes(b.created,b.config.store));
  const events=data.events.filter(e=>includes(e.created,e.store));
  const posterCount=batch=>batch.kind==='poster'?batch.items.length:0;
  const countFor=predicate=>batches.filter(predicate).reduce((total,b)=>total+posterCount(b),0);
  const listed=data.offers.filter(o=>!store || !o.store || o.store===store);
  const newest=new Map();
  for(const offer of listed) {
    const key=offer.productId+':'+offer.store;
    if(!newest.has(key))newest.set(key,offer);
  }
  const offers=[...newest.values()].filter(o=>[o.promo,o.wholesale,o.retail,o.card,o.club].some(price=>price!=null));
  const active=offers.filter(o=>(!o.start||o.start<=current)&&(!o.end||o.end>=current));
  const deadline=today(new Date(Date.now()+7*86400000));
  const expiring=active.filter(o=>o.end && o.end<=deadline).length;
  const stats=[
    {icon:Files,title:'Cartazes gerados',value:countFor(()=>true),note:countFor(b=>today(new Date(b.created))===current)+' hoje · '+countFor(b=>today(new Date(b.created)).slice(0,7)===current.slice(0,7))+' no mês',tone:'blue'},
    {icon:Package,title:'Produtos cadastrados',value:store?data.products.filter(p=>listed.some(o=>o.productId===p.id)).length:data.products.length,note:'Catálogo de produtos',tone:'violet'},
    {icon:Tags,title:'Ofertas ativas',value:active.length,note:expiring+' vencendo · '+offers.filter(o=>o.end&&o.end<current).length+' vencidas',tone:'orange'},
    {icon:PanelsTopLeft,title:'Encartes gerados',value:batches.filter(b=>b.kind==='leaflet').length,note:data.campaigns.filter(c=>(!store||c.store===store)&&campaignStatus(c)==='Ativa').length+' campanhas ativas',tone:'green'}
  ];
  const dates=Array.from({length:7},(_,i)=>today(new Date(Date.now()-(6-i)*86400000)));
  const series=dates.map(date=>countFor(b=>today(new Date(b.created))===date));
  const max=Math.max(...series,1);
  return <>
    <header className="dashboardHeading">
      <div><div className="eyebrow"><span/> PAINEL DE CONTROLE</div><h1>{user?'Olá, '+user.name.split(' ')[0]+'!':'Visão geral'}</h1><p>Acompanhe sua produção e crie ofertas que chamam a atenção.</p></div>
      <div className="headingFilters">{data.stores.length>0&&<Select value={store} onChange={setStore} placeholder="Todas as lojas" options={data.stores.map(s=>({value:s.id,label:s.name}))}/>}<div className="dateFilter"><CalendarDays size={17}/><Select value={filter} onChange={setFilter} options={['Este mês','Hoje','Todo o período']}/></div></div>
    </header>
    <section className="hero">
      <div className="heroCopy"><div className="heroTag"><Sparkles size={14}/> ESTÚDIO DE OFERTAS</div><h2>Suas ofertas.<br/>Em destaque.</h2><p>Crie, personalize e imprima cartazes profissionais em minutos.</p>
      <div className="actions"><Button icon={Plus} variant="white" onClick={()=>go('posters')}>Criar cartazes</Button><Button icon={FileSpreadsheet} variant="glass" onClick={()=>go('import')}>Importar planilha</Button></div></div>
      <HeroArt/>
    </section>
    <section className="statsGrid" aria-label="Indicadores">
      {stats.map(({title,value,note,icon:Icon,tone})=><article className="stat" key={title}>
        <div className={'tileIcon '+tone}><Icon size={21}/></div><div><p>{title}</p><strong>{value.toLocaleString('pt-BR')}</strong><small>{note}</small></div>
      </article>)}
    </section>
    <section className="module-section">
      <div className="section-heading"><div><h2>Acesso rápido</h2><p>Vá direto para as ferramentas do dia a dia.</p></div></div>
      <div className="quickGrid">{quick.map(({name,detail,icon:Icon,key,tone})=><button type="button" className="quick" key={key} onClick={()=>key==='products'?openProduct():go(key)}><div className={'tileIcon '+tone}><Icon size={19}/></div><div><strong>{name}</strong><small>{detail}</small></div><ChevronRight size={17}/></button>)}</div>
    </section>
    <section className="module-section">
      <div className="section-heading"><div><h2>Comece com um modelo</h2><p>Escolha uma arte e adapte às suas ofertas.</p></div><Button icon={LayoutGrid} onClick={()=>go('templates')}>Ver modelos</Button></div>
      <div className="templateGrid">{builtins.slice(0,4).map((t,index)=><TemplateCard key={t.id} template={t} index={index} onUse={useTemplate}/>)}</div>
    </section>
    <section className="dashboardBottom">
      <article className="panel"><div className="section-heading"><div><h2>Produção de cartazes</h2><p>Últimos 7 dias</p></div><div className="tileIcon blue"><TrendingUp size={19}/></div></div>
        <div className="chart" aria-label="Cartazes gerados nos últimos sete dias">{dates.map((date,i)=><div className="chartColumn" key={date}><div className="chartBar" title={series[i]+' cartazes'} style={{height:Math.max(2,series[i]/max*100)+'%'}}/><span>{dateLabel(date).slice(0,5)}</span></div>)}</div>
      </article>
      <article className="panel"><div className="section-heading"><div><h2>Atividade recente</h2><p>Alterações no espaço de trabalho</p></div><div className="tileIcon violet"><Clock3 size={19}/></div></div>
        {events.length?<ul className="eventList">{events.slice(0,5).map(e=><li key={e.id}><div><strong>{e.name}</strong><small>{e.detail}</small></div><span>{dateLabel(e.created)}</span></li>)}</ul>:<Empty icon={Clock3} title="Nenhuma atividade no período" detail="Os registros aparecem conforme você utiliza o estúdio."/>}
      </article>
    </section>
  </>;
}

