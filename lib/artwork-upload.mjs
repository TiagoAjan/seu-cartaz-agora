const types={'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg'};
const maxStored=2*1024*1024;
function readData(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error('Não foi possível ler a arte.'));
    reader.readAsDataURL(file);
  });
}
export async function readArtwork(file) {
  const extension=file.name.split('.').pop().toLowerCase();
  const mime=types[extension];
  if(!mime || (file.type && file.type!==mime) || file.size>20*1024*1024 || !file.size) throw Error('Escolha um arquivo PNG, JPG ou JPEG de até 20 MB.');
  const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const isPng=signature.join(',')==='137,80,78,71,13,10,26,10';
  const isJpeg=signature[0]===255&&signature[1]===216&&signature[2]===255;
  if(mime==='image/png'?!isPng:!isJpeg)throw Error('O conteúdo da imagem não corresponde ao formato selecionado.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.src=url;
    try {await image.decode();} catch {throw Error('A arte está corrompida ou não pode ser aberta.');}
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height||width*height>25_000_000||Math.max(width,height)>10000) throw Error('A imagem excede 25 megapixels. Reduza as dimensões e envie novamente.');
    if(file.size<=maxStored) return {width,height,src:await readData(new Blob([file],{type:mime})),optimized:false};
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    canvas.getContext('2d').drawImage(image,0,0);
    for(const quality of [.95,.87,.78]){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(blob?.type==='image/webp'&&blob.size<=maxStored)return {width,height,src:await readData(blob),optimized:true};
    }
    throw Error('A arte ficou acima de 2 MB após a otimização. Salve uma versão menor e tente de novo.');
  } finally {URL.revokeObjectURL(url);}
}

