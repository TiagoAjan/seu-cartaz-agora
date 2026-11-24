import {empty} from './model.mjs';

const collections=Object.keys(empty());
export function validateWorkspace(data) {
  if (!data || typeof data!=='object' || typeof data.company?.name!=='string' || !data.company.name.trim() || data.company.name.length>150) throw Error('Dados da empresa inválidos.');
  for(const key of collections.filter(k=>k!=='company')) {
    if (!Array.isArray(data[key]) || data[key].length>50_000) throw Error('Coleção inválida: '+key);
  }
  const productIds=new Set(data.products.map(p=>p?.id));
  const stores=new Set(data.stores.map(s=>s?.id));
  for(const offer of data.offers) {
    if (!offer || !productIds.has(offer.productId) || offer.store && !stores.has(offer.store)) throw Error('Vínculo de oferta inválido.');
    for (const key of ['normal','promo','retail','wholesale','card','club']) {
      if (offer[key]!=null && (!Number.isSafeInteger(offer[key]) || offer[key]<0 || offer[key]>99999999999)) throw Error('Valor monetário inválido.');
    }
  }
}
