import 'dotenv/config';
import { Pool } from 'pg';

// O Pool lê automaticamente PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD do .env
export const pool = new Pool();

pool.on('error', (erro) => {
  console.error('Erro inesperado na conexão com o banco:', erro.message);
});
