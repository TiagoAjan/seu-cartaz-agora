import test from 'node:test';
import assert from 'node:assert/strict';
import {assetFromData,makeSupabase} from '../lib/supabase.mjs';
import {externalizeImages} from '../lib/cloud-assets.mjs';
import {empty} from '../lib/model.mjs';

const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/avpYz8AAAAASUVORK5CYII=';
const mockConfig={url:'https://project.example.invalid',key:'sb_publishable_test'};
test('valida a configuração e recusa chaves administrativas',()=>{
  assert.throws(()=>makeSupabase({...mockConfig,key:'sb_secret_administrativa'}));
  assert.throws(()=>makeSupabase({...mockConfig,url:'http://servidor.example.invalid'}));
  assert.throws(()=>makeSupabase({...mockConfig,url:'https://project.example.invalid/other'}));
});
test('armazenamento privado tem caminho determinístico e evita duplicação nos snapshots',async()=>{
  const file=assetFromData(image);
  assert.match(file.key,/^[a-f0-9]{64}\.png$/);
  assert.throws(()=>assetFromData('data:image/jpeg;base64,NOTAIMAGE='));
  assert.throws(()=>assetFromData(image.replace('png','jpeg')));
  const data={products:[{image}],media:[{image}],batches:[{items:[{product:{image}}]}]};
  let calls=0;
  const saved=await externalizeImages(data,async()=>{calls++;return '/api/workspace?asset='+file.key;});
  assert.equal(calls,1);
  assert.equal(saved.products[0].image,saved.media[0].image);
  assert.equal(saved.products[0].image,saved.batches[0].items[0].product.image);
  assert.equal(data.products[0].image,image);
});
test('consulta e atualiza com o JWT do usuário e verifica conflitos de versão',async()=>{
  const calls=[];
  const account={id:'tenant-auth-id',email:'operador@example.invalid'};
  const data={...empty(),company:{name:'Minha Empresa'}};
  const responses=[
    {access_token:'jwt-auth',refresh_token:'refresh-token',user:account},
    [{id:'workspace-id',revision:3,data}],
    [{revision:4}],
    []
  ];
  const client=makeSupabase({...mockConfig,fetcher:async(url,options)=>{
    calls.push({url,options});
    return Response.json(responses.shift());
  }});
  const session=await client.login(account.email,'senha-para-teste');
  const tenant=await client.read(session.access_token,session.user);
  assert.equal(tenant.user.tenant,'workspace-id');
  assert.equal(tenant.data.company.name,'Minha Empresa');
  assert.deepEqual(await client.save(session.access_token,tenant.revision,data),{revision:4});
  assert.equal(await client.save(session.access_token,tenant.revision,data),null);
  assert.match(calls[0].url,/grant_type=password/);
  assert.equal(calls[0].options.headers.Authorization,undefined);
  assert(calls.slice(1).every(c=>c.options.headers.Authorization==='Bearer jwt-auth'));
  assert.match(calls[2].url,/revision=eq\.3/);
  assert.deepEqual(JSON.parse(calls[2].options.body),{data,revision:4});
});
test('envia a foto exclusivamente para a pasta do identificador autenticado',async()=>{
  const urls=[];
  const client=makeSupabase({...mockConfig,fetcher:async(url,options)=>{
    urls.push(url);
    if(url.endsWith('/auth/v1/user'))return Response.json({id:'auth-me'});
    assert.equal(options.headers.Authorization,'Bearer jwt');
    assert.equal(options.headers['x-upsert'],'false');
    return Response.json({Key:'ok'});
  }});
  const result=await client.upload('jwt',image);
  assert.equal(result.url,'/api/workspace?asset='+assetFromData(image).key);
  assert(urls.at(-1).endsWith('/sca-assets/auth-me/'+assetFromData(image).key));
});

