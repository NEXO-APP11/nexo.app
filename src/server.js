import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import resenhasRouter from './routes/resenhas.routes.js';
import organizadorRouter from './routes/organizador.routes.js';
import { AppError } from './errors/AppError.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const pastaPublica = fileURLToPath(new URL('../public', import.meta.url));

app.use(express.json({ limit: '20kb' }));

// Front-end (index.html, style.css, app.js)
// extensions: permite abrir /organizador em vez de /organizador.html
app.use(express.static(pastaPublica, { extensions: ['html'] }));

// API
app.use('/api/resenhas', resenhasRouter);
app.use('/api/organizador', organizadorRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento central de erros
// Códigos do PostgreSQL: 3D000 = banco não existe, 42P01 = tabela não existe, 28P01 = senha incorreta
const ERROS_DE_BANCO = ['ECONNREFUSED', 'ENOTFOUND', '3D000', '42P01', '28P01'];

app.use((erro, req, res, next) => {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message, erros: erro.detalhes });
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Dados enviados são grandes demais.' });
  }

  if (ERROS_DE_BANCO.includes(erro.code)) {
    console.error(`Banco de dados indisponível (${erro.code}): ${erro.message}`);
    return res.status(503).json({
      erro: 'Banco de dados indisponível. Verifique o .env e rode "npm run db:init".',
    });
  }

  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`NEXO rodando em http://localhost:${port}`);
});
