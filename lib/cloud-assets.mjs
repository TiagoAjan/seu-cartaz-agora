export const assetPattern=/^[a-f0-9]{64}\.(png|jpg|webp)$/;
export const assetPrefix='/api/workspace?asset=';
export const imagePattern=/^data:image\/(png|jpeg|webp);base64,/;

export async function externalizeImages(data,upload) {
  const entries=new Map();
  function replace(value) {
    if(typeof value==='string' && imagePattern.test(value)) {
      if(!entries.has(value)) entries.set(value,{value,url:null});
      return entries.get(value);
    }
    if(Array.isArray(value))return value.map(replace);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replace(v)]));
    return value;
  }
  const converted=replace(data);
  if(!entries.size)return data;
  const placeholders=new Set(entries.values());
  for(const entry of placeholders)entry.url=await upload(entry.value);
  function resolve(value) {
    if(placeholders.has(value))return value.url;
    if(Array.isArray(value))return value.map(resolve);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v)]));
    return value;
  }
  return resolve(converted);
}

