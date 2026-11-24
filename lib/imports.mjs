import { fields, normalized, parseProduct, writeProduct, event, id, now, visibleOffer, offerKeys, prices } from './model.mjs';

const aliases={
  code:['codigo','cod','sku','codigo produto','codigo interno'], ean:['ean','gtin','codigo barras','barcode'],
  name:['descricao','produto','nome','descricao produto','nome produto'], commercial:['descricao comercial','descricao cartaz'],
  brand:['marca'],category:['categoria','departamento','setor'],unit:['unidade','un','und','um'],weight:['peso','volume'],
  normal:['preco','valor','preco de','preco original'],promo:['promocao','oferta','preco oferta','preco por','valor promocional'],
  retail:['varejo'],wholesale:['atacado'],card:['cartao'],club:['clube'],start:['inicio','vigencia inicial'],end:['validade','vencimento','fim','vigencia final'],
  minimum:['qtd minima','minimo'],limit:['limite'],notes:['observacao','observacoes']
};
export function autoMap(headers) {
  const comparable=headers.map(normalized);
  return Object.fromEntries(Object.entries(fields).map(([key,label])=>[
    key,comparable.findIndex(header=>[label,...(aliases[key] || [])].map(normalized).includes(header))
  ]));
}
export function previewRows(rows,map,data) {
  const identity=value=>String(value??'').trim().toUpperCase();
  const storeMaps={code:new Map(),ean:new Map()};
  const seen={code:new Set(),ean:new Set(),target:new Set()};
  for(const p of data.products) {
    for(const k of ['code','ean']) if(p[k]) storeMaps[k].set(identity(p[k]),p.id);
  }
  return rows.map((row,index)=>{
    let line=index+2;
    try {
      const raw=Object.fromEntries(Object.entries(map).filter(([,i])=>i>=0).map(([key,i])=>[key,row[i]]));
      const values=parseProduct(raw);
      const ean=identity(values.ean);
      const code=identity(values.code);
      if((ean && seen.ean.has(ean)) || (code && seen.code.has(code))) throw Error('Identificador duplicado na planilha');
      const byEan=storeMaps.ean.get(ean),byCode=storeMaps.code.get(code);
      if(byEan && byCode && byEan!==byCode) throw Error('EAN e código pertencem a produtos diferentes');
      const target=byEan || byCode;
      if(target && seen.target.has(target))throw Error('Mais de uma linha atualiza o mesmo produto');
      if(target)seen.target.add(target);
      if(ean) seen.ean.add(ean);
      if(code) seen.code.add(code);
      return {line,values,existing:byEan || byCode,keys:Object.keys(raw)};
    } catch(error) {return {line,error:error.message};}
  });
}
export function applyImport(data,preview,{name,store,update,updatePrices}) {
  const batchId=id();
  const previous=[];
  const productIds=[];
  const createdProducts=[];
  let next=data;
  const seenTargets=new Set();
  for(const row of preview) {
    if(row.error || row.existing && (!update || seenTargets.has(row.existing))) continue;
    const before=next.products.find(p=>p.id===row.existing);
    const old=before ? (next.offers.find(o=>o.productId===before.id && o.store===store) || visibleOffer(next,before.id,store)) : {};
    const values={...(before || {}),...row.values};
    if (before) {
      for(const key of Object.keys(fields)) {
        if (!row.keys.includes(key)) values[key]=offerKeys.includes(key)?old[key]:before[key];
      }
      if(!updatePrices) for(const key of offerKeys) values[key]=old[key];
      previous.push({product:before});
      seenTargets.add(before.id);
    }
    const known=next.media.find(m=>(values.ean && m.ean===values.ean) || (!values.ean && values.code && m.code===values.code));
    next=writeProduct(next,values,{id:before?.id,store,importId:batchId,image:before?.image || known?.image,skipOffer:!!before && !updatePrices});
    const saved=before?next.products.find(p=>p.id===before.id):next.products[0];
    productIds.push(saved.id);
    if(before) previous.at(-1).after=saved;
    else createdProducts.push(saved);
  }
  const batch={id:batchId,name,store,created:now(),productIds,previous,createdProducts,count:productIds.length,errors:preview.filter(p=>p.error).map(({line,error})=>({line,error}))};
  return {...next,imports:[batch,...next.imports],events:[event('Planilha importada',name+' · '+productIds.length+' produtos',store),...next.events]};
}
export function revertImport(data,batch) {
  const created=new Set(data.products.filter(p=>p.importId===batch.id).map(p=>p.id));
  const originals=new Map((batch.createdProducts||[]).map(p=>[p.id,p]));
  const changed=new Map(batch.previous.map(p=>[p.product.id,p]));
  const later=data.imports.filter(i=>i.created>batch.created);
  if (later.some(i=>i.productIds.some(pid=>created.has(pid) || changed.has(pid))) ||
      data.offers.some(o=>created.has(o.productId) && o.importId!==batch.id) ||
      data.products.some(p=>originals.has(p.id) && JSON.stringify(originals.get(p.id))!==JSON.stringify(p)) ||
      data.products.some(p=>changed.has(p.id) && JSON.stringify(changed.get(p.id).after)!==JSON.stringify(p))) throw Error('Há alterações posteriores neste lote. Os dados foram preservados.');
  return {...data,
    products:data.products.filter(p=>!created.has(p.id)).map(p=>changed.get(p.id)?.product || p),
    offers:data.offers.filter(o=>o.importId!==batch.id && !created.has(o.productId)),
    imports:data.imports.filter(i=>i.id!==batch.id),
    events:[event('Importação removida',batch.name,batch.store),...data.events]
  };
}
export async function loadWorkbook() {
  if(window.XLSX) return window.XLSX;
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='/vendor/xlsx.full.min.js';
    script.onload=()=>resolve(window.XLSX);
    script.onerror=()=>reject(Error('Leitor de planilhas indisponível.'));
    document.head.append(script);
  });
}
export async function readWorkbook(file) {
  if(!/\.(xlsx?|csv)$/i.test(file.name) || file.size>12*1024*1024) throw Error('Selecione um XLS, XLSX ou CSV de até 12 MB.');
  const XLSX=await loadWorkbook();
  const bytes=await file.arrayBuffer();
  let input=bytes;
  if(/\.csv$/i.test(file.name)) {
    try {input=new TextDecoder('utf-8',{fatal:true}).decode(bytes);} catch {input=new TextDecoder('windows-1252').decode(bytes);}
  }
  const workbook=XLSX.read(input,{type:typeof input==='string'?'string':'array',raw:true,cellDates:true,sheetRows:10003});
  return Object.fromEntries(workbook.SheetNames.map(name=>[name, XLSX.utils.sheet_to_json(workbook.Sheets[name],{
    header:1,raw:false,dateNF:'yyyy-mm-dd',defval:'',blankrows:false
  })]));
}

