import { open, createAdmin, resetPassword } from '../lib/db.mjs';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';

let muted=false;
const output=new Writable({write(chunk,encoding,done){if(!muted) stdout.write(chunk); done();}});
const terminal=createInterface({input:stdin,output,terminal:stdin.isTTY});
let db;
try {
  const reset=process.argv.includes('--reset');
  const email=await terminal.question('E-mail: ');
  const name=reset?'':await terminal.question('Seu nome: ');
  const company=reset?'':await terminal.question('Empresa: ');
  stdout.write('Senha (mínimo de 12 caracteres): ');
  muted=true;
  const password=await terminal.question('');
  muted=false;
  stdout.write('\n');
  db=open();
  if (reset) resetPassword(db,email,password);
  else createAdmin(db,{email,name,company,password});
  stdout.write(reset?'Senha atualizada.\n':'Administrador criado. Entre com seu e-mail na aplicação.\n');
} catch(error) {
  process.stderr.write(error.message+'\n');
  process.exitCode=1;
} finally {db?.close();terminal.close();}

