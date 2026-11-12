// CAMADA 2 — Controller: lê a requisição, chama o service e monta a resposta HTTP.
// O Express 5 encaminha automaticamente erros de funções async para o middleware de erro.
import resenhasService from '../services/resenhas.service.js';
import { validarId } from '../validation/resenha.validation.js';
import { AppError } from '../errors/AppError.js';

class ResenhasController {
  // Usado em router.param: valida o :id uma única vez para todas as rotas
  carregarId(req, res, next, valor) {
    const id = validarId(valor);
    if (!id) return next(new AppError('ID inválido.', 400));
    req.resenhaId = id;
    next();
  }

  async listar(req, res) {
    res.json(await resenhasService.listarProximas());
  }

  async buscar(req, res) {
    res.json(await resenhasService.buscarPorId(req.resenhaId));
  }

  async criar(req, res) {
    const resenha = await resenhasService.criar(req.body ?? {});
    res.status(201).json(resenha);
  }

  async confirmarPresenca(req, res) {
    res.json(await resenhasService.confirmarPresenca(req.resenhaId));
  }

  async remover(req, res) {
    await resenhasService.remover(req.resenhaId);
    res.status(204).end();
  }
}

export default new ResenhasController();
