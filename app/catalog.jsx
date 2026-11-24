'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ChevronLeft, ChevronRight, Copy, FileSpreadsheet, Package, Pencil, Plus, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { Button, Check, Empty, Field, IconButton, ImageInput, Modal, PageHeading, ProductThumb, Select, imageData } from './ui';
import { dateLabel, event, fields, money, parseProduct, prices, primaryPrice, visibleOffer, writeProduct } from '@/lib/model.mjs';
import { applyImport, autoMap, previewRows, readWorkbook, revertImport } from '@/lib/imports.mjs';
import { download } from '@/lib/graphic.mjs';

export const storeOptions = data => data.stores.map(s=>({value:s.id,label:s.name}));
const searchProduct=(p,q)=>[p.name,p.commercial,p.code,p.ean,p.brand,p.category].join(' ').toLowerCase().includes(q.trim().toLowerCase());
export function ProductPicker({data,selected,setSelected,batch,setBatch,manage=false,store='',openProduct,removeProduct}) {
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(0);
  const list=data.products.filter(p=>(!batch||data.imports.find(i=>i.id===batch)?.productIds.includes(p.id))&&searchProduct(p,query));
  const last=Math.max(0,Math.ceil(list.length/15)-1);
  const actual=Math.min(page,last);
  const current=list.slice(actual*15,actual*15+15);
  const all=list.length>0&&list.every(p=>selected.has(p.id));
  function toggle(ids,checked) {
    const next=new Set(selected);
    for(const key of ids) if(checked)next.add(key);else next.delete(key);
    setSelected(next);
  }
  return <div className="productPicker">
    <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Buscar por descrição, marca ou código" aria-label="Buscar produtos" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></div>
      {data.imports.length>0&&<Select value={batch} onChange={value=>{setBatch(value);setPage(0);}} placeholder="Todas as importações" options={data.imports.map(i=>({value:i.id,label:i.name}))}/>}
      <span className="countLabel">{selected.size} selecionados</span>
    </div>
    {!current.length?<Empty icon={Package} title={data.products.length?'Nenhum resultado':'O catálogo está vazio'} detail={data.products.length?'Altere a busca ou o filtro.':'Cadastre produtos ou importe uma planilha para começar.'}/>:<>
      <div className="tableScroll"><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os resultados" checked={all} onChange={e=>toggle(list.map(p=>p.id),e.target.checked)}/></th><th>Produto</th><th>Código / EAN</th><th>Categoria</th><th>Preço</th>{manage&&<th>Ações</th>}</tr></thead>
      <tbody>{current.map(p=>{const offer=visibleOffer(data,p.id,store);return <tr key={p.id}>
        <td><input type="checkbox" aria-label={'Selecionar '+p.name} checked={selected.has(p.id)} onChange={e=>toggle([p.id],e.target.checked)}/></td>
        <td><div className="tableProduct"><ProductThumb src={p.image} name={p.name}/><div><strong>{p.commercial||p.name}</strong><small>{[p.brand,p.weight,p.unit].filter(Boolean).join(' · ')}</small></div></div></td>
        <td>{p.code||'—'}{p.ean&&<small>{p.ean}</small>}</td><td>{p.category||'—'}</td><td><strong>{money(primaryPrice(offer,'Preço único'))||'—'}</strong></td>
        {manage&&<td><div className="actions"><IconButton icon={Pencil} label={'Editar '+p.name} onClick={()=>openProduct(p)}/><IconButton icon={Copy} label={'Duplicar '+p.name} onClick={()=>openProduct({...p,id:undefined,source:p.id,code:'',ean:''})}/><IconButton icon={Trash2} label={'Excluir '+p.name} onClick={()=>removeProduct([p.id])}/></div></td>}
      </tr>;})}</tbody></table></div>
      <div className="pagination"><span>{Math.min(actual*15+1,list.length)}–{Math.min((actual+1)*15,list.length)} de {list.length}</span><div className="actions"><IconButton icon={ChevronLeft} label="Página anterior" disabled={!actual} onClick={()=>setPage(actual-1)}/><IconButton icon={ChevronRight} label="Próxima página" disabled={actual>=last} onClick={()=>setPage(actual+1)}/></div></div>
    </>}
  </div>;
}
export function ProductForm({product,data,defaultStore,commit,onClose,notify}) {
  const [store,setStore]=useState(defaultStore||'');
  const [values,setValues]=useState({});
  const [image,setImage]=useState(product.image||'');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const offer=visibleOffer(data,product.id || product.source,store);
    setValues({...product,...offer,...Object.fromEntries(prices.map(key=>[key,offer[key]!=null?(offer[key]/100).toFixed(2).replace('.',','):'']))});
  },[store,product,data]);
  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const next=parseProduct(values);
      const duplicate=data.products.find(p=>p.id!==product.id && ((next.ean&&p.ean===next.ean)||(next.code&&p.code.toUpperCase()===next.code.toUpperCase())));
      if(duplicate)throw Error('O código ou EAN já está associado a '+duplicate.name+'.');
      setBusy(true);
      const draft=writeProduct(data,next,{id:product.id,store,image});
      if(await commit({...draft,events:[event(product.id?'Produto atualizado':'Produto cadastrado',next.name,store),...data.events]})) {onClose();notify('Produto salvo.');}
    } catch(e) {setError(e.message);}
    finally {setBusy(false);}
  }
  return <Modal wide title={product.id?'Editar produto':'Cadastrar produto'} onClose={onClose}><form onSubmit={save}>
    {error&&<p className="inlineError">{error}</p>}
    <div className="formGrid three">
      {Object.entries(fields).map(([key,label])=><Field label={label} key={key}><input autoFocus={key==='name'} required={key==='name'} type={['start','end'].includes(key)?'date':'text'} inputMode={prices.includes(key)?'decimal':undefined} value={values[key]??''} placeholder={prices.includes(key)?'0,00':undefined} onChange={e=>setValues({...values,[key]:e.target.value})}/></Field>)}
      <Field label="Loja da oferta"><Select value={store} onChange={setStore} placeholder="Todas as lojas" options={storeOptions(data)}/></Field>
    </div>
    <div className="actions imageForm"><ProductThumb src={image} name={values.name}/><ImageInput onLoad={files=>imageData(files[0]).then(setImage).catch(e=>setError(e.message))}/>{image&&<IconButton icon={X} label="Remover foto" onClick={()=>setImage('')}/>}</div>
    {product.id&&<details className="details"><summary>Histórico de preços</summary>{data.offers.filter(o=>o.productId===product.id).slice(0,12).map(o=><p key={o.id}>{dateLabel(o.created)} · {Object.keys(fields).filter(k=>prices.includes(k)&&o[k]!=null).map(k=>fields[k]+' '+money(o[k])).join(' · ')||'Sem preços'}</p>)}</details>}
    <div className="modalActions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit" disabled={busy}>Salvar produto</Button></div>
  </form></Modal>;
}
export function Products({data,go,openProduct,commit,notify,pick,store}) {
  const [selected,setSelected]=useState(new Set());
  const [batch,setBatch]=useState('');
  async function removeProduct(ids) {
    if(!window.confirm('Excluir '+ids.length+' produto(s) do catálogo? Os cartazes salvos continuarão disponíveis.'))return;
    const keys=new Set(ids);
    if(await commit({...data,products:data.products.filter(p=>!keys.has(p.id)),offers:data.offers.filter(o=>!keys.has(o.productId)),
      events:[event('Produtos excluídos',ids.length+' produtos',store),...data.events]})){
      setSelected(new Set([...selected].filter(key=>!keys.has(key))));
      notify('Catálogo atualizado.');
    }
  }
  return <><PageHeading title="Produtos" subtitle="Organize seu catálogo e mantenha o histórico de preços.">
    <Button icon={FileSpreadsheet} onClick={()=>go('import')}>Importar</Button><Button icon={Plus} variant="primary" onClick={()=>openProduct({})}>Novo produto</Button>
  </PageHeading><section className="panel tablePanel">
    {selected.size>0&&<div className="toolbar selectionBar"><Button icon={Plus} variant="primary" onClick={()=>pick(selected)}>Criar cartazes dos selecionados</Button><Button icon={Trash2} onClick={()=>removeProduct([...selected])}>Excluir selecionados</Button></div>}
    <ProductPicker data={data} selected={selected} setSelected={setSelected} batch={batch} setBatch={setBatch} manage store={store} openProduct={openProduct} removeProduct={removeProduct}/>
  </section></>;
}
function csvBlob(lines){return new Blob(['\uFEFF'+lines.map(line=>line.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});}
export function Importer({data,commit,notify,pick}) {
  const [source,setSource]=useState(null);
  const [sheet,setSheet]=useState('');
  const [map,setMap]=useState({});
  const [store,setStore]=useState('');
  const [profile,setProfile]=useState('');
  const [update,setUpdate]=useState(false);
  const [updatePrices,setUpdatePrices]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [drag,setDrag]=useState(false);
  const rows=source?.sheets[sheet]||[];
  const headers=rows[0]||[];
  const preview=useMemo(()=>rows.length>1?previewRows(rows.slice(1),map,data):[],[rows,map,data]);
  const ok=preview.filter(row=>!row.error&&(!row.existing||update)).length;
  async function read(file) {
    if(!file)return;
    setBusy(true);
    setError('');
    try {
      const sheets=await readWorkbook(file);
      const first=Object.keys(sheets).find(key=>sheets[key].length>1);
      if(!first)throw Error('A planilha precisa ter cabeçalho e pelo menos uma linha de dados.');
      if(sheets[first].length>10001)throw Error('Divida a planilha em lotes de até 10.000 produtos.');
      setSource({name:file.name,sheets});setSheet(first);setMap(autoMap(sheets[first][0]));setUpdatePrices(false);setUpdate(false);
    } catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  function selectSheet(key) {
    if(source.sheets[key].length>10001){setError('Divida a planilha em lotes de até 10.000 produtos.');return;}
    setError('');
    setSheet(key);setMap(autoMap(source.sheets[key][0]||[]));
  }
  async function submit() {
    if(!ok||map.name<0)return;
    if(!window.confirm('Confirmar importação de '+ok+' produto(s)?'+(updatePrices?' Os preços mapeados dos produtos existentes poderão mudar.':'')))return;
    setBusy(true);
    try {
      let next=applyImport(data,preview,{name:source.name,store,update,updatePrices});
      const exists=data.profiles.find(p=>p.name===profile.trim());
      if(profile.trim())next={...next,profiles:[...data.profiles.filter(p=>p!==exists),{name:profile.trim(),mapping:Object.fromEntries(Object.entries(map).filter(([,idx])=>idx>=0).map(([key,idx])=>[key,headers[idx]]))}]};
      if(await commit(next)) {setSource(null);setProfile('');notify('Importação concluída. '+next.imports[0].count+' produtos processados.');}
    } finally {setBusy(false);}
  }
  async function remove(batch) {
    if(!window.confirm('Remover a importação '+batch.name+' e reverter as alterações que ainda podem ser desfeitas?'))return;
    try {
      if(await commit(revertImport(data,batch)))notify('Importação removida.');
    } catch(e) {notify(e.message,true);}
  }
  const report=batch=>download(csvBlob([['Linha','Erro'],...batch.errors.map(e=>[e.line,e.error])]),'erros-importacao.csv');
  return <><PageHeading title="Importar planilhas" subtitle="Transforme sua lista de produtos em ofertas prontas para editar.">
    <Button icon={ArrowDownToLine} onClick={()=>download(csvBlob([Object.values(fields)]),'modelo-produtos.csv')}>Baixar planilha modelo</Button>
  </PageHeading>
  {error&&<p className="inlineError">{error}</p>}
  {!source?<section className="panel"><label className={'dropzone'+(drag?' drag':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);read(e.dataTransfer.files[0]);}}>
    <div className="emptyIcon"><UploadCloud size={29}/></div><h2>{busy?'Lendo planilha…':'Arraste sua planilha para cá'}</h2><p>Arquivos XLS, XLSX ou CSV de até 12 MB</p>
    <span className="btn primary"><FileSpreadsheet size={17}/> Escolher arquivo</span><input type="file" accept=".xls,.xlsx,.csv" disabled={busy} onChange={e=>read(e.target.files[0])}/>
  </label></section>:<section className="panel">
    <div className="section-heading"><div><h2>Associar colunas</h2><p>{source.name} · {preview.length} linhas</p></div><Button icon={X} onClick={()=>setSource(null)}>Trocar arquivo</Button></div>
    <div className="formGrid three">
      <Field label="Aba"><Select value={sheet} onChange={selectSheet} options={Object.keys(source.sheets)}/></Field>
      <Field label="Loja das ofertas"><Select options={storeOptions(data)} placeholder="Todas as lojas" value={store} onChange={setStore}/></Field>
      {data.profiles.length>0&&<Field label="Padrão salvo"><Select options={data.profiles.map(p=>p.name)} placeholder="Escolha um padrão" value={profile} onChange={name=>{setProfile(name);const preset=data.profiles.find(p=>p.name===name);if(preset)setMap(Object.fromEntries(Object.keys(fields).map(key=>[key,headers.indexOf(preset.mapping[key])])));}}/></Field>}
    </div>
    <div className="formGrid three mapping">{Object.entries(fields).map(([key,label])=><Field label={label+(key==='name'?' *':'')} key={key}><Select value={map[key]>=0?String(map[key]):''} placeholder="Não importar" onChange={value=>setMap({...map,[key]:value===''?-1:Number(value)})} options={headers.map((v,i)=>({value:String(i),label:String(v||'Coluna '+(i+1))}))}/></Field>)}</div>
    <div className="groupChecks"><Check checked={update} onChange={e=>{setUpdate(e.target.checked);if(!e.target.checked)setUpdatePrices(false);}}>Atualizar dados de produtos existentes</Check><Check disabled={!update} checked={updatePrices} onChange={e=>setUpdatePrices(e.target.checked)}>Atualizar preços e validade dos produtos existentes</Check></div>
    <Field label="Salvar associação de colunas como padrão (opcional)"><input value={profile} onChange={e=>setProfile(e.target.value)} placeholder="Ex.: Planilha do ERP"/></Field>
    <div className="section-heading innerHeading"><div><h2>Prévia da importação</h2><p>{ok} prontos para importar · {preview.filter(row=>row.error).length} linhas com erros</p></div></div>
    <div className="tableScroll"><table><thead><tr><th>Linha</th><th>Produto</th><th>EAN</th><th>Preço</th><th>Resultado</th></tr></thead><tbody>{preview.slice(0,12).map(r=><tr key={r.line}><td>{r.line}</td><td>{r.values?.name||'—'}</td><td>{r.values?.ean||'—'}</td><td>{money(r.values?.promo??r.values?.normal)||'—'}</td><td>{r.error||(r.existing?update?'Atualizar':'Existente · ignorar':'Novo produto')}</td></tr>)}</tbody></table></div>
    <div className="modalActions">{preview.some(row=>row.error)&&<Button icon={ArrowDownToLine} onClick={()=>report({errors:preview.filter(row=>row.error)})}>Baixar erros</Button>}<Button icon={UploadCloud} variant="primary" disabled={!ok || busy || !(map.name>=0)} onClick={submit}>Confirmar importação</Button></div>
  </section>}
  <section className="panel module-section"><div className="section-heading"><div><h2>Importações recentes</h2><p>Consulte o resultado e selecione todos os produtos de um lote.</p></div></div>
    {data.imports.length?<div className="tableScroll"><table><thead><tr><th>Planilha</th><th>Data</th><th>Produtos</th><th>Ações</th></tr></thead><tbody>{data.imports.map(batch=><tr key={batch.id}><td><strong>{batch.name}</strong></td><td>{dateLabel(batch.created)}</td><td>{batch.count}</td><td><div className="actions"><Button onClick={()=>pick(new Set(batch.productIds),batch.id)}>Criar cartazes</Button>{batch.errors.length>0&&<IconButton icon={ArrowDownToLine} label="Baixar relatório de erros" onClick={()=>report(batch)}/>}<IconButton icon={Trash2} label="Excluir importação" onClick={()=>remove(batch)}/></div></td></tr>)}</tbody></table></div>:<Empty icon={FileSpreadsheet} title="Nenhuma importação"/>}
  </section></>;
}

