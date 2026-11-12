// Cria o banco (se não existir), a tabela "resenhas" e insere dados de exemplo.
// Uso: npm run db:init
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const nomeBanco = process.env.PGDATABASE || 'nexo';

async function criarBancoSeNaoExistir() {
  // Conecta no banco padrão "postgres" só para poder criar o banco da aplicação
  const admin = new pg.Client({ database: 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(nomeBanco)}`);
      console.log(`Banco "${nomeBanco}" criado.`);
    }
  } finally {
    await admin.end();
  }
}

async function criarTabelas() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const cliente = new pg.Client({ database: nomeBanco });
  await cliente.connect();
  try {
    await cliente.query(sql);
  } finally {
    await cliente.end();
  }
}

try {
  await criarBancoSeNaoExistir();
  await criarTabelas();
  console.log('Banco de dados pronto! Tabela "resenhas" criada.');
} catch (erro) {
  console.error('Não foi possível preparar o banco:', erro.message);
  process.exitCode = 1;
}
