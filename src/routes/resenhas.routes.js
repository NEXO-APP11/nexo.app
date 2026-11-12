// CAMADA 1 — Routes: apenas liga cada URL/método HTTP ao controller.
import { Router } from 'express';
import {controller} from '../controllers/resenhas.controller.js';

const router = Router();

router.param('id', controller.carregarId);

router.get('/', controller.listar);                          // lista as próximas resenhas
router.get('/:id', controller.buscar);                       // detalhes de uma resenha
router.post('/', controller.criar);                          // cria uma resenha
router.post('/:id/presenca', controller.confirmarPresenca);  // confirma presença

export default router;
