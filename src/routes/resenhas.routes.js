// CAMADA 1 — Routes: apenas liga cada URL/método HTTP ao controller.
import { Router } from 'express';
import {controller} from '../controllers/resenhas.controller.js';
import { limitarTentativas } from '../middlewares/seguranca.js';

const router = Router();

router.param('id', controller.carregarId);

router.get('/', controller.listar);                          // lista as próximas resenhas
router.get('/:id', controller.buscar);                       // detalhes de uma resenha
router.post('/', limitarTentativas({ maximo: 20, janelaMs: 60 * 60_000 }), controller.criar); // cria uma resenha
router.post('/:id/presenca', limitarTentativas({ maximo: 30, janelaMs: 60_000 }), controller.confirmarPresenca); // confirma presença (precisa estar logado)

export default router;
