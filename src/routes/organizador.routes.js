// CAMADA 1 — Rotas da área do organizador.
import { Router } from 'express';
import {controller} from '../controllers/organizador.controller.js';
import { limitarTentativas } from '../middlewares/seguranca.js';

const router = Router();

// O código tem 6 caracteres: limitar tentativas impede "chutar" códigos (força bruta)
router.use(limitarTentativas({ maximo: 30, janelaMs: 15 * 60_000 }));

router.post('/entrar', controller.entrar);       // { codigo } → dados da resenha
router.post('/atualizar', controller.atualizar); // { codigo, ...dados } → altera a resenha
router.post('/excluir', controller.excluir);     // { codigo } → apaga a resenha

export default router;
