import {themedPosters} from './template-art.mjs';

export const empty = () => ({
  company: null, stores: [], products: [], offers: [], imports: [], batches: [],
  templates: [], campaigns: [], media: [], events: [], profiles: [], favorites: []
});
export const id = () => globalThis.crypto.randomUUID();
export const now = () => new Date().toISOString();
export const today = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Fortaleza'}).format(date);
export const dateLabel = value => value ? new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Fortaleza'}).format(new Date(value.length === 10 ? value+'T12:00:00Z' : value)) : '';
export const money = cents => cents == null ? '' : new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents/100);
export const normalized = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const fields = {
  code:'Código interno', ean:'EAN / GTIN', name:'Descrição original', commercial:'Descrição comercial',
  brand:'Marca', category:'Categoria', unit:'Unidade', weight:'Peso ou volume', notes:'Observações',
  normal:'Preço normal', promo:'Preço promocional', retail:'Preço de varejo', wholesale:'Preço de atacado',
  card:'Preço do cartão', club:'Preço do clube', minimum:'Quantidade mínima', limit:'Limite por cliente',
  start:'Data inicial', end:'Data final'
};
export const prices = ['normal','promo','retail','wholesale','card','club'];
export const offerKeys = [...prices,'minimum','limit','start','end'];
export const productKeys = Object.keys(fields).filter(key => !offerKeys.includes(key));
export const formats = {
  A2:[420,594,'mm'], A3:[297,420,'mm'], A4:[210,297,'mm'], A5:[148,210,'mm'], A6:[105,148,'mm'], A7:[74,105,'mm'],
  'Meia folha A4':[210,148.5,'mm'], 'Etiqueta de gôndola':[90,40,'mm'],
  'Instagram Story':[1080,1920,'px'], 'Instagram Feed':[1080,1080,'px'], 'Instagram Retrato':[1080,1350,'px'],
  'Full HD':[1920,1080,'px'], 'Banner':[1000,500,'mm']
};
export const quantityPromotion='Compre X e pague X';
export const comboPromotion='Combo de produtos';
export const dynamics = ['Preço único','De/Por','Varejo e atacado','Oferta do cartão','Oferta do clube','Preço por quilo','Preço por unidade',quantityPromotion,comboPromotion];
export const fonts = [
  {name:'Anton',category:'Preços gigantes',file:'anton'}, {name:'Bangers',category:'Cartazista moderno',file:'bangers'},
  {name:'Knewave',category:'Cartazista tradicional',file:'knewave'}, {name:'Archivo Black',category:'Impacto',file:'archivoblack'},
  {name:'Lilita One',category:'Arredondada',file:'lilitaone'}, {name:'Bowlby One SC',category:'Preços gigantes',file:'bowlbyonesc'},
  {name:'Caveat Brush',category:'Pincel',file:'caveatbrush'},
  {name:'Poppins',category:'Clássica',file:'poppins'}, {name:'Montserrat',category:'Clássica',file:'montserrat'},
  {name:'Arial',category:'Clássica'}
];
export const brushSplash='Pincelada amarela';
export const splashes = ['Explosão clássica','Estrela','Selo irregular','Círculo','Oval','Faixa',brushSplash];
const themes = [
  ['Oferta do Dia','#ffda29','#e02b25','#1d1612','OFERTA DO DIA'],
  ['Super Ofertas','#ffd225','#fc4b20','#201015','SUPER OFERTA'],
  ['Black Friday','#171427','#9c51ff','#ffffff','BLACK FRIDAY'],
  ['Hortifruti','#e6f5ce','#21864c','#173a23','HORTIFRUTI'],
  ['Feirão de Ofertas','#f1eeff','#553bd2','#232042','FEIRÃO DE OFERTAS'],
  ['Cartaz Econômico','#ffffff','#20212b','#1f2130','PREÇO ESPECIAL'],
  ['Estilo Cartazista','#fff4c3','#e63939','#251b1d','SUPER OFERTA'],
  ['Oferta com Foto','#dff6ff','#1563ae','#11324d','OFERTA ESPECIAL']
];
const originalTemplates = themes.map(([name,bg,accent,ink,headline],i)=>({id:'modelo-'+(i+1),name,bg,accent,ink,headline,version:1,photo:i===7,paper:i===5,descFont:i===6?'Knewave':'Bangers',priceFont:'Anton'}));
export const builtins = [...originalTemplates,...themedPosters];
export const sizes = {description:62,price:132,cents:62,currency:37,separator:44,unit:32,secondary:39,normal:27,promo:29,wholesale:29,validity:23,limit:22,minimum:21,auxiliary:25};
export const defaultPriceSize=300;
export const maxPriceSize=600;
export const pricePieces=['price','currency','separator','cents'];
export function resizePrice(current,nextSize) {
  const price=Math.max(8,Math.min(maxPriceSize,nextSize));
  const ratio=price/current.price;
  return Object.fromEntries(pricePieces.map(key=>[key,key==='price'?price:current[key]*ratio]));
}
export const sizeLabels = {description:'Descrição',price:'Preço completo',cents:'Centavos',currency:'Símbolo R$',separator:'Vírgula',unit:'Unidade',secondary:'Preço secundário',normal:'Preço normal',promo:'Preço promocional',wholesale:'Preço de atacado',validity:'Validade',limit:'Limite por cliente',minimum:'Quantidade mínima',auxiliary:'Texto auxiliar'};
export const sample = {name:'Arroz Tipo 1',commercial:'ARROZ TIPO 1',unit:'UN',weight:'5 kg',promo:1997,normal:2399};
export function parseMoney(input) {
  if (input == null || String(input).trim() === '') return null;
  let value = String(input).trim().replace(/^R\$\s*/, '').replace(/\s/g,'');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) value = value.replace(/\./g,'');
  const match = value.match(/^(\d{1,9})(?:[,.](\d{1,2}))?$/);
  if (!match) throw Error('Preço inválido');
  return Number(match[1])*100 + Number((match[2] || '').padEnd(2,'0'));
}
export function parseDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  let iso = match ? match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0') : text.slice(0,10);
  const parsed = new Date(iso+'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(+parsed) || parsed.toISOString().slice(0,10) !== iso) throw Error('Data inválida');
  return iso;
}
export function parseProduct(values) {
  const out = {};
  for (const key of productKeys) out[key] = String(values[key] ?? '').trim().slice(0, key==='notes' ? 1000 : 250);
  if (!out.name) throw Error('Informe a descrição original');
  for (const key of prices) {
    try { out[key] = parseMoney(values[key]); } catch { throw Error(fields[key]+' inválido'); }
  }
  for (const key of ['minimum','limit']) {
    const value = String(values[key] ?? '').trim();
    if (value && !/^\d{1,7}$/.test(value)) throw Error(fields[key]+' inválida');
    out[key] = value ? Number(value) : null;
  }
  for (const key of ['start','end']) out[key] = parseDate(values[key]);
  if (out.start && out.end && out.start > out.end) throw Error('Validade inicial posterior à final');
  return out;
}
export function visibleOffer(data, productId, store = '', date = today()) {
  const offers = data.offers.filter(o=>o.productId===productId && (!o.store || o.store===store));
  const active = o=>(!o.start || o.start<=date) && (!o.end || o.end>=date);
  const latest = new Map();
  for(const offer of offers) {
    const key=[offer.store,offer.start||'',offer.end||''].join('|');
    if(!latest.has(key))latest.set(key,offer);
  }
  return [...latest.values()].find(o=>o.store===store && active(o)) ||
    [...latest.values()].find(o=>!o.store && active(o)) ||
    offers.find(o=>o.store===store) || offers[0] || {};
}
export function writeProduct(data, values, options = {}) {
  const before = data.products.find(p=>p.id===options.id);
  const key = before?.id || id();
  const product = Object.fromEntries(productKeys.map(k=>[k,values[k] ?? '']));
  Object.assign(product,{id:key, image:options.image ?? before?.image ?? '', importId:before?.importId || options.importId || '', created:before?.created || now()});
  const commercial = Object.fromEntries(offerKeys.map(k=>[k,values[k] ?? null]));
  const store = options.store || '';
  const old = data.offers.find(o=>o.productId===key && o.store===store);
  const changed = offerKeys.some(k=>(old?.[k] ?? (k==='start'||k==='end' ? '' : null))!==commercial[k]);
  return {...data,
    products:before ? data.products.map(p=>p.id===key?product:p) : [product,...data.products],
    offers:changed && !options.skipOffer ? [{...commercial,id:id(),productId:key,store,created:now(),importId:options.importId || ''},...data.offers] : data.offers
  };
}
export const primaryPrice = (product, dynamic) => {
  if(dynamic===quantityPromotion||dynamic===comboPromotion)return product.promotion?.total ?? null;
  if (dynamic==='Varejo e atacado') return product.wholesale;
  if (dynamic==='Oferta do cartão') return product.card;
  if (dynamic==='Oferta do clube') return product.club;
  return product.promo ?? product.retail ?? product.normal;
};
function promotionCount(value,label,min=1) {
  const count=Number(value);
  if(!Number.isInteger(count)||count<min||count>999)throw Error(label+' deve ser entre '+min+' e 999.');
  return count;
}
function promotionTotal(value) {
  let total;
  try {total=parseMoney(value);} catch {throw Error('Informe um valor total válido, como 19,90.');}
  if(total==null)throw Error('Informe o valor total da promoção.');
  return total;
}
export function promotionalProducts(products,dynamic,details,comboQuantities) {
  if(dynamic===quantityPromotion) {
    const buy=promotionCount(details.buy,'A quantidade para comprar',2);
    if(details.payment==='total') {
      const total=promotionTotal(details.total);
      return products.map(product=>({...product,promotion:{kind:'fixed',buy,total}}));
    }
    const pay=promotionCount(details.pay,'A quantidade para pagar');
    if(pay>=buy)throw Error('Informe uma quantidade para pagar menor que a quantidade comprada.');
    return products.map(product=>{
      const unitPrice=primaryPrice(product,'Preço único');
      const total=unitPrice==null?null:unitPrice*pay;
      return {...product,promotion:{kind:'quantity',buy,pay,total}};
    });
  }
  if(dynamic===comboPromotion) {
    if(products.length<2)throw Error('Selecione pelo menos dois produtos diferentes para o combo.');
    const total=promotionTotal(details.total);
    const name=details.name.trim()||'Combo de ofertas';
    const items=products.map(product=>({id:product.id,name:product.commercial||product.name,
      quantity:promotionCount(comboQuantities[product.id]??1,'A quantidade de '+product.name)}));
    return [{id:id(),name,promotion:{kind:'combo',items,total}}];
  }
  return products;
}
export function promotionCaption(promotion) {
  if(promotion?.kind==='quantity')return 'COMPRE '+promotion.buy+' E PAGUE '+promotion.pay;
  if(promotion?.kind==='fixed')return 'COMPRE '+promotion.buy+' UNIDADES POR';
  if(promotion?.kind==='combo')return 'PREÇO DO COMBO';
  return '';
}
export const posterFromProduct = (product, template, cfg) => ({
  id:id(), product:structuredClone(product), template:structuredClone(template),
  style:{sizes:resizePrice(sizes,defaultPriceSize), descFont:cfg.descFont || template.descFont, priceFont:cfg.priceFont || template.priceFont,
    splashPrice:cfg.splashPrice, splashDesc:cfg.splashDesc, shape:cfg.shape, color:cfg.color,
    scale:1, opacity:1, x:0, y:0, rotation:0, auto:true},
  overrides:{}
});
export const effectiveStyle = poster => ({
  ...poster.style,...poster.overrides,
  sizes:{...sizes,...poster.style.sizes,...poster.overrides?.sizes},
  priceOffsets:{...poster.style.priceOffsets,...poster.overrides?.priceOffsets}
});
export function scalePoster(poster,fields,factor) {
  const style=effectiveStyle(poster);
  const overrides={...poster.overrides};
  if(fields.includes('price')||fields.includes('description')){
    overrides.sizes={...overrides.sizes};
    if(fields.includes('price'))Object.assign(overrides.sizes,resizePrice(style.sizes,Math.round(style.sizes.price*factor)));
    if(fields.includes('description'))overrides.sizes.description=Math.max(14,Math.min(300,Math.round(style.sizes.description*factor)));
  }
  if(fields.includes('splash'))overrides.scale=Math.max(.25,Math.min(4,Math.round((style.scale||1)*factor*100)/100));
  return {...poster,overrides};
}
export const patchPoster = (items, ids, patch, replace=false) => items.map(p=>{
  if (!ids.has(p.id)) return p;
  const target = replace ? 'style' : 'overrides';
  const value = {...p[target],...patch};
  if (patch.sizes) value.sizes = {...p[target]?.sizes,...patch.sizes};
  if (!replace) return {...p,overrides:value};
  const overrides = {...p.overrides};
  for (const key of Object.keys(patch)) {
    if (key==='sizes') {
      overrides.sizes = {...overrides.sizes};
      for (const size of Object.keys(patch.sizes)) delete overrides.sizes[size];
    } else delete overrides[key];
  }
  return {...p,style:value,overrides};
});
export const mmInset = (width,height,unit) => unit==='px' ? [width*25.4/96,height*25.4/96] : unit==='cm' ? [width*10,height*10] : [width,height];
export const imagePixels = (width,height,unit,dpi) => unit==='px' ? [width,height] : mmInset(width,height,unit).map(v=>Math.round(v*dpi/25.4));
export const dimensions = cfg => {
  const [w,h,unit]=formats[cfg.format] || [Number(cfg.width),Number(cfg.height),cfg.unit];
  const [width,height] = cfg.landscape ? [h,w] : [w,h];
  if (![width,height].every(v=>Number.isFinite(v) && v>0 && v<=6000) || Math.max(width/height,height/width)>8) throw Error('Informe dimensões válidas com proporção entre 1:8 e 8:1.');
  return {width,height,unit};
};
export const event = (name,detail,store='') => ({id:id(),name,detail,store,created:now()});
export const campaignStatus = campaign => campaign.status==='Rascunho'||campaign.status==='Arquivada' ? campaign.status : campaign.start>today() ? 'Programada' : campaign.end<today() ? 'Encerrada' : 'Ativa';

