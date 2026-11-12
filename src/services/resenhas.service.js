// CAMADA 3 — Service: regras de negócio. Não conhece Express nem SQL.
import {resenhasRepository} from '../repositories/resenhas.repository.js';
import { validarResenha } from '../validation/resenha.validation.js';
import { AppError } from '../errors/AppError.js';

class ResenhasService {
  listarProximas() {
    return resenhasRepository.listarProximas();
  }

  async buscarPorId(id) {
    const resenha = await resenhasRepository.buscarPorId(id);
    if (!resenha) throw new AppError('Resenha não encontrada.', 404);
    return resenha;
  }

  async criar(corpo) {
    const { dados, erros } = validarResenha(corpo);
    if (erros) throw new AppError(erros[0], 400, erros);
    return resenhasRepository.inserir(dados);
  }

  async confirmarPresenca(id) {
    const atualizada = await resenhasRepository.incrementarConfirmados(id);
    if (atualizada) return atualizada;

    // Não atualizou: ou a resenha não existe (404) ou está lotada (409)
    await this.buscarPorId(id);
    throw new AppError('Essa resenha já está lotada.', 409);
  }

  async remover(id) {
    const removida = await resenhasRepository.remover(id);
    if (!removida) throw new AppError('Resenha não encontrada.', 404);
  }
}

export default new ResenhasService();
