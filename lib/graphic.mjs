import {assetPattern,assetPrefix,imagePattern} from './cloud-assets.mjs';
import { dateLabel, effectiveStyle, imagePixels, mmInset, money, primaryPrice, fonts } from './model.mjs';

const fontLoads=new Map();
export function loadFont(name) {
  const spec=fonts.find(f=>f.name===name);
  if (!spec?.file) return Promise.resolve();
  if (!fontLoads.has(name)) fontLoads.set(name,document.fonts.load('40px "'+name+'"').catch(error=>{fontLoads.delete(name);throw error;}));
  return fontLoads.get(name);
}
function face(ctx,name,size) {ctx.font=size+'px "'+name+'", Arial, sans-serif';}
function linesFor(ctx,text,limit) {
  const lines=[];
  let line='';
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(line+' '+word).width>limit) {
      lines.push(line);
      line='';
    }
    line+=(line?' ':'')+word;
  }
  return line?[...lines,line]:lines;
}
function star(ctx,points,ratio) {
  for(let i=0;i<points*2;i++){
    const angle=i*Math.PI/points-Math.PI/2;
    const radius=i%2?ratio:1;
    const x=Math.cos(angle)*radius;
    const y=Math.sin(angle)*radius;
    if(i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
  }
  ctx.closePath();
}
function splash(ctx,x,y,w,h,style) {
  ctx.save();
  ctx.globalAlpha=style.opacity;
  ctx.fillStyle=style.color;
  ctx.translate(x+style.x,y+style.y);
  ctx.rotate(style.rotation*Math.PI/180);
  ctx.scale(w*style.scale/2,h*style.scale/2);
  ctx.beginPath();
  switch(style.shape) {
    case 'Círculo': case 'Oval': ctx.ellipse(0,0,1,style.shape==='Círculo'?1:.8,0,0,Math.PI*2); break;
    case 'Faixa': ctx.moveTo(-1,-.7);ctx.lineTo(1,-1);ctx.lineTo(.86,.7);ctx.lineTo(-.88,1);ctx.closePath();break;
    case 'Estrela': star(ctx,5,.56);break;
    case 'Selo irregular': star(ctx,16,.88);break;
    default: star(ctx,13,.72);
  }
  ctx.fill();
  ctx.restore();
}
const images=new Map();
export function clearGraphicImages(){images.clear();}
const vectorText=new WeakMap();
const pdfFonts=new Map();
async function registerPdfFonts(pdf,items) {
  const families=new Set(items.flatMap(p=>{const s=effectiveStyle(p);return [s.descFont,s.priceFont];}));
  const ready=new Map();
  for(const spec of fonts.filter(f=>f.file&&families.has(f.name))) {
    if(!pdfFonts.has(spec.file)) {
      const pending=fetch('/fonts/'+spec.file+'.ttf').then(async response=>{
        if(!response.ok)throw Error('Fonte indisponível');
        const bytes=new Uint8Array(await response.arrayBuffer());
        let binary='';
        for(let offset=0;offset<bytes.length;offset+=16000) binary+=String.fromCharCode(...bytes.subarray(offset,offset+16000));
        return btoa(binary);
      }).catch(error=>{pdfFonts.delete(spec.file);throw error;});
      pdfFonts.set(spec.file,pending);
    }
    try {
      const file=spec.file+'.ttf';
      pdf.addFileToVFS(file,await pdfFonts.get(spec.file));
      pdf.addFont(file,spec.file,'normal');
      if(pdf.getFontList()[spec.file])ready.set(spec.name,spec.file);
    } catch {
      // The canvas provides the same lettering if the PDF cannot embed a face.
    }
  }
  return ready;
}
function readImage(src) {
  if (!src || (!imagePattern.test(src) && !(src.startsWith(assetPrefix) && assetPattern.test(src.slice(assetPrefix.length))))) return Promise.resolve(null);
  if (!images.has(src)) {
    if (images.size>=16) images.delete(images.keys().next().value);
    images.set(src,new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>{images.delete(src);reject(Error('Não foi possível carregar a imagem de um produto.'));};
      image.src=src;
    }));
  }
  return images.get(src);
}
function text(ctx,value,x,y,font,size,color,align='center') {
  if (!value) return;
  face(ctx,font,size);
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  const vector=vectorText.get(ctx);
  // These faces were verified for Portuguese. Uncommon glyphs stay in the graphic layer.
  if(vector?.families.has(font) && /^[\u0020-\u007e\u00a0-\u00ff–—]+$/.test(value)) {
    const middle=ctx.measureText(value);
    ctx.textBaseline='alphabetic';
    const alphabetical=ctx.measureText(value);
    const offset=(alphabetical.fontBoundingBoxAscent||size*.8)-(middle.fontBoundingBoxAscent||size*.4);
    vector.items.push({value,x:align==='center'?x-middle.width/2:x,y:y+offset,size,color,font,width:middle.width});
  } else ctx.fillText(value,x,y);
}
const group = (value,size,font) => ({value,size,font});
export function paint(ctx,poster,config,width,height,photo=null) {
  const {product:p,template:t}=poster;
  const s=effectiveStyle(poster);
  const w=600*Math.max(1,width/height);
  const h=600*Math.max(1,height/width);
  ctx.save();
  ctx.scale(width/w,height/h);
  ctx.fillStyle=t.bg;
  ctx.fillRect(0,0,w,h);
  const short=h<680;
  const edge=w*.046;
  const priceY=h*(short?.72:.71);
  const descY=h*(short?.335:.33);
  const headerH=h*.155;
  ctx.fillStyle=t.accent;
  if (t.paper) {
    ctx.fillRect(edge,headerH,w-2*edge,2);
    ctx.fillRect(edge,h*.905,w-2*edge,2);
    ctx.strokeStyle=t.ink;
    ctx.lineWidth=2;
    ctx.strokeRect(edge*.65,edge*.65,w-1.3*edge,h-1.3*edge);
  } else {
    ctx.fillRect(0,0,w,headerH);
    ctx.fillRect(0,h*.912,w,h*.088);
  }
  const title=t.headline || 'OFERTA';
  face(ctx,s.descFont,68);
  const titleSize=Math.min(68,h*.095,(w-2*edge)*68/Math.max(1,ctx.measureText(title).width));
  text(ctx,title,w/2,headerH*.53,s.descFont,titleSize,t.paper?t.ink:'#ffffff');
  const description=(p.commercial || p.name || '').toLocaleUpperCase('pt-BR');
  const textWidth=(photo && t.photo?w*.56:w*.86);
  const textX=photo && t.photo?w*.64:w/2;
  let descSize=s.sizes.description;
  let descLines=[];
  while (descSize>=14) {
    face(ctx,s.descFont,descSize);
    descLines=linesFor(ctx,description,textWidth);
    if (!s.auto || Number.isFinite(poster.overrides?.sizes?.description) || (descLines.length<=3 && descLines.length*descSize*1.01<h*.28 && descLines.every(l=>ctx.measureText(l).width<=textWidth))) break;
    if(descSize<=14)break;
    descSize=Math.max(14,descSize-2);
  }
  const overflow=[];
  face(ctx,s.descFont,descSize);
  if (descLines.some(l=>ctx.measureText(l).width>textWidth) || descLines.length*descSize*1.01>h*.29 || descLines.length>3) overflow.push('descrição');
  if (s.splashDesc) splash(ctx,textX,descY,Math.min(textWidth*1.07,Math.max(...descLines.map(l=>ctx.measureText(l).width),120)*1.18),Math.max(110,descSize*descLines.length*1.3),s);
  const value=primaryPrice(p,config.dynamic);
  const values=value==null ? [group('SEM PREÇO',44,s.descFont)] : [
    group('R$',s.sizes.currency,s.priceFont),group(Math.floor(value/100).toLocaleString('pt-BR'),s.sizes.price,s.priceFont),
    group(',',s.sizes.separator,s.priceFont),group(String(value%100).padStart(2,'0'),s.sizes.cents,s.priceFont),
    group(config.dynamic==='Preço por quilo'?'KG':config.dynamic==='Preço por unidade'?'UN':p.unit,s.sizes.unit,s.priceFont)
  ].filter(g=>g.value);
  const gap=(index)=>index===1?11:index===4?12:2;
  const measure=()=>values.reduce((sum,item,index)=>{
    face(ctx,item.font,item.size);
    item.width=ctx.measureText(item.value).width;
    return sum+item.width+(index?gap(index):0);
  },0);
  let total=measure();
  const available=w*.88;
  if (total>available && s.auto) {
    const keys=['currency','price','separator','cents','unit'];
    const ratio=available/total;
    values.forEach((item,index)=>{if(!Number.isFinite(poster.overrides?.sizes?.[keys[index]])) item.size*=ratio*.96;});
    total=measure();
  }
  if (total>available || values.some(v=>v.size>h*.33)) overflow.push('preço');
  if (s.splashPrice) splash(ctx,w/2,priceY,Math.min(w*.98,Math.max(w*.57,total*1.25)),h*.29,s);
  if (photo && t.photo) {
    const boundW=w*.28,boundH=h*.32;
    const scale=Math.min(boundW/photo.width,boundH/photo.height);
    const pw=photo.width*scale,ph=photo.height*scale;
    ctx.drawImage(photo,w*.2-pw/2,descY-ph/2,pw,ph);
  }
  descLines.forEach((line,index)=>text(ctx,line,textX,descY+(index-(descLines.length-1)/2)*descSize*1.01,s.descFont,descSize,t.ink));
  if (p.weight) text(ctx,p.weight.toUpperCase(),textX,Math.min(h*.505,descY+(descLines.length+1)*descSize*.52),s.descFont,s.sizes.auxiliary,t.ink);
  let secondary=[], secondaryParts=[];
  if(config.dynamic==='De/Por') secondaryParts=[[p.normal!=null?'DE '+money(p.normal):'',s.sizes.normal],['POR',s.sizes.promo]];
  if(config.dynamic==='Varejo e atacado') secondaryParts=[[p.retail!=null?'VAREJO '+money(p.retail)+' · ':'',s.sizes.secondary],['ATACADO',s.sizes.wholesale]];
  if(config.dynamic==='Oferta do cartão') secondaryParts=[['OFERTA DO CARTÃO',s.sizes.secondary]];
  if(config.dynamic==='Oferta do clube') secondaryParts=[['OFERTA DO CLUBE',s.sizes.secondary]];
  secondary=secondaryParts.filter(([value])=>value).map(([value,size])=>{
    face(ctx,s.descFont,size);
    return {value,size,width:ctx.measureText(value).width};
  });
  const secondaryWidth=secondary.reduce((sum,part)=>sum+part.width,0)+Math.max(0,secondary.length-1)*12;
  if(secondaryWidth>w*.89)overflow.push('preço secundário');
  let secondaryX=(w-secondaryWidth)/2;
  for(const part of secondary) {
    text(ctx,part.value,secondaryX,h*.555,s.descFont,part.size,t.ink,'left');
    secondaryX+=part.width+12;
  }
  let commaOffset=0;
  if(values[2]?.value===',' && values[3]) {
    ctx.textBaseline='middle';
    face(ctx,values[2].font,values[2].size);
    const comma=ctx.measureText(',').actualBoundingBoxDescent;
    face(ctx,values[3].font,values[3].size);
    const cents=ctx.measureText(values[3].value).actualBoundingBoxDescent;
    commaOffset=cents-comma+Math.min(4,values[2].size*.075);
  }
  let x=(w-total)/2;
  values.forEach((item,index)=>{
    x+=index?gap(index):0;
    text(ctx,item.value,x,priceY+(index===1?0:-h*.008+(index===2?commaOffset:0)),item.font,item.size,t.ink,'left');
    x+=item.width;
  });
  if(p.minimum) text(ctx,'A PARTIR DE '+p.minimum+' UNIDADES',w/2,h*.858,s.descFont,s.sizes.minimum,t.ink);
  if(p.limit) text(ctx,'LIMITE DE '+p.limit+' POR CLIENTE',w/2,h*(p.minimum?.893:.865),s.descFont,s.sizes.limit,t.ink);
  const start=config.start || p.start,end=config.end || p.end;
  const validity=start&&end?'DE '+dateLabel(start)+' A '+dateLabel(end):end?'VÁLIDO ATÉ '+dateLabel(end):start?'A PARTIR DE '+dateLabel(start):'';
  const message=[validity,config.storeName].filter(Boolean).join('  ·  ');
  const footerFont=Math.min(h*.047,s.sizes.validity);
  face(ctx,s.descFont,footerFont);
  if(ctx.measureText(message).width>w*.91) overflow.push('validade');
  text(ctx,message,w/2,h*.955,s.descFont,footerFont,t.paper?t.ink:'#ffffff');
  ctx.restore();
  return overflow;
}
export async function draw(canvas,poster,config,width,height,vector=null) {
  const style=effectiveStyle(poster);
  const [, ,image]=await Promise.all([loadFont(style.descFont),loadFont(style.priceFont),poster.template.photo ? readImage(poster.product.image) : null]);
  canvas.width=Math.max(1,Math.round(width));
  canvas.height=Math.max(1,Math.round(height));
  const ctx=canvas.getContext('2d');
  if(vector) vectorText.set(ctx,vector);
  try {return paint(ctx,poster,config,canvas.width,canvas.height,image);}
  finally {if(vector) vectorText.delete(ctx);}

}
export async function drawSheet(canvas,posters,config,width,height) {
  if(config.kind!=='leaflet') return draw(canvas,posters[0],config,width,height);
  canvas.width=Math.round(width); canvas.height=Math.round(height);
  const ctx=canvas.getContext('2d');
  const padding=width*.036;
  const header=height*.145;
  ctx.fillStyle='#f1efff';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#4934db';ctx.fillRect(0,0,width,header);
  await loadFont('Bangers');
  face(ctx,'Bangers',80);
  const caption=(config.name || 'Festival de ofertas').toUpperCase();
  const headSize=Math.min(header*.43,width*.088,width*.9*80/ctx.measureText(caption).width);
  text(ctx,caption,width/2,header*.46,'Bangers',headSize,'#fff');
  text(ctx,[config.storeName,config.end?'ATÉ '+dateLabel(config.end):''].filter(Boolean).join(' · '),width/2,header*.8,'Arial',header*.14,'#fff');
  const count=config.perPage;
  const columns=Math.ceil(Math.sqrt(count*(width/height)*1.35));
  const rows=Math.ceil(count/columns);
  const tileW=(width-padding*(columns+1))/columns;
  const tileH=(height-header-padding*(rows+1))/rows;
  const card=document.createElement('canvas');
  const overflow=[];
  for (const [index,poster] of posters.entries()) {
    overflow.push(...await draw(card,poster,config,tileW,tileH));
    ctx.drawImage(card,padding+(index%columns)*(tileW+padding),header+padding+Math.floor(index/columns)*(tileH+padding),tileW,tileH);
  }
  return [...new Set(overflow)];
}
export const splitPages = (items,config) => {
  const n=config.kind==='leaflet'?config.perPage:1;
  return Array.from({length:Math.ceil(items.length/n)},(_,i)=>items.slice(i*n,(i+1)*n));
};
export const nextFrame = () => new Promise(resolve=>setTimeout(resolve,0));
function pngDensity(bytes,dpi) {
  const source=new Uint8Array(bytes);
  const output=new Uint8Array(source.length+21);
  const view=new DataView(source.buffer);
  const density=new Uint8Array(21);
  const fields=new DataView(density.buffer);
  fields.setUint32(0,9);
  density.set([112,72,89,115],4); // pHYs
  const ppm=Math.round(dpi/0.0254);
  fields.setUint32(8,ppm);fields.setUint32(12,ppm);density[16]=1;
  let crc=0xffffffff;
  for(const byte of density.subarray(4,17)) {
    crc^=byte;
    for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  fields.setUint32(17,(crc^0xffffffff)>>>0);
  let position=8, destination=8;
  output.set(source.subarray(0,8));
  while(position+12<=source.length) {
    const end=position+12+view.getUint32(position);
    const label=String.fromCharCode(...source.subarray(position+4,position+8));
    if(label!=='pHYs') {output.set(source.subarray(position,end),destination);destination+=end-position;}
    if(label==='IHDR'){output.set(density,destination);destination+=density.length;}
    position=end;
  }
  return output.subarray(0,destination);
}
function jpegDensity(bytes,dpi) {
  const source=new Uint8Array(bytes);
  if(source[2]===255&&source[3]===224&&String.fromCharCode(...source.subarray(6,11))==='JFIF\0') {
    const view=new DataView(bytes);
    source[13]=1;view.setUint16(14,dpi);view.setUint16(16,dpi);
  }
  return source;
}
function drawPdfText(pdf,vector,canvas,mmW,mmH) {
  const sx=mmW/(600*Math.max(1,canvas.width/canvas.height));
  const sy=mmH/(600*Math.max(1,canvas.height/canvas.width));
  for(const run of vector.items) {
    pdf.setFont(vector.families.get(run.font),'normal');
    pdf.setFontSize(run.size*sy*72/25.4);
    pdf.setTextColor(run.color);
    const measured=pdf.getTextWidth(run.value);
    const horizontalScale=measured>0?run.width*sx/measured:1;
    pdf.text(run.value,run.x*sx,run.y*sy,{horizontalScale});
  }
}
export async function renderExports(items,config,format,dpi,onProgress=()=>{},signal={}) {
  const pages=splitPages(items,config);
  const canvas=document.createElement('canvas');
  const [width,height]=imagePixels(config.width,config.height,config.unit,dpi);
  if(width*height>30_000_000 || Math.max(width,height)>14000) throw Error('A resolução excede o limite. Reduza o DPI ou as dimensões.');
  let pdf,zip, Pdf, families;
  const separatePdf=format==='PDFs em ZIP';
  const forPdf=format==='PDF' || separatePdf;
  const [mmW,mmH]=mmInset(config.width,config.height,config.unit);
  const pdfConfig={unit:'mm',format:[mmW,mmH],orientation:mmW>mmH?'landscape':'portrait',compress:true,putOnlyUsedFonts:true};
  const mime=format==='JPEG'?'image/jpeg':'image/png';
  if(forPdf) {
    ({jsPDF:Pdf}=await import('jspdf'));
    if(!separatePdf) {
      pdf=new Pdf(pdfConfig);
      families=config.kind==='leaflet'?null:await registerPdfFonts(pdf,items);
    }
  }
  if(format.includes('ZIP') || (pages.length>1 && !forPdf)) {
    const {default:JSZip}=await import('jszip');
    zip=new JSZip();
  }
  let blob;
  let warnings=0;
  for(const [index,page] of pages.entries()) {
    if(signal.cancelled) throw Error('Exportação cancelada.');
    const name=(config.kind==='leaflet'?'pagina-':'cartaz-')+String(index+1).padStart(3,'0');
    let documentPdf=pdf;
    let pageFamilies=families;
    if(separatePdf) {
      documentPdf=new Pdf(pdfConfig);
      pageFamilies=config.kind==='leaflet'?null:await registerPdfFonts(documentPdf,page);
    }
    const vector=pageFamilies?.size?{families:pageFamilies,items:[]}:null;
    const overflow=vector?await draw(canvas,page[0],config,width,height,vector):await drawSheet(canvas,page,config,width,height);
    if(overflow.length)warnings++;
    if (documentPdf) {
      if(index&&!separatePdf) documentPdf.addPage([mmW,mmH],pdfConfig.orientation);
      const image=canvas.toDataURL('image/jpeg',.96);
      documentPdf.addImage(image,'JPEG',0,0,mmW,mmH,undefined,'FAST');
      if(vector)drawPdfText(documentPdf,vector,canvas,mmW,mmH);
      if(separatePdf)zip.file(name+'.pdf',documentPdf.output('arraybuffer'));
    } else {
      const file=await new Promise(resolve=>canvas.toBlob(resolve,mime,.96));
      if(!file) throw Error('Não foi possível exportar a imagem.');
      const bytes=await file.arrayBuffer();
      const density=config.unit==='px'?96:dpi;
      const tagged=mime==='image/jpeg'?jpegDensity(bytes,density):pngDensity(bytes,density);
      if(zip) zip.file(name+'.'+(mime==='image/jpeg'?'jpg':'png'),tagged);
      else blob=new Blob([tagged],{type:mime});
    }
    onProgress(index+1,pages.length);
    await nextFrame();
  }
  if(pdf) return {blob:pdf.output('blob'),extension:'pdf',warnings};
  if(zip) return {blob:await zip.generateAsync({type:'blob'}),extension:'zip',warnings};
  return {blob,extension:mime==='image/jpeg'?'jpg':'png',warnings};
}
export function download(blob,name) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

