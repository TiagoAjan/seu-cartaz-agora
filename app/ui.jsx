'use client';
import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { ArrowDownToLine, ChevronDown, CircleAlert, FilePlus2, ImageOff, X } from 'lucide-react';
import { draw, drawSheet } from '@/lib/graphic.mjs';
import {a4Artwork} from '@/lib/template-art.mjs';
import { sample, posterFromProduct } from '@/lib/model.mjs';

export function Button({icon:Icon,children,variant='',className='',...props}) {
  return <button type="button" className={['btn',variant,className].filter(Boolean).join(' ')} {...props}>{Icon&&<Icon size={17}/>} {children}</button>;
}
export function IconButton({icon:Icon,label,className='',...props}) {
  return <button type="button" className={'iconBtn '+className} aria-label={label} title={label} {...props}><Icon size={17}/></button>;
}
export function Select({options,value,onChange,placeholder,...props}) {
  return <span className="select"><select value={value} onChange={e=>onChange(e.target.value)} {...props}>
    {placeholder!==undefined && <option value="">{placeholder}</option>}
    {options.map(option=>typeof option==='string'?<option key={option}>{option}</option>:<option key={option.value} value={option.value}>{option.label}</option>)}
  </select><ChevronDown size={15}/></span>;
}
export function Field({label,children}) {
  const id=useId();
  return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children,{id})}</div>;
}
export function Check({children,...props}) {
  return <label className="check"><input type="checkbox" {...props}/><span>{children}</span></label>;
}
export function Modal({title,children,onClose,wide=false}) {
  const ref=useRef(null);
  useEffect(()=>{
    const dialog=ref.current;
    dialog.showModal();
    return ()=>dialog.close();
  },[]);
  return <dialog ref={ref} className={wide?'dialog wide':'dialog'} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
    <section><header><h2>{title}</h2><IconButton icon={X} label="Fechar" onClick={onClose}/></header>{children}</section>
  </dialog>;
}
export function PageHeading({title,subtitle,children}) {
  return <header className="pageHeading"><div><h1>{title}</h1><p>{subtitle}</p></div>{children&&<div className="actions">{children}</div>}</header>;
}
export function Empty({icon:Icon=FilePlus2,title,detail,children}) {
  return <div className="empty"><div className="emptyIcon"><Icon size={25}/></div><h3>{title}</h3>{detail&&<p>{detail}</p>}{children}</div>;
}
export function CanvasPreview({poster,config,posters,example=false,onPriceRegions,children}) {
  const ref=useRef(null);
  const [warning,setWarning]=useState('');
  const [failed,setFailed]=useState('');
  const [attempt,retry]=useState(0);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const node=ref.current;
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'220px'});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!visible)return;
    let active=true;
    setFailed('');
    const canvas=document.createElement('canvas');
    const ratio=config.width/config.height;
    const width=Math.min(820,750*ratio);
    const height=width/ratio;
    const regions=onPriceRegions?{}:null;
    (posters?drawSheet(canvas,posters,config,width,height,{preview:true}):draw(canvas,poster,config,width,height,null,{preview:true,regions})).then(result=>{
      if(!active)return;
      const dest=ref.current;
      dest.width=canvas.width;
      dest.height=canvas.height;
      dest.getContext('2d').drawImage(canvas,0,0);
      setWarning(result.join(' '));
      onPriceRegions?.(regions);
    }).catch(error=>{if(active){setWarning('');setFailed(error.message||'Erro ao carregar a arte.');onPriceRegions?.({});}});
    return ()=>{active=false;};
  },[poster,config,posters,visible,attempt,onPriceRegions]);
  const assetWarning=warning.includes('Arte de fundo · ');
  return <div className={'canvasPreview'+(example?' example':'')} style={{aspectRatio:config.width+'/'+config.height}}>
    <canvas ref={ref} role="img" aria-label={poster?.product?.name || 'Página de encarte'}/>
    {children}
    {failed||assetWarning?<div className="previewProblem" role="status">
      <CircleAlert size={17}/><div><strong>{failed?'Erro ao carregar a prévia':'Arte de fundo indisponível'}</strong>
      <p>{failed||warning}</p>{!example&&<Button onClick={()=>retry(attempt+1)}>Tentar novamente</Button>}</div>
    </div>:warning&&<span className="overflowWarning" title={warning} aria-label={warning}><CircleAlert size={16}/></span>}
  </div>;
}
const exampleConfig = {width:430,height:488,dynamic:'Preço único',end:'',start:'',storeName:'',kind:'poster'};
export function TemplateCard({template,onUse,onEdit,index=0}) {
  const products=[sample,{name:'Café Tradicional',commercial:'CAFÉ TRADICIONAL',promo:1490,weight:'500 g',unit:'UN'},{name:'Azeite Extra Virgem',commercial:'AZEITE EXTRA VIRGEM',promo:2999,weight:'500 ml',unit:'UN'},{name:'Maçã Fuji',commercial:'MAÇÃ FUJI',promo:699,unit:'KG'}];
  const [poster]=useState(()=>posterFromProduct(products[index%products.length],template,{shape:'Explosão clássica',color:'#ffad20',splashPrice:index===0}));
  const current={...poster,template,style:{...poster.style,descFont:template.descFont,priceFont:template.priceFont,
    splashPrice:index===0&&!template.artwork&&!template.theme}};
  const config=template.artwork||template.theme?{...exampleConfig,...a4Artwork(template.artworkLandscape)}:exampleConfig;
  return <article className="templateCard">
    <button type="button" className={'templateArt art'+index%4} onClick={()=>onUse(template)} aria-label={'Usar '+template.name}><CanvasPreview poster={current} config={config} example/></button>
    <div className="templateMeta"><div><strong>{template.name}</strong><small>{template.artwork?'Arte importada · A4 '+(template.artworkLandscape?'paisagem':'retrato'):template.theme?'Modelo temático':template.paper?'Econômico · Impressão':'Cartaz promocional'}</small></div>{onEdit?<Button onClick={()=>onEdit(template)}>Editar</Button>:<IconButton icon={FilePlus2} label={'Usar '+template.name} onClick={()=>onUse(template)}/>}</div>
  </article>;
}
export function ImageInput({onLoad,label='Selecionar imagem',multiple=false}) {
  return <label className="btn upload"><ArrowDownToLine size={17}/>{label}<input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" multiple={multiple} onChange={e=>{const files=[...e.target.files];e.target.value='';if(files.length)onLoad(files);}}/></label>;
}
export function imageData(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>2*1024*1024) return Promise.reject(Error('Use PNG, JPEG ou WebP de até 2 MB.'));
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(Error('Erro ao ler imagem.'));
    reader.onload=()=>{
      const checked=new Image();
      checked.onerror=()=>reject(Error('O arquivo não contém uma imagem válida.'));
      checked.onload=()=>resolve(reader.result);
      checked.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
export function ProductThumb({src,name}) {
  return <div className="productThumb">{src?<img src={src} alt={name}/>:<ImageOff size={17}/>}</div>;
}

