import 'dotenv/config';
import { Pool } from 'pg';

// Na nuvem (Vercel + Neon) usa DATABASE_URL com SSL; no computador usa PGHOST, PGPORT etc. do .env
const urlBanco = process.env.DATABASE_URL;

export const pool = new Pool({
  ...(urlBanco && { connectionString: urlBanco, ssl: { rejectUnauthorized: true } }),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: urlBanco ? 3 : 10, // na Vercel cada função abre suas próprias conexões
});

pool.on('error', () => {
  console.error('Erro inesperado em uma conexão ociosa com o PostgreSQL.');
});
