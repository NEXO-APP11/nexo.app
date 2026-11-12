import 'dotenv/config';
import './config/seguranca.js'; // confere o SEGREDO_APP antes de tudo
import express from 'express';
import { fileURLToPath } from 'node:url';
import resenhasRouter from './routes/resenhas.routes.js';
import organizadorRouter from './routes/organizador.routes.js';
import authRouter from './routes/auth.routes.js';
import { AppError } from './errors/AppError.js';
import { cabecalhosSeguranca, semCache, mesmaOrigem } from './middlewares/seguranca.js';
import { carregarUsuario } from './middlewares/autenticacao.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const pastaPublica = fileURLToPath(new URL('../public', import.meta.url));

// Não anuncia que o servidor é Express (dificulta reconhecimento por atacantes)
app.disable('x-powered-by');
// Se publicar atrás de um proxy (Render, Railway, Nginx...), use TRUST_PROXY=1 no .env
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(cabecalhosSeguranca);
app.use(express.json({ limit: '20kb' }));

// Front-end (index.html, organizador.html, conta.html...)
// extensions: permite abrir /organizador em vez de /organizador.html
app.use(express.static(pastaPublica, { extensions: ['html'] }));

// API
app.use('/api', semCache, mesmaOrigem, carregarUsuario);
app.use('/api/auth', authRouter);
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

  // 23514 = alguma regra (CHECK) do banco foi violada
  if (erro.code === '23514') {
    return res.status(400).json({ erro: 'Dados inválidos para esta resenha.' });
  }

  if (ERROS_DE_BANCO.includes(erro.code)) {
    console.error(`Banco de dados indisponível (${erro.code}): ${erro.message}`);
    return res.status(503).json({
      erro: 'Banco de dados indisponível. Verifique o .env e rode "npm run db:init".',
    });
  }

  // Nunca envia detalhes técnicos do erro para o navegador
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`NEXO rodando em http://localhost:${port}`);
});
