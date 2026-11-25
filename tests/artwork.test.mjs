import test from 'node:test';
import assert from 'node:assert/strict';
import {builtins,dimensions,empty,fonts,resizePrice,sizes} from '../lib/model.mjs';
import {a4Artwork,artworkInfo,artworkStart,fitArtwork,templateFormat,themedPosters} from '../lib/template-art.mjs';
import {externalizeImages} from '../lib/cloud-assets.mjs';

test('escala o preço completo na mesma proporção e preserva a unidade',()=>{
  const original={...sizes,cents:50,currency:35,separator:42,unit:23};
  const resized=resizePrice(original,original.price*1.5);
  assert.deepEqual(resized,{price:198,currency:52.5,separator:63,cents:75});
  assert.equal(original.unit,23);
  assert.deepEqual(resizePrice({...original,...resized},original.price),
    {price:original.price,currency:original.currency,separator:original.separator,cents:original.cents});
});
test('a arte importada fixa o A4 com a orientação selecionada',()=>{
  const custom={format:'A2',landscape:false,width:420,height:594,unit:'mm'};
  assert.equal(templateFormat(custom,{theme:'natal'}),custom);
  const landscape=templateFormat(custom,{artwork:'/img',artworkLandscape:true});
  assert.deepEqual(dimensions(landscape),{width:297,height:210,unit:'mm'});
  assert.deepEqual(a4Artwork(false).pixels,[2480,3508]);
  assert.deepEqual(a4Artwork(true).pixels,[3508,2480]);
  assert.equal(artworkStart({contentStart:.26}),.26);
  assert.equal(artworkInfo(2480,3508,false).resolution,300);
  assert(artworkInfo(1200,700,false).ratioMismatch);
});
test('centraliza imagens de proporção diferente sem esticar nem cortar',()=>{
  assert.deepEqual(fitArtwork(800,400,200,300),{x:0,y:100,w:200,h:100});
  assert.deepEqual(fitArtwork(200,400,300,300),{x:75,y:0,w:150,h:300});
});
test('sincroniza uma só arte de fundo para o template e suas cópias em lotes',async()=>{
  const image='data:image/png;base64,AAA=';
  const data={...empty(),templates:[{artwork:image}],batches:[{items:[{template:{artwork:image}}]}]};
  let calls=0;
  const result=await externalizeImages(data,async()=>{calls++;return '/api/workspace?asset=fundo';});
  assert.equal(calls,1);
  assert.equal(result.templates[0].artwork,result.batches[0].items[0].template.artwork);
});
test('preserva os IDs anteriores e inclui sete modelos e duas fontes clássicas',()=>{
  assert.equal(builtins[0].id,'modelo-1');
  assert.equal(builtins[7].id,'modelo-8');
  assert.equal(themedPosters.length,7);
  assert.equal(new Set(builtins.map(t=>t.id)).size,15);
  assert(fonts.some(font=>font.name==='Poppins'&&font.category==='Clássica'));
  assert(fonts.some(font=>font.name==='Montserrat'&&font.category==='Clássica'));
});

