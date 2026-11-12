// CAMADA 2 — Controller da área do organizador.
// O código vai no corpo da requisição (POST) para não aparecer na URL nem no histórico.
import {resenhasService} from '../services/resenhas.service.js';

class OrganizadorController {
  async entrar(req, res) {
    res.json(await resenhasService.buscarPorCodigo(req.body?.codigo));
  }

  async atualizar(req, res) {
    res.json(await resenhasService.atualizarPorCodigo(req.body?.codigo, req.body ?? {}));
  }

  async excluir(req, res) {
    await resenhasService.removerPorCodigo(req.body?.codigo);
    res.status(204).end();
  }
}

export const controller = new OrganizadorController();
export default controller;
