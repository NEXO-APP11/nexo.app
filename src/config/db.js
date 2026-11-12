import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', () => {
  console.error('Erro inesperado em uma conexão ociosa com o PostgreSQL.');
});
