import {drawSheet, nextFrame, splitPages} from './graphic.mjs';
import {formats, imagePixels, mmInset} from './model.mjs';

export const defaultPrint = () => ({sheet:'Formato do lote',orientation:'Retrato',perSheet:'1',margin:'0',gap:'4',copies:'1',marks:false});
export function printGeometry(config,options) {
  const source=mmInset(config.width,config.height,config.unit);
  const raw=formats[options.sheet];
  let [sheetW,sheetH]=raw ? raw.slice(0,2) : source;
  if(raw && options.orientation==='Paisagem') [sheetW,sheetH]=[sheetH,sheetW];
  const perSheet=Number(options.perSheet),margin=Number(options.margin),gap=Number(options.gap),copies=Number(options.copies);
  if(!Number.isInteger(perSheet)||perSheet<1||perSheet>24||!Number.isInteger(copies)||copies<1||copies>20||![margin,gap].every(v=>Number.isFinite(v)&&v>=0&&v<=100)) throw Error('Use de 1 a 24 artes por folha, de 1 a 20 cópias e margens e espaçamentos de até 100 mm.');
  const sourceRatio=source[0]/source[1];
  let best=null;
  for(let cols=1;cols<=perSheet;cols++) {
    const rows=Math.ceil(perSheet/cols);
    const slotW=(sheetW-margin*2-(cols-1)*gap)/cols;
    const slotH=(sheetH-margin*2-(rows-1)*gap)/rows;
    const w=Math.min(slotW,slotH*sourceRatio);
    const h=w/sourceRatio;
    if(w>0&&h>0&&(!best||w>best.w))best={cols,rows,slotW,slotH,w,h};
  }
  if(!best)throw Error('Margens e espaçamento deixam pouco espaço para as artes.');
  return {...best,sheetW,sheetH,perSheet,margin,gap,copies};
}
function cutMarks(pdf,x,y,w,h) {
  const offset=.7,len=2.3;
  pdf.setLineWidth(.14);
  pdf.setDrawColor(31,31,31);
  for(const [edgeX,dx] of [[x,-1],[x+w,1]]) {
    for(const [edgeY,dy] of [[y,-1],[y+h,1]]) {
      pdf.line(edgeX+dx*offset,edgeY,edgeX+dx*(offset+len),edgeY);
      pdf.line(edgeX,edgeY+dy*offset,edgeX,edgeY+dy*(offset+len));
    }
  }
}
export async function composePrint(items,config,options,dpi,onProgress,signal) {
  const geo=printGeometry(config,options);
  const pages=splitPages(items,config);
  const count=pages.length*geo.copies;
  if(count>2000)throw Error('O trabalho ultrapassa 2.000 artes. Divida a seleção ou reduza o número de cópias.');
  const [w,h]=imagePixels(geo.w,geo.h,'mm',dpi);
  if(w*h>30_000_000||Math.max(w,h)>14000)throw Error('Reduza o tamanho ou a resolução de impressão.');
  const {jsPDF}=await import('jspdf');
  const format=[geo.sheetW,geo.sheetH],orientation=geo.sheetW>geo.sheetH?'landscape':'portrait';
  const pdf=new jsPDF({unit:'mm',format,orientation,compress:true});
  const canvas=document.createElement('canvas');
  let warnings=0;
  for(let index=0;index<count;index++) {
    if(signal.cancelled)throw Error('Impressão cancelada.');
    const slot=index%geo.perSheet;
    if(!slot&&index)pdf.addPage(format,orientation);
    const x=geo.margin+(slot%geo.cols)*(geo.slotW+geo.gap)+(geo.slotW-geo.w)/2;
    const y=geo.margin+Math.floor(slot/geo.cols)*(geo.slotH+geo.gap)+(geo.slotH-geo.h)/2;
    const overflow=await drawSheet(canvas,pages[index%pages.length],config,w,h);
    if(overflow.length)warnings++;
    pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',x,y,geo.w,geo.h,undefined,'FAST');
    if(options.marks)cutMarks(pdf,x,y,geo.w,geo.h);
    onProgress(index+1,count);
    await nextFrame();
  }
  return {blob:pdf.output('blob'),extension:'pdf',warnings};
}

