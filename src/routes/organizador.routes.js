// CAMADA 1 — Rotas da área do organizador.
import { Router } from 'express';
import {controller} from '../controllers/organizador.controller.js';

const router = Router();

router.post('/entrar', controller.entrar);   // { codigo } → dados da resenha
router.post('/excluir', controller.excluir); // { codigo } → apaga a resenha

export default router;
