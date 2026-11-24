import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { open } from '../lib/db.mjs';

let db;
try {
  const target=process.argv[2];
  const source=resolve(process.env.CARTAZ_DB||'data/cartazes.sqlite');
  if(!target || !existsSync(source))throw Error('Uso: npm run backup -- CAMINHO-DO-BACKUP. O banco de origem precisa existir.');
  const output=resolve(target);
  if(existsSync(output))throw Error('O arquivo de destino já existe. Escolha outro nome.');
  mkdirSync(dirname(output),{recursive:true});
  db=open(source);
  db.prepare('VACUUM INTO ?').run(output);
  process.stdout.write('Backup criado em '+output+'\n');
} catch(error) {
  process.stderr.write(error.message+'\n');
  process.exitCode=1;
} finally {db?.close();}

