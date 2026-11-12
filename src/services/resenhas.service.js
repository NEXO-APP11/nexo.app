// CAMADA 3 — Service: regras de negócio. Não conhece Express nem SQL.
import { randomInt } from 'node:crypto';
import {resenhasRepository} from '../repositories/resenhas.repository.js';
import { validarResenha, validarCodigo } from '../validation/resenha.validation.js';
import { idadeEm } from '../validation/usuario.validation.js';
import { AppError } from '../errors/AppError.js';

// Sem letras/números parecidos (0/O, 1/I/L) para o código ser fácil de digitar
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ERRO_UNICO_POSTGRES = '23505';

function gerarCodigoOrganizador() {
  let codigo = '';
  for (let i = 0; i < 6; i++) codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return codigo;
}

class ResenhasService {
  listarProximas() {
    return resenhasRepository.listarProximas();
  }

  async buscarPorId(id) {
    const resenha = await resenhasRepository.buscarPorId(id);
    if (!resenha) throw new AppError('Resenha não encontrada.', 404);
    return resenha;
  }

  // Cria a resenha e devolve junto o código do organizador (só aparece nesta resposta).
  async criar(corpo) {
    const { dados, erros } = validarResenha(corpo);
    if (erros) throw new AppError(erros[0], 400, erros);

    // Se o código sorteado já existir (muito raro), tenta outro
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      try {
        return await resenhasRepository.inserir({ ...dados, codigo_organizador: gerarCodigoOrganizador() });
      } catch (erro) {
        if (erro.code !== ERRO_UNICO_POSTGRES) throw erro;
      }
    }
    throw new AppError('Não foi possível gerar o código do organizador. Tente novamente.', 500);
  }

  // Só usuários logados confirmam presença, uma vez por resenha, respeitando a idade mínima.
  async confirmarPresenca(id, usuario) {
    if (!usuario) throw new AppError('Entre na sua conta para confirmar presença.', 401);

    const resenha = await this.buscarPorId(id);
    if (idadeEm(usuario.data_nascimento, resenha.data) < resenha.idade_minima) {
      throw new AppError(`Esta resenha é só para maiores de ${resenha.idade_minima} anos.`, 403);
    }

    const resultado = await resenhasRepository.registrarPresenca(id, usuario.id);
    if (resultado.status === 'duplicada') throw new AppError('Você já confirmou presença nesta resenha.', 409);
    if (resultado.status === 'lotada') throw new AppError('Essa resenha já está lotada.', 409);
    return resultado.resenha;
  }

  /* ---------- Área do organizador (acesso pelo código) ---------- */

  async buscarPorCodigo(codigoInformado) {
    const codigo = validarCodigo(codigoInformado);
    if (!codigo) throw new AppError('O código deve ter 6 letras/números.', 400);

    const resenha = await resenhasRepository.buscarPorCodigo(codigo);
    if (!resenha) throw new AppError('Código não encontrado. Confira e tente de novo.', 404);
    return resenha;
  }

  async atualizarPorCodigo(codigoInformado, corpo) {
    const atual = await this.buscarPorCodigo(codigoInformado);

    const { dados, erros } = validarResenha(corpo);
    if (erros) throw new AppError(erros[0], 400, erros);

    if (dados.limite_pessoas !== null && dados.limite_pessoas < atual.confirmados) {
      throw new AppError(
        `O limite não pode ser menor que os ${atual.confirmados} confirmados.`,
        400
      );
    }
    return resenhasRepository.atualizarPorCodigo(atual.codigo_organizador, dados);
  }

  async removerPorCodigo(codigoInformado) {
    const codigo = validarCodigo(codigoInformado);
    if (!codigo) throw new AppError('O código deve ter 6 letras/números.', 400);

    const removida = await resenhasRepository.removerPorCodigo(codigo);
    if (!removida) throw new AppError('Código não encontrado. Confira e tente de novo.', 404);
  }
}

export const resenhasService = new ResenhasService();
export default resenhasService;
