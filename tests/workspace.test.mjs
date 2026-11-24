import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { open, createAdmin, login, verify, logout, readWorkspace, saveWorkspace, resetPassword } from '../lib/db.mjs';
import { builtins, dimensions, effectiveStyle, empty, imagePixels, mmInset, parseMoney, parseProduct, patchPoster, posterFromProduct, primaryPrice, visibleOffer, writeProduct } from '../lib/model.mjs';
import { autoMap, applyImport, previewRows, revertImport } from '../lib/imports.mjs';
import { splitPages } from '../lib/graphic.mjs';
import { defaultPrint, printGeometry } from '../lib/printing.mjs';

const headers=['Código interno','EAN/GTIN','Descrição','Preço normal','Preço promocional','Validade'];
const map=autoMap(headers);
const rows=Array.from({length:100},(_,i)=>['P'+(i+1),'0000000000'+String(i).padStart(3,'0'),'Pão de Açúcar '+i,'5,99', i%2?'4,79':'1.234,56','30/12/2026']);
const cfg={kind:'poster',format:'A4',dynamic:'Preço único',shape:'Explosão clássica',splashPrice:true,color:'#ffa500'};
function imported() {
  const data=empty();
  return applyImport(data,previewRows(rows,map,data),{name:'ofertas.xlsx',store:'',update:false,updatePrices:false});
}
test('converte moeda em centavos exatos e valida dados brasileiros',()=>{
  assert.equal(parseMoney('R$ 12.345,67'),1234567);
  assert.equal(parseMoney('0,00'),0);
  assert.equal(parseMoney('5.70'),570);
  assert.equal(parseMoney(''),null);
  assert.throws(()=>parseMoney('12,333'));
  assert.throws(()=>parseMoney('-12,00'));
  assert.throws(()=>parseProduct({name:'Café',start:'31/02/2026'}));
  assert.throws(()=>parseProduct({name:'Café',start:'2026-12-20',end:'2026-12-19'}));
  assert.equal(primaryPrice({promo:0,normal:990},'Preço único'),0);
});
test('importa cem produtos, preserva zeros, valida duplicatas e exige opção explícita para mudar preços existentes',()=>{
  const data=imported();
  assert.equal(data.products.length,100);
  assert.equal(data.offers.length,100);
  assert.equal(data.products.find(p=>p.code==='P1').ean,'0000000000000');
  const row=[...rows[0]];
  row[2]='Nome atualizado';
  row[4]='2,50';
  const preview=previewRows([row,row],map,data);
  assert.match(preview[1].error,/duplicado/);
  const unchanged=applyImport(data,preview,{name:'sem-precos.csv',store:'loja-1',update:true,updatePrices:false});
  assert.deepEqual(unchanged.offers,data.offers);
  assert.equal(unchanged.products.find(p=>p.code==='P1').name,'Nome atualizado');
  const updated=applyImport(data,preview,{name:'com-precos.csv',store:'',update:true,updatePrices:true});
  assert.equal(updated.offers.length,101);
  assert.equal(updated.offers[0].promo,250);
  assert.equal(updated.offers.find(o=>o.productId===updated.offers[0].productId&&o.id!==updated.offers[0].id).promo,123456);
});
test('reverte importação sem perder edições posteriores',()=>{
  const data=imported();
  const updated={...data,products:data.products.map((p,i)=>i?{...p}:{...p,name:'Edição posterior'})};
  assert.throws(()=>revertImport(updated,data.imports[0]),/alterações posteriores/);
  assert.equal(revertImport(data,data.imports[0]).products.length,0);
  assert.equal(revertImport(data,data.imports[0]).offers.length,0);
});
test('usa a oferta vigente da loja antes de recorrer à oferta geral',()=>{
  const data=empty();
  const first=writeProduct(data,parseProduct({name:'Café',promo:'9,99'}),{store:'loja-1'});
  const productId=first.products[0].id;
  const second=writeProduct(first,parseProduct({name:'Café',promo:'15,20'}),{id:productId});
  assert.equal(visibleOffer(second,productId,'loja-1').promo,999);
  assert.equal(visibleOffer(second,productId,'loja-2').promo,1520);
});
test('aplica estilo a cem cartazes e conserva os ajustes de um cartaz separado',()=>{
  const data=imported();
  const posters=data.products.map(p=>posterFromProduct({...p,...visibleOffer(data,p.id)},builtins[0],cfg));
  const previous=structuredClone(posters);
  const edited=patchPoster(posters,new Set([posters[0].id]),{sizes:{price:112},splashPrice:false,splashDesc:true});
  assert.equal(effectiveStyle(edited[0]).sizes.price,112);
  assert.equal(effectiveStyle(edited[0]).splashPrice,false);
  assert(edited.slice(1).every((p,i)=>p===posters[i+1]));
  const selected=patchPoster(edited,new Set([posters[0].id,posters[1].id]),{descFont:'Knewave'},true);
  assert.equal(effectiveStyle(selected[0]).sizes.price,112);
  assert.equal(effectiveStyle(selected[1]).descFont,'Knewave');
  assert.equal(effectiveStyle(selected[2]).descFont,'Bangers');
  assert.deepEqual(selected.map(p=>p.product),previous.map(p=>p.product));
  assert.deepEqual(posters,previous);
  assert.equal(splitPages(selected,cfg).length,100);
  assert.deepEqual(splitPages(selected,{kind:'leaflet',perPage:12}).map(page=>page.length),[12,12,12,12,12,12,12,12,4]);
});
test('mantém dimensões físicas em pontos de impressão e converte resolução',()=>{
  assert.deepEqual(dimensions(cfg),{width:210,height:297,unit:'mm'});
  assert.deepEqual(dimensions({...cfg,landscape:true}),{width:297,height:210,unit:'mm'});
  assert.deepEqual(mmInset(21,29.7,'cm'),[210,297]);
  assert.deepEqual(imagePixels(210,297,'mm',300),[2480,3508]);
  assert.deepEqual(imagePixels(1080,1920,'px',300),[1080,1920]);
});
test('sessões isolam empresas, salvamento detecta concorrência e recuperação revoga sessões',()=>{
  const dir=mkdtempSync(join(tmpdir(),'sca-'));
  const db=open(join(dir,'test.sqlite'));
  const password='uma-senha-local-apenas-teste';
  try {
    for(const company of ['A','B'])createAdmin(db,{name:company,email:company+'@example.invalid',company,password});
    const a=login(db,'a@example.invalid',password);
    const b=login(db,'b@example.invalid',password);
    assert.equal(login(db,'a@example.invalid','incorreta'),null);
    const user=verify(db,a.token);
    const snapshot=readWorkspace(db,user);
    const change={...imported(),company:{name:'Empresa A'}};
    assert.deepEqual(saveWorkspace(db,user,snapshot.revision,change),{revision:1});
    assert.equal(saveWorkspace(db,user,snapshot.revision,change),null);
    assert.equal(readWorkspace(db,verify(db,b.token)).data.products.length,0);
    assert.deepEqual(readWorkspace(db,user).data.offers,change.offers);
    resetPassword(db,'a@example.invalid',password+'12');
    assert.equal(verify(db,a.token),null);
    assert.equal(verify(db,b.token).tenant,b.user.tenant);
    logout(db,b.token);
    assert.equal(verify(db,b.token),null);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});


test('imposição preserva proporção e margens físicas da impressão em múltiplas artes',()=>{
  const poster={width:210,height:297,unit:'mm'};
  const options={...defaultPrint(),sheet:'A4',orientation:'Paisagem',perSheet:'4',margin:'8',gap:'4',copies:'2'};
  const layout=printGeometry(poster,options);
  assert.deepEqual([layout.sheetW,layout.sheetH],[297,210]);
  assert.equal(layout.perSheet,4);
  assert.equal(layout.copies,2);
  assert(Math.abs(layout.w/layout.h-210/297)<1e-10);
  assert(layout.cols*layout.slotW+2*layout.margin+(layout.cols-1)*layout.gap<=layout.sheetW);
  assert(layout.rows*layout.slotH+2*layout.margin+(layout.rows-1)*layout.gap<=layout.sheetH);
  assert.throws(()=>printGeometry(poster,{...options,sheet:'A5',margin:'100'}));
});
