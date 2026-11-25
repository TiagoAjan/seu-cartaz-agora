export const themedPosters = [
  ['ano-novo','Ano Novo','ANO NOVO','#fffdf7','#1c1338','#251933','#ffdc83'],
  ['semana','Ofertas da Semana','OFERTAS DA SEMANA','#fffef7','#2c228e','#211a45','#ffdd54'],
  ['junino','São João','ARRAIÁ DE OFERTAS','#fffaf0','#8d2924','#5d251a','#ffd779'],
  ['ferias','Férias','OFERTAS DE FÉRIAS','#f6ffff','#005a77','#103449','#ffe082'],
  ['aulas','Volta às Aulas','VOLTA ÀS AULAS','#f8fbff','#123973','#173660','#fdde67'],
  ['natal','Natal','OFERTAS DE NATAL','#fffdf7','#772029','#472123','#ffe1a1'],
  ['pascoa','Páscoa','OFERTAS DE PÁSCOA','#fff9fa','#632267','#47194e','#ffe0ea']
].map(([id,name,headline,bg,accent,ink,highlight])=>({
  id:'tema-'+id,theme:id,name,headline,bg,accent,ink,highlight,version:1,photo:false,paper:false,descFont:'Montserrat',priceFont:'Anton'
}));

export const a4Artwork = landscape=>landscape
  ? {width:297,height:210,pixels:[3508,2480],landscape:true}
  : {width:210,height:297,pixels:[2480,3508],landscape:false};
export const artworkStart = template => Number.isFinite(template.contentStart) ? Math.min(.5,Math.max(0,template.contentStart)) : .27;
export function fitArtwork(imageWidth,imageHeight,width,height) {
  const scale=Math.min(width/imageWidth,height/imageHeight);
  const w=imageWidth*scale,h=imageHeight*scale;
  return {x:(width-w)/2,y:(height-h)/2,w,h};
}
export function artworkInfo(width,height,landscape) {
  const a4=a4Artwork(landscape);
  return {
    ratioMismatch:Math.abs((width/height)/(a4.width/a4.height)-1)>.015,
    resolution:Math.round(Math.min(width/(a4.width/25.4),height/(a4.height/25.4)))
  };
}
export function templateFormat(config,template) {
  if(!template?.artwork)return config;
  const a4=a4Artwork(!!template.artworkLandscape);
  return {...config,format:'A4',unit:'mm',width:210,height:297,landscape:a4.landscape};
}

function circle(ctx,x,y,r,color) {
  ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function poly(ctx,points,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fill();
}
function line(ctx,x,y,X,Y,color,width) {
  ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();
}
function sparkle(ctx,x,y,r,color) {
  poly(ctx,[[x,y-r],[x+r*.19,y-r*.19],[x+r,y],[x+r*.19,y+r*.19],[x,y+r],[x-r*.19,y+r*.19],[x-r,y],[x-r*.19,y-r*.19]],color);
}
function firework(ctx,x,y,r,color,phase) {
  for(let i=0;i<15;i++){
    const a=phase+i*Math.PI*2/15;
    line(ctx,x+Math.cos(a)*r*.3,y+Math.sin(a)*r*.3,x+Math.cos(a)*r,y+Math.sin(a)*r,color,2.4);
    circle(ctx,x+Math.cos(a)*r*1.12,y+Math.sin(a)*r*1.12,2.7,color);
  }
  sparkle(ctx,x,y,20,color);
}
function tag(ctx,x,y,a,colors) {
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  poly(ctx,[[-56,-40],[18,-40],[54,0],[18,42],[-56,42]],colors[0]);
  circle(ctx,29,1,5,colors[1]);
  line(ctx,-30,22,2,-21,colors[1],5);
  circle(ctx,-28,-13,6,colors[1]);circle(ctx,1,14,6,colors[1]);
  ctx.restore();
}
function hangingFlags(ctx,x,y,direction) {
  ctx.save();ctx.translate(x,y);ctx.scale(direction,1);
  ctx.strokeStyle='#ffefae';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(114,76,239,14);ctx.stroke();
  ['#ffd04d','#ff7951','#73e2a2','#ffbd43','#fed8dc'].forEach((c,i)=>{
    const X=14+i*43,Y=10+Math.sin((i+1)/6*Math.PI)*26;
    poly(ctx,[[X,Y],[X+31,Y+2],[X+28,Y+42],[X+16,Y+32],[X+3,Y+42]],c);
  });
  ctx.restore();
}
function book(ctx,x,y,a,colors) {
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.fillStyle=colors[0];ctx.fillRect(-39,-53,78,106);
  ctx.fillStyle=colors[1];ctx.fillRect(-25,-43,58,89);
  for(let i=0;i<4;i++)line(ctx,-17,-26+i*15,24,-26+i*15,'#25447866',2);
  for(let i=0;i<5;i++)circle(ctx,-30,-35+i*17,3.3,'#ffffff');
  ctx.restore();
}
function ornament(ctx,x,y,r,body,accent) {
  line(ctx,x,0,x,y-r,accent,2);
  circle(ctx,x,y,r,body);circle(ctx,x-r*.24,y-r*.24,r*.19,'#ffffffab');
  ctx.fillStyle=accent;ctx.fillRect(x-r*.28,y-r-4,r*.56,8);
}
function egg(ctx,x,y,a,body,accent) {
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.beginPath();ctx.moveTo(0,-51);
  ctx.bezierCurveTo(23,-51,40,-11,38,8);
  ctx.bezierCurveTo(37,59,-37,59,-38,8);ctx.bezierCurveTo(-40,-11,-23,-51,0,-51);
  ctx.fillStyle=body;ctx.fill();ctx.clip();
  ctx.fillStyle=accent;
  ctx.fillRect(-47,10,94,12);
  for(let i=-1;i<2;i++)circle(ctx,i*19,-12,5,accent);
  ctx.restore();
}
const companionColors={ 'ano-novo':'#462665',semana:'#5744e8',junino:'#c45332',ferias:'#00989b',aulas:'#1d71c0',natal:'#a93245',pascoa:'#aa4d8d' };
export function paintThemeHeader(ctx,template,w,h) {
  const color=template.highlight || '#ffebaa';
  ctx.save();ctx.scale(w/1000,h/300);
  ctx.beginPath();ctx.rect(0,0,1000,300);ctx.clip();
  const bg=ctx.createLinearGradient(0,0,1000,300);
  bg.addColorStop(0,template.accent);bg.addColorStop(.67,companionColors[template.theme]);bg.addColorStop(1,template.accent);
  ctx.fillStyle=bg;ctx.fillRect(0,0,1000,300);
  for(let i=0;i<35;i++){
    const x=(i*139+27)%1000,y=(i*67+11)%290;
    if(x<226||x>774)circle(ctx,x,y,(i%4)+1,'#ffffff65');
  }
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.strokeRect(16,14,968,272);
  line(ctx,269,224,731,224,color,2);
  for(const x of [252,748])sparkle(ctx,x,224,7,color);
  switch(template.theme){
    case 'ano-novo':
      firework(ctx,95,105,88,color,.2);firework(ctx,899,180,82,'#e3adfb',.55);
      sparkle(ctx,155,227,30,'#ffedaf');sparkle(ctx,874,55,24,'#ffe288');
      break;
    case 'semana':
      tag(ctx,94,150,-.37,['#ffd346','#3b268b']);tag(ctx,902,145,.27,['#ff8c72','#522cb7']);
      sparkle(ctx,158,62,22,color);sparkle(ctx,861,220,25,color);
      break;
    case 'junino':
      hangingFlags(ctx,7,20,1);hangingFlags(ctx,993,20,-1);
      for(const x of [106,894]) {
        poly(ctx,[[x,111],[x+32,149],[x,184],[x-32,149]],'#ffc543');
        poly(ctx,[[x,111],[x,184],[x-32,149]],'#ff8651');
        line(ctx,x,184,x,219,'#ffe39b',2);
      }
      break;
    case 'ferias':
      circle(ctx,95,124,53,'#ffd759');circle(ctx,95,124,41,'#ffe9a5');
      for(let i=0;i<4;i++){
        ctx.strokeStyle=i%2?'#8bf0e5':'#cdfcfa';ctx.lineWidth=4;
        for(const x of [22,831]){
          ctx.beginPath();ctx.moveTo(x,198+i*14);ctx.bezierCurveTo(x+35,174+i*14,x+90,223+i*14,x+146,197+i*14);ctx.stroke();
        }
      }
      poly(ctx,[[829,158],[897,72],[960,154]],'#ffe48b');
      poly(ctx,[[868,158],[897,72],[923,156]],'#fb866b');
      line(ctx,897,154,897,207,'#fff4cd',4);
      break;
    case 'aulas':
      book(ctx,97,137,-.22,['#fbd759','#f8fbff']);book(ctx,904,144,.27,['#6ee3c3','#edfefb']);
      line(ctx,142,205,193,119,'#ffbd60',13);line(ctx,858,211,800,132,'#ffad92',13);
      sparkle(ctx,168,72,20,color);sparkle(ctx,839,71,16,color);
      break;
    case 'natal':
      ornament(ctx,84,116,34,'#f0b85c','#fff0bb');ornament(ctx,147,182,23,'#72caa5','#ffdc83');
      ornament(ctx,909,145,39,'#ff9c9d','#fbdc95');ornament(ctx,846,98,22,'#f0b85c','#fff0bb');
      sparkle(ctx,91,222,20,color);sparkle(ctx,932,224,19,color);
      break;
    case 'pascoa':
      egg(ctx,89,158,-.34,'#ffabbf','#a8518e');egg(ctx,145,199,.24,'#ffd779','#f7819f');
      egg(ctx,910,147,.33,'#c9b4fb','#9b5db2');egg(ctx,854,198,-.24,'#8ce2bf','#eec3fa');
      sparkle(ctx,155,67,21,color);sparkle(ctx,848,63,20,color);
      break;
  }
  ctx.restore();
}

