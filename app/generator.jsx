'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, CheckCircle2, Copy, FileSpreadsheet, Files, Grid2X2, List, Pencil, Plus, Printer, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { Button, CanvasPreview, Check, Empty, Field, IconButton, Modal, PageHeading, Select } from './ui';
import { ProductPicker, storeOptions } from './catalog';
import { builtins, dimensions, dynamics, effectiveStyle, event, fonts, formats, id, now, parseDate, patchPoster, posterFromProduct, brushSplash, maxPriceSize, pricePieces, primaryPrice, resizePrice, scalePoster, sizeLabels, sizes, splashes, visibleOffer, quantityPromotion, comboPromotion, promotionalProducts } from '@/lib/model.mjs';
import { download, nextFrame, renderExports, splitPages } from '@/lib/graphic.mjs';
import {templateFormat} from '@/lib/template-art.mjs';
import { composePrint, defaultPrint, printGeometry } from '@/lib/printing.mjs';

export const defaultConfig = (kind,store='') => ({kind,store,dynamic:'Preço único',template:builtins[0].id,format:'A4',landscape:false,
  width:210,height:297,unit:'mm',name:'',start:'',end:'',descFont:'',priceFont:'',splashPrice:false,splashDesc:false,shape:splashes[0],color:'#ffad24',perPage:6});
export function Generator({kind,data,commit,requireAccount,notify,go,selection,selectionBatch,initialTemplate,onGenerate}) {
  const [requested,setCfg]=useState(()=>({...defaultConfig(kind),template:initialTemplate||builtins[0].id}));
  const [selected,setSelected]=useState(new Set(selection));
  const [promo,setPromo]=useState({payment:'units',buy:'3',pay:'2',total:'',name:''});
  const [comboQuantities,setComboQuantities]=useState({});
  const [importId,setImportId]=useState(selectionBatch||'');
  const [error,setError]=useState('');
  const [job,setJob]=useState(null);
  const token=useRef(null);
  const templates=[...builtins,...data.templates];
  const patch = values=>setCfg(old=>({...old,...values}));
  const template=templates.find(t=>t.id===requested.template)||builtins[0];
  const cfg=templateFormat(requested,template);
  const quantityDeal=cfg.dynamic===quantityPromotion;
  const comboDeal=cfg.dynamic===comboPromotion;
  const selectedProducts=data.products.filter(product=>selected.has(product.id));
  const editPromo=(key,value)=>setPromo(old=>({...old,[key]:value}));
  useEffect(()=>()=>{if(token.current)token.current.cancelled=true;},[]);
  function chooseImport(value) {
    setImportId(value);
    if(value)setSelected(new Set(data.imports.find(batch=>batch.id===value)?.productIds.filter(pid=>data.products.some(p=>p.id===pid))||[]));
  }
  async function generate() {
    if(!requireAccount())return;
    setError('');
    const products=selectedProducts;
    if(!products.length){setError('Selecione pelo menos um produto.');return;}
    let config,snapshot;
    try {
      config={...cfg,...dimensions(cfg),storeName:data.stores.find(s=>s.id===cfg.store)?.name||data.company?.name||'',
        start:parseDate(cfg.start),end:parseDate(cfg.end)};
      if(config.start && config.end && config.start>config.end)throw Error('Validade inicial posterior à final.');
      if(kind==='leaflet'&&comboDeal)config.perPage=1;
      if(kind==='leaflet'&&(!Number.isInteger(config.perPage)||config.perPage<1||config.perPage>30))throw Error('Informe de 1 a 30 produtos por página.');
      const productOffers=products.map(p=>({...p,...visibleOffer(data,p.id,cfg.store),id:p.id}));
      snapshot=promotionalProducts(productOffers,cfg.dynamic,promo,comboQuantities);
      if(comboDeal&&!config.name.trim())config.name=snapshot[0].name;
    } catch(e){setError(e.message);return;}
    const missing=snapshot.filter(p=>primaryPrice(p,cfg.dynamic)==null);
    if(missing.length&&!window.confirm(missing.length+' produto(s) não têm preço para a dinâmica selecionada. Gerar com a indicação SEM PREÇO?'))return;
    const signal={cancelled:false};
    token.current=signal;
    setJob({done:0,total:snapshot.length});
    const items=[];
    try {
      for(let i=0;i<snapshot.length;i+=20){
        if(signal.cancelled){notify('Geração cancelada.');return;}
        items.push(...snapshot.slice(i,i+20).map(p=>posterFromProduct(p,comboDeal?{...template,photo:false}:template,config)));
        setJob({done:items.length,total:snapshot.length});
        await nextFrame();
      }
      if(signal.cancelled)return;
      const batch={id:id(),kind,name:cfg.name.trim()||(comboDeal?snapshot[0].name:kind==='leaflet'?'Encarte promocional':'Lote de cartazes'),created:now(),config,items};
      const status=kind==='leaflet'?'Encarte gerado':'Cartazes gerados';
      if(await commit({...data,batches:[batch,...data.batches],events:[event(status,batch.name+' · '+(comboDeal?'1 combo':items.length+' produtos'),cfg.store),...data.events]})){
        onGenerate(batch);
        notify(status+'.');
      }
    } finally {token.current=null;setJob(null);}
  }
  return <><PageHeading title={kind==='leaflet'?'Criar encartes':'Criar cartazes'} subtitle={kind==='leaflet'?'Distribua produtos automaticamente em páginas promocionais.':'Escolha os produtos e personalize sua próxima oferta.'}>
    <Button icon={FileSpreadsheet} onClick={()=>go('import')}>Importar planilha</Button>
  </PageHeading>
  <section className="panel generatorPanel"><div className="section-heading"><div><h2>Configuração do {kind==='leaflet'?'encarte':'lote'}</h2><p>Escolha um modelo, um formato e as condições da oferta.</p></div><div className="tileIcon blue"><Sparkles size={21}/></div></div>
    <div className="formGrid three">
      <Field label="Nome"><input value={cfg.name} onChange={e=>patch({name:e.target.value})} maxLength={120} placeholder={kind==='leaflet'?'Ex.: Festival de ofertas':'Ex.: Ofertas da semana'}/></Field>
      <Field label="Loja"><Select options={storeOptions(data)} value={cfg.store} onChange={store=>patch({store})} placeholder="Todas as lojas"/></Field>
      <Field label="Modelo"><Select options={templates.map(t=>({value:t.id,label:t.name}))} value={cfg.template} onChange={template=>patch({template})}/></Field>
      <Field label="Dinâmica promocional"><Select options={dynamics} value={cfg.dynamic} onChange={dynamic=>patch({dynamic})}/></Field>
      <Field label="Formato"><Select options={[...Object.keys(formats),'Personalizado']} value={cfg.format} disabled={!!template.artwork} onChange={format=>patch({format})}/></Field>
      <Field label="Orientação"><Select options={template.artwork?['Retrato','Paisagem']:['Padrão do formato','Invertida']} disabled={!!template.artwork}
        value={template.artwork?(cfg.landscape?'Paisagem':'Retrato'):(cfg.landscape?'Invertida':'Padrão do formato')} onChange={value=>patch({landscape:value==='Invertida'})}/></Field>
      {cfg.format==='Personalizado'&&<>
        <Field label="Largura"><input type="number" min="1" value={cfg.width} onChange={e=>patch({width:e.target.value})}/></Field>
        <Field label="Altura"><input type="number" min="1" value={cfg.height} onChange={e=>patch({height:e.target.value})}/></Field>
        <Field label="Unidade"><Select options={['mm','cm','px']} value={cfg.unit} onChange={unit=>patch({unit})}/></Field>
      </>}
      <Field label="Validade inicial"><input type="date" value={cfg.start} onChange={e=>patch({start:e.target.value})}/></Field>
      <Field label="Validade final"><input type="date" value={cfg.end} onChange={e=>patch({end:e.target.value})}/></Field>
      {kind==='leaflet'&&!comboDeal&&<Field label="Produtos por página"><input type="number" min="1" max="30" value={cfg.perPage} onChange={e=>patch({perPage:Number(e.target.value)})}/></Field>}
      <Field label="Fonte da descrição"><Select options={fonts.map(f=>f.name)} value={cfg.descFont} placeholder="Fonte do modelo" onChange={descFont=>patch({descFont})}/></Field>
      <Field label="Fonte do preço"><Select options={fonts.map(f=>f.name)} value={cfg.priceFont} placeholder="Fonte do modelo" onChange={priceFont=>patch({priceFont})}/></Field>
      <Field label="Modelo de splash"><Select options={splashes} value={cfg.shape} onChange={shape=>patch({shape})}/></Field>
    </div>
    {(quantityDeal||comboDeal)&&<div className="artworkInfo promotionOptions">
      <div><strong>{comboDeal?'Composição do combo':'Condições da promoção'}</strong>
        <p>{comboDeal?'Combine produtos do catálogo em uma única oferta com preço total.':
          'Escolha entre pagar por menos unidades ou informar um valor total para cada produto selecionado.'}</p></div>
      <div className="formGrid three">
        {comboDeal?<Field label="Nome do combo"><input maxLength={80} value={promo.name} onChange={e=>editPromo('name',e.target.value)} placeholder="Ex.: Combo café da manhã"/></Field>:<>
          <Field label="Quantidade para comprar"><input type="number" min="2" max="999" value={promo.buy} onChange={e=>editPromo('buy',e.target.value)}/></Field>
          <Field label="Forma de pagamento"><Select value={promo.payment} onChange={value=>editPromo('payment',value)}
            options={[{value:'units',label:'Pagar por menos unidades'},{value:'total',label:'Pagar um valor total em R$'}]}/></Field>
          {promo.payment==='units'&&<Field label="Quantidade para pagar"><input type="number" min="1" max="999" value={promo.pay} onChange={e=>editPromo('pay',e.target.value)}/></Field>}
        </>}
        {(comboDeal||promo.payment==='total')&&<Field label={comboDeal?'Preço total do combo (R$)':'Preço total da promoção (R$)'}>
          <input inputMode="decimal" value={promo.total} onChange={e=>editPromo('total',e.target.value)} placeholder="Ex.: 19,90"/>
        </Field>}
      </div>
      {quantityDeal&&promo.payment==='units'&&<p className="artworkDetail">Exemplo: leve 3, pague 2. O total usa o preço unitário exibido no catálogo.</p>}
    </div>}
    {template.artwork&&<p className="artworkHint">Este modelo mantém o A4 na orientação definida em Templates. A imagem inteira aparece na exportação.</p>}
    <div className="groupChecks inlineChecks"><Check checked={cfg.splashPrice} onChange={e=>patch({splashPrice:e.target.checked})}>Splash atrás do preço</Check><Check checked={cfg.splashDesc} onChange={e=>patch({splashDesc:e.target.checked})}>Splash atrás da descrição</Check><input type="color" aria-label="Cor do splash" disabled={cfg.shape===brushSplash} value={cfg.color} onChange={e=>patch({color:e.target.value})}/></div>
  </section>
  <section className="panel tablePanel module-section"><div className="section-heading padded"><div><h2>Selecionar produtos</h2><p>Selecione produtos do catálogo ou filtre por uma importação.</p></div>{!data.products.length&&<Button icon={Plus} onClick={()=>go('products')}>Abrir catálogo</Button>}</div>
    <ProductPicker data={data} selected={selected} setSelected={setSelected} batch={importId} setBatch={chooseImport} store={cfg.store}/>
    {comboDeal&&selectedProducts.length>0&&<div className="comboItems">
      <h3>Quantidades do combo</h3>
      <div className="formGrid three">{selectedProducts.map(product=><Field key={product.id} label={'Quantidade de '+(product.commercial||product.name)}>
        <input type="number" min="1" max="999" value={comboQuantities[product.id]??'1'}
          onChange={e=>setComboQuantities(old=>({...old,[product.id]:e.target.value}))}/>
      </Field>)}</div>
    </div>}
    <div className="generatorActions">
      {error&&<div className="inlineError" role="alert">{error}</div>}
      {job&&<div className="progress"><progress value={job.done} max={job.total}/><span>{job.done} / {job.total}</span></div>}
      {job&&<Button icon={X} onClick={()=>{token.current.cancelled=true;}}>Cancelar</Button>}
      <Button icon={Sparkles} variant="primary" disabled={!selected.size||!!job} onClick={generate}>{job?'Gerando prévias…':comboDeal?'Gerar combo':'Gerar prévias'}{selected.size?' ('+selected.size+')':''}</Button>
    </div>
  </section></>;
}
function Stepper({label,value,onChange,onReset,min=8,max=300}) {
  const [typed,setTyped]=useState(null);
  const clamp=n=>Math.max(min,Math.min(max,n));
  const timeout=useRef();
  const repeat=useRef();
  const current=useRef(value);
  current.current=value;
  function end(){clearTimeout(timeout.current);clearInterval(repeat.current);}
  useEffect(()=>end,[]);
  function press(e,delta) {
    if(e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const bump=()=>{const next=clamp(current.current+delta);current.current=next;onChange(next);};
    bump();
    timeout.current=setTimeout(()=>{repeat.current=setInterval(bump,90);},340);
  }
  return <div className="stepper"><span>{label}</span><div>
    {[-2,2].map((delta,index)=><button type="button" key={delta} className={index?'stepUp':'stepDown'} aria-label={(delta>0?'Aumentar ':'Diminuir ')+label} onPointerDown={e=>press(e,delta)} onPointerUp={end} onLostPointerCapture={end} onPointerCancel={end} onClick={e=>{if(e.detail===0)onChange(clamp(value+delta));}}>A{delta>0?'+':'−'}</button>)}
    <input type="number" min={min} max={max} aria-label={'Tamanho de '+label} value={typed??value}
      onChange={e=>{const raw=e.target.value;setTyped(raw);const n=Number(raw);if(raw&&Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}}
      onBlur={()=>{if(typed&&Number.isFinite(Number(typed)))onChange(clamp(Number(typed)));setTyped(null);}}
      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/>
    <button type="button" className="stepReset" title={'Restaurar '+label} aria-label={'Restaurar '+label} onClick={onReset}><RotateCcw size={13}/></button>
  </div></div>;
}
const basic=['description','price','unit'];
const scaleGroups=[
  ['Preço',['price']],['Descrição',['description']],['Splash',['splash']],['Tudo',['price','description','splash']]
];
const positionLabels={price:'Valor',currency:'Símbolo R$',cents:'Centavos'};
const normalizeOffset=n=>Math.max(-1,Math.min(1,Math.round(n*10000)/10000));

function PosterPositionEditor({poster,config,onPosition}) {
  const [regions,setRegions]=useState({});
  const [draft,setDraft]=useState(null);
  const drag=useRef(null);
  const offsets=useMemo(()=>effectiveStyle(poster).priceOffsets,[poster]);
  const preview=useMemo(()=>draft?{...poster,overrides:{...poster.overrides,priceOffsets:{...offsets,[draft.key]:draft.value}}}:poster,
    [draft,offsets,poster]);
  function pointerStart(e,key,region) {
    if(e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const frame=e.currentTarget.parentElement.getBoundingClientRect();
    drag.current={key,id:e.pointerId,x:e.clientX,y:e.clientY,
      width:frame.width*region.frameWidth,height:frame.height*region.frameHeight,base:offsets[key]||{x:0,y:0}};
  }
  function move(e) {
    const job=drag.current;
    if(!job||job.id!==e.pointerId)return;
    job.value={x:normalizeOffset(job.base.x+(e.clientX-job.x)/job.width),
      y:normalizeOffset(job.base.y+(e.clientY-job.y)/job.height)};
    setDraft({key:job.key,value:job.value});
  }
  function finish(e,cancelled=false) {
    const job=drag.current;
    if(!job||job.id!==e.pointerId)return;
    drag.current=null;
    if(job.value&&!cancelled)onPosition(job.key,job.value);
    setDraft(null);
  }
  function moveByKey(e,key) {
    const axis={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!axis)return;
    e.preventDefault();
    const amount=e.shiftKey?.04:.01;
    const current=offsets[key]||{x:0,y:0};
    onPosition(key,{x:normalizeOffset(current.x+axis[0]*amount),y:normalizeOffset(current.y+axis[1]*amount)});
  }
  const hasOffsets=Object.values(offsets).some(value=>value.x||value.y);
  return <div className="positionEditor">
    <CanvasPreview poster={preview} config={config} onPriceRegions={setRegions}>
      <div className="priceHandles">
        {Object.entries(regions).map(([key,rect])=>{
          const left=Math.max(0,Math.min(.96,rect.left-.008));
          const top=Math.max(0,Math.min(.96,rect.top-.008));
          const width=Math.max(.04,Math.min(1,rect.right+.008)-left);
          const height=Math.max(.04,Math.min(1,rect.bottom+.008)-top);
          return <button key={key} type="button" className="priceHandle" aria-label={'Mover '+positionLabels[key]} title={'Arraste para mover '+positionLabels[key]}
            style={{left:left*100+'%',top:top*100+'%',width:width*100+'%',height:height*100+'%'}}
            onPointerDown={e=>pointerStart(e,key,rect)} onPointerMove={move} onPointerUp={finish}
            onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)} onKeyDown={e=>moveByKey(e,key)}/>;
        })}
      </div>
    </CanvasPreview>
    <p className="artworkHint">Arraste o R$, o valor ou os centavos na prévia. Você também pode usar as setas do teclado.</p>
    {hasOffsets&&<Button icon={RotateCcw} onClick={()=>onPosition()}>Restaurar posições</Button>}
  </div>;
}
const advancedSizes=Object.keys(sizes).filter(key=>key==='price'||!pricePieces.includes(key));
const fontOptions=fonts.map(f=>f.name);
export function Gallery({batch,data,commit,notify,onBatch,dirty,storeDraft,go}) {
  const [selected,setSelected]=useState(new Set());
  const [editing,setEditing]=useState('');
  const [layout,setLayout]=useState('grid');
  const [zoom,setZoom]=useState(275);
  const [max,setMax]=useState(36);
  const [bulk,setBulk]=useState({scope:'Todos',keep:true, descFont:'Bangers',priceFont:'Anton',splashPrice:true,splashDesc:false,shape:splashes[0],color:'#ffad24'});
  const [exporter,setExporter]=useState(null);
  const [exportError,setExportError]=useState('');
  const [printPreview,setPrintPreview]=useState(null);
  const printUrl=printPreview?.url;
  useEffect(()=>()=>{if(printUrl)setTimeout(()=>URL.revokeObjectURL(printUrl),10000);},[printUrl]);
  const [mode,setMode]=useState('PDF');
  const [printOptions,setPrintOptions]=useState(defaultPrint);
  const [resolution,setResolution]=useState('150');
  const [working,setWorking]=useState(null);
  const [clip,setClip]=useState(null);
  const cancel=useRef(null);
  const batchRef=useRef(batch);
  batchRef.current=batch;
  const {items,config}=batch;
  const selectedItems=items.filter(p=>selected.has(p.id));
  const all=items.length>0&&selectedItems.length===items.length;
  const current=items.find(p=>p.id===editing);
  const pages=useMemo(()=>config.kind==='leaflet'?splitPages(items,config):[],[items,config]);
  let imposed;
  try {if(exporter?.print)imposed=printGeometry(config,printOptions);} catch {}
  const setPrint=(key,value)=>setPrintOptions(old=>({...old,[key]:value}));
  const ids=()=>new Set((bulk.scope==='Selecionados'?selectedItems:batchRef.current.items).map(p=>p.id));
  function change(fn) {
    const next={...batchRef.current,items:fn(batchRef.current.items)};
    batchRef.current=next;
    onBatch(next);
    storeDraft(next);
  }
  function apply(ids,patch,replace=false){change(items=>patchPoster(items,ids,patch,replace));}
  function individual(item,patch){apply(new Set([item.id]),patch);}
  function resetSize(item,key){
    change(items=>items.map(p=>{
      if(p.id!==item.id)return p;
      const custom={...p.overrides.sizes};
      for(const part of key==='price'?pricePieces:[key])delete custom[part];
      return {...p,overrides:{...p.overrides,sizes:custom}};
    }));
  }
  function restore(item){change(items=>items.map(p=>p.id===item.id?{...p,overrides:{}}:p));}
  function applying(patch) {
    const targets=ids();
    if(!targets.size){notify('Selecione pelo menos um cartaz.',true);return;}
    if(bulk.keep)change(items=>items.map(item=>targets.has(item.id)?{...item,style:{...item.style,...patch}}:item));
    else apply(targets,patch,true);
    notify('Configuração aplicada a '+targets.size+' cartaz(es).');
  }
  function scaleBatch(label,fields,factor) {
    const targets=ids();
    if(!targets.size){notify('Selecione pelo menos um cartaz.',true);return;}
    change(items=>items.map(item=>targets.has(item.id)?scalePoster(item,fields,factor):item));
    notify(label+' · tamanho ajustado em '+targets.size+' cartaz(es).');
  }
  function movePrice(item,key,offset) {
    const current=batchRef.current.items.find(p=>p.id===item.id);
    const original=effectiveStyle(current).priceOffsets;
    const priceOffsets=key?{...original,[key]:offset}:Object.fromEntries(Object.keys(original).map(name=>[name,{x:0,y:0}]));
    individual(item,{priceOffsets});
  }
  function toggle(id,checked){const next=new Set(selected);if(checked)next.add(id);else next.delete(id);setSelected(next);}
  async function save(withEvent) {
    const latest=batchRef.current;
    const next={...data,batches:data.batches.map(b=>b.id===latest.id?latest:b),events:withEvent?[withEvent,...data.events]:data.events};
    if(await commit(next)){storeDraft(latest,true);return true;}
    return false;
  }
  async function startExport(options) {
    const {items:chosen,print,label}=options;
    setExportError('');
    if(print&&!imposed){setExportError('Confira as margens e a configuração da folha.');return;}
    if(!chosen.length){setExportError('Selecione cartazes para continuar.');return;}
    const progress={cancelled:false};
    cancel.current=progress;
    setWorking({done:0,total:chosen.length});
    try {
      const onProgress=(done,total)=>setWorking({done,total});
      const original=printOptions.sheet==='Formato do lote'&&Number(printOptions.perSheet)===1&&!Number(printOptions.margin)&&Number(printOptions.copies)===1&&!printOptions.marks;
      const outcome=print&&!original ?
        await composePrint(chosen,config,printOptions,Number(resolution),onProgress,progress) :
        await renderExports(chosen,config,print?'PDF':mode,Number(resolution),onProgress,progress);
      if(progress.cancelled)throw Error('Exportação cancelada.');
      const filename=batch.name.replace(/[<>:"/\\|?*]/g,'-')+'.'+outcome.extension;
      if(print) {
        setPrintPreview({url:URL.createObjectURL(outcome.blob),filename,warnings:outcome.warnings});
      } else {
        download(outcome.blob,filename);
        notify(outcome.warnings?'Arquivo exportado. '+outcome.warnings+' página(s) têm avisos na galeria.':'Arquivo exportado.',!!outcome.warnings);
        setExporter(null);
      }
      await save(event(print?'Impressão solicitada':'Exportação realizada',batch.name+' · '+label,config.store));
    } catch(error){setExportError(progress.cancelled?'Operação cancelada.':(error.message||'Não foi possível preparar o arquivo.'));}
    finally{setWorking(null);cancel.current=null;}
  }
  function closeExport() {
    if(working)return;
    setExporter(null);setPrintPreview(null);setExportError('');
  }
  function openExport(chosen,print=false) {
    setMode('PDF');setExportError('');setPrintPreview(null);
    if(print)setPrintOptions(defaultPrint());
    setExporter({items:chosen,print,label:chosen.length+' produto(s)'});
  }
  function editSize(item,key,value) {
    if(!Number.isFinite(value))return;
    if(key==='price'){
      const current=batchRef.current.items.find(p=>p.id===item.id);
      individual(item,{sizes:resizePrice(effectiveStyle(current).sizes,value)});
    } else individual(item,{sizes:{[key]:Math.max(key==='description'?14:8,Math.min(300,value))}});
  }
  return <><PageHeading title={batch.name} subtitle={items.length+' '+(items.length===1?'oferta':'ofertas')+' · '+config.format+(dirty?' · Alterações pendentes':' · Lote salvo')}>
    <Button icon={Save} disabled={!dirty} onClick={async()=>{if(await save())notify('Ajustes do lote salvos.');}}>Salvar ajustes</Button>
    <Button icon={Printer} onClick={()=>openExport(selectedItems.length?selectedItems:items,true)}>Imprimir</Button>
    <Button icon={ArrowDownToLine} variant="primary" onClick={()=>openExport(selectedItems.length?selectedItems:items)}>Exportar</Button>
  </PageHeading>
  {pages.length>0&&<details className="panel leafletPreviews" open><summary>Prévia das páginas ({pages.length})</summary><div className="posterGrid" style={{'--poster-size':'240px'}}>{pages.map((page,i)=><article className="posterCard" key={i}><div className="posterTop"><strong>Página {i+1}</strong><div className="actions"><IconButton icon={Printer} label="Imprimir página" onClick={()=>openExport(page,true)}/><IconButton icon={ArrowDownToLine} label="Exportar página" onClick={()=>openExport(page)}/></div></div><CanvasPreview posters={page} config={config}/></article>)}</div></details>}
  <section className="panel batchPanel">
    <div className="section-heading"><div><h2>Ajustes em lote</h2><p>Aplique fontes e splash aos cartazes escolhidos.</p></div><div className="tileIcon orange"><Sparkles size={21}/></div></div>
    <div className="formGrid four">
      <Field label="Aplicar em"><Select value={bulk.scope} options={['Todos','Selecionados']} onChange={scope=>setBulk({...bulk,scope})}/></Field>
      <Field label="Fonte da descrição"><Select value={bulk.descFont} options={fontOptions} onChange={descFont=>setBulk({...bulk,descFont})}/></Field>
      <Field label="Fonte do preço"><Select value={bulk.priceFont} options={fontOptions} onChange={priceFont=>setBulk({...bulk,priceFont})}/></Field>
      <Field label="Splash"><Select value={bulk.shape} options={splashes} onChange={shape=>setBulk({...bulk,shape})}/></Field>
    </div>
    <div className="groupChecks inlineChecks"><Check checked={bulk.splashPrice} onChange={e=>setBulk({...bulk,splashPrice:e.target.checked})}>Atrás do preço</Check><Check checked={bulk.splashDesc} onChange={e=>setBulk({...bulk,splashDesc:e.target.checked})}>Atrás da descrição</Check><Check checked={bulk.keep} onChange={e=>setBulk({...bulk,keep:e.target.checked})}>Preservar ajustes individuais</Check><input type="color" value={bulk.color} aria-label="Cor do splash em lote" disabled={bulk.shape===brushSplash} onChange={e=>setBulk({...bulk,color:e.target.value})}/></div>
    <div className="actions"><Button onClick={()=>applying({descFont:bulk.descFont,priceFont:bulk.priceFont})}>Aplicar fontes</Button><Button icon={Sparkles} onClick={()=>applying({splashPrice:bulk.splashPrice,splashDesc:bulk.splashDesc,shape:bulk.shape,color:bulk.color})}>Aplicar splash</Button><Button onClick={()=>applying({splashPrice:false,splashDesc:false})}>Remover splash</Button><Button icon={RotateCcw} onClick={()=>applying({splashPrice:config.splashPrice,splashDesc:config.splashDesc,shape:config.shape,color:config.color})}>Restaurar splash do lote</Button></div>
    <div className="batchScale">
      <strong>Tamanho em lote</strong>
      <div className="batchScaleGrid">{scaleGroups.map(([label,fields])=><div className="batchScaleControl" key={label}>
        <span>{label}</span>
        <Button aria-label={'Diminuir '+label+' em 10% no lote'} onClick={()=>scaleBatch(label,fields,.9)}>−10%</Button>
        <Button aria-label={'Aumentar '+label+' em 10% no lote'} onClick={()=>scaleBatch(label,fields,1.1)}>+10%</Button>
      </div>)}</div>
    </div>
  </section>
  <div className="galleryToolbar">
    <Check checked={all} onChange={e=>setSelected(e.target.checked?new Set(items.map(p=>p.id)):new Set())}>Selecionar todos</Check><span className="countLabel">{selectedItems.length} selecionados</span>
    <div className="spacer"/><label className="zoom">Zoom <input type="range" min="205" max="430" value={zoom} aria-label="Zoom da galeria" onChange={e=>setZoom(Number(e.target.value))}/></label>
    <div className="switcher"><IconButton icon={Grid2X2} label="Grade" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}/><IconButton icon={List} label="Lista" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}/></div>
  </div>
  <section className={'posterGrid '+layout} style={{'--poster-size':zoom+'px'}}>
    {items.slice(0,max).map((item,index)=>{
      const style=effectiveStyle(item);
      return <article className="posterCard" key={item.id}>
        <div className="posterTop"><Check checked={selected.has(item.id)} onChange={e=>toggle(item.id,e.target.checked)}>Cartaz {String(index+1).padStart(3,'0')}</Check><div className="actions">
          <IconButton icon={Pencil} label="Editar cartaz" onClick={()=>setEditing(item.id)}/><IconButton icon={ArrowDownToLine} label="Baixar cartaz" onClick={()=>openExport([item])}/><IconButton icon={Printer} label="Imprimir cartaz" onClick={()=>openExport([item],true)}/>
        </div></div>
        <CanvasPreview poster={item} config={config}/>
        <div className="cardControls"><strong title={item.product.name}>{item.product.commercial||item.product.name}</strong>
          <div className="typeControls">{basic.map(key=><Stepper key={key} label={sizeLabels[key]} min={key==='description'?14:8} max={key==='price'?maxPriceSize:300} value={style.sizes[key]} onChange={value=>editSize(item,key,value)} onReset={()=>resetSize(item,key)}/>)}</div>
          <div className="groupChecks"><Check checked={!!style.splashPrice} onChange={e=>individual(item,{splashPrice:e.target.checked})}>Splash do preço</Check><Check checked={!!style.splashDesc} onChange={e=>individual(item,{splashDesc:e.target.checked})}>Splash da descrição</Check></div>
          <div className="actions cardBottom"><IconButton icon={RotateCcw} label="Restaurar padrão do cartaz" onClick={()=>restore(item)}/><Button onClick={()=>{setClip({...style,sizes:{...style.sizes}});notify('Estilo copiado.');}}>Copiar estilo</Button><Button disabled={!clip} onClick={()=>individual(item,clip)}>Colar</Button><IconButton icon={Copy} label="Duplicar cartaz" onClick={()=>change(items=>[...items,{...structuredClone(item),id:id()}])}/><IconButton icon={Trash2} label="Excluir cartaz" disabled={items.length===1} onClick={()=>{if(window.confirm('Excluir este cartaz do lote?'))change(items=>items.filter(p=>p.id!==item.id));}}/></div>
        </div>
      </article>;
    })}
  </section>
  {items.length>max&&<div className="loadMore"><Button onClick={()=>setMax(max+36)}>Ver mais {Math.min(36,items.length-max)} cartazes</Button><small>{max} de {items.length}</small></div>}
  {current&&<Modal wide title="Ajustes do cartaz" onClose={()=>setEditing('')}>
    <div className="advancedPoster"><PosterPositionEditor poster={current} config={config} onPosition={(key,offset)=>movePrice(current,key,offset)}/><div>
      <div className="formGrid two"><Field label="Fonte da descrição"><Select value={effectiveStyle(current).descFont} onChange={descFont=>individual(current,{descFont})} options={fontOptions}/></Field><Field label="Fonte do preço"><Select value={effectiveStyle(current).priceFont} onChange={priceFont=>individual(current,{priceFont})} options={fontOptions}/></Field></div>
      <p className="artworkHint">Preço completo ajusta R$, valor, vírgula e centavos na mesma proporção.</p>
      <div className="typeControls">{advancedSizes.map(key=><Stepper key={key} label={sizeLabels[key]} min={key==='description'?14:8} max={key==='price'?maxPriceSize:300} value={effectiveStyle(current).sizes[key]} onChange={value=>editSize(current,key,value)} onReset={()=>resetSize(current,key)}/>)}</div>
      <div className="formGrid two"><Field label="Modelo de splash"><Select value={effectiveStyle(current).shape} onChange={shape=>individual(current,{shape})} options={splashes}/></Field>
      <Field label="Cor do splash"><input type="color" disabled={effectiveStyle(current).shape===brushSplash} value={effectiveStyle(current).color} onChange={e=>individual(current,{color:e.target.value})}/></Field>
      {[['scale','Escala',.25,4,.01],['opacity','Opacidade',0,1,.05],['x','Posição horizontal',-300,300,1],['y','Posição vertical',-300,300,1],['rotation','Rotação',-180,180,1]].map(([key,label,min,max,step])=><Field key={key} label={label}><input type="range" min={min} max={max} step={step} value={effectiveStyle(current)[key]} onChange={e=>individual(current,{[key]:Number(e.target.value)})}/></Field>)}</div>
      <div className="groupChecks"><Check checked={effectiveStyle(current).auto} onChange={e=>individual(current,{auto:e.target.checked})}>Ajustar texto automaticamente</Check><Check checked={!!effectiveStyle(current).splashPrice} onChange={e=>individual(current,{splashPrice:e.target.checked})}>Splash do preço</Check><Check checked={!!effectiveStyle(current).splashDesc} onChange={e=>individual(current,{splashDesc:e.target.checked})}>Splash da descrição</Check></div>
    </div></div><div className="modalActions"><Button icon={RotateCcw} onClick={()=>restore(current)}>Restaurar padrão</Button><Button variant="primary" onClick={()=>setEditing('')}>Concluir</Button></div>
  </Modal>}
  {exporter&&<Modal wide={!!printPreview} title={printPreview?'Prévia de impressão':exporter.print?'Preparar impressão':'Exportar arquivos'} onClose={closeExport}>
    {printPreview?<div className="printPreview">
      <p className="muted">Use o ícone de impressora da prévia ou abra o PDF no visualizador do navegador.</p>
      {printPreview.warnings>0&&<p className="printNotice" role="status">{printPreview.warnings} arte(s) têm avisos na galeria. Confira a prévia antes de imprimir.</p>}
      <div className="actions printLinks">
        <a className="btn primary" href={printPreview.url} target="_blank" rel="noopener"><Printer size={17}/> Abrir PDF para imprimir</a>
        <a className="btn" href={printPreview.url} download={printPreview.filename}><ArrowDownToLine size={17}/> Baixar PDF</a>
        <Button onClick={()=>setPrintPreview(null)}>Voltar aos ajustes</Button>
      </div>
      <iframe title="Visualização do PDF de impressão" src={printPreview.url}/>
    </div>:<>
    {exportError&&<p className="inlineError" role="alert">{exportError}</p>}
    <p className="muted">{exporter.label} · {splitPages(exporter.items,config).length} página(s) · {config.width} × {config.height} {config.unit}</p>
    <div className="formGrid two">
      {!exporter.print&&<Field label="Arquivo"><Select value={mode} onChange={setMode} disabled={!!working} options={['PDF','PNG','JPEG','PNG em ZIP','PDFs em ZIP']}/></Field>}
      <Field label="Resolução"><Select value={resolution} disabled={!!working} onChange={setResolution} options={[{value:'96',label:'96 DPI · Tela'},{value:'150',label:'150 DPI · Padrão'},{value:'300',label:'300 DPI · Impressão'}]}/></Field>
    </div>
    {exporter.print&&<>
      <div className="formGrid two innerHeading">
        <Field label="Tamanho da folha"><Select value={printOptions.sheet} disabled={!!working} onChange={v=>setPrint('sheet',v)} options={['Formato do lote','A3','A4','A5']}/></Field>
        <Field label="Orientação da folha"><Select value={printOptions.orientation} disabled={!!working||printOptions.sheet==='Formato do lote'} onChange={v=>setPrint('orientation',v)} options={['Retrato','Paisagem']}/></Field>
        {[['perSheet','Artes por folha',1,24],['copies','Cópias',1,20],['margin','Margem (mm)',0,100],['gap','Espaçamento (mm)',0,100]].map(([key,label,min,max])=><Field key={key} label={label}><input disabled={!!working} type="number" min={min} max={max} value={printOptions[key]} onChange={e=>setPrint(key,e.target.value)}/></Field>)}
      </div>
      <div className="groupChecks"><Check disabled={!!working} checked={printOptions.marks} onChange={e=>{setPrint('marks',e.target.checked);if(e.target.checked&&!Number(printOptions.margin))setPrint('margin','4');}}>Adicionar marcas de corte</Check></div>
      {imposed?<p className="muted">{Math.ceil(splitPages(exporter.items,config).length*imposed.copies/imposed.perSheet)} folha(s) · {imposed.sheetW.toFixed(1)} × {imposed.sheetH.toFixed(1)} mm</p>:<p className="inlineError">Ajuste o tamanho da folha, as margens ou o espaçamento.</p>}
    </>}
    {working&&<div className="progress"><progress value={working.done} max={working.total}/><span>{working.done} / {working.total}</span></div>}
    <div className="modalActions"><Button onClick={()=>working?cancel.current.cancelled=true:closeExport()}>Cancelar</Button><Button icon={exporter.print?Printer:ArrowDownToLine} variant="primary" disabled={!!working||exporter.print&&!imposed} onClick={()=>startExport(exporter)}>{working?'Preparando…':exporter.print?'Abrir prévia':'Baixar arquivo'}</Button></div>
    </>}
  </Modal>}
  </>;
}

