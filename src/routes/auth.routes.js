// CAMADA 1 — Rotas de cadastro e login.
import { Router } from 'express';
import { controller } from '../controllers/auth.controller.js';
import { limitarTentativas } from '../middlewares/seguranca.js';

const router = Router();

// Limites contra força bruta e criação de contas em massa
const limiteLogin = limitarTentativas({ maximo: 10, janelaMs: 15 * 60_000 });
const limiteCadastro = limitarTentativas({ maximo: 5, janelaMs: 60 * 60_000 });

router.post('/cadastro', limiteCadastro, controller.cadastrar);
router.post('/login', limiteLogin, controller.entrar);
router.post('/sair', controller.sair);
router.get('/eu', controller.eu); // quem está logado + resenhas em que confirmou presença

export default router;
