// CAMADA 3 — Service de cadastro, login e sessão.
import { usuariosRepository } from '../repositories/usuarios.repository.js';
import { validarCadastro, validarLogin, mascararCpf } from '../validation/usuario.validation.js';
import { gerarHashSenha, verificarSenha, HASH_FALSO, hmacCpf, gerarToken, sha256 } from '../security/cripto.js';
import { SESSAO } from '../config/seguranca.js';
import { AppError } from '../errors/AppError.js';

const ERRO_UNICO_POSTGRES = '23505';

class AuthService {
  async cadastrar(corpo) {
    const { dados, erros } = validarCadastro(corpo);
    if (erros) throw new AppError(erros[0], 400, erros);

    try {
      const usuario = await usuariosRepository.inserir({
        nome: dados.nome,
        email: dados.email,
        cpf_hash: hmacCpf(dados.cpf),
        cpf_mascarado: mascararCpf(dados.cpf),
        data_nascimento: dados.data_nascimento,
        senha_hash: await gerarHashSenha(dados.senha),
      });
      return { usuario, ...(await this.#abrirSessao(usuario.id)) };
    } catch (erro) {
      if (erro.code === ERRO_UNICO_POSTGRES) {
        if (erro.constraint?.includes('cpf')) throw new AppError('Este CPF já possui cadastro. Faça login.', 409);
        if (erro.constraint?.includes('email')) throw new AppError('Este e-mail já possui cadastro. Faça login.', 409);
      }
      throw erro;
    }
  }

  async entrar(corpo) {
    const { dados, erro } = validarLogin(corpo);
    if (erro) throw new AppError(erro, 400);

    const encontrado = await usuariosRepository.buscarParaLogin({
      email: dados.email,
      cpf_hash: dados.cpf ? hmacCpf(dados.cpf) : null,
    });

    // Sempre roda o scrypt (mesmo sem usuário) para não revelar quem está cadastrado
    const senhaCerta = await verificarSenha(dados.senha, encontrado?.senha_hash ?? HASH_FALSO);
    if (!encontrado || !senhaCerta) throw new AppError('E-mail/CPF ou senha incorretos.', 401);

    const { senha_hash, ...usuario } = encontrado;
    await usuariosRepository.removerSessoesExpiradas();
    return { usuario, ...(await this.#abrirSessao(usuario.id)) };
  }

  async sair(token) {
    if (token) await usuariosRepository.removerSessao(sha256(token));
  }

  async usuarioDaSessao(token) {
    if (typeof token !== 'string' || token.length > 100) return null;
    return usuariosRepository.buscarPorSessao(sha256(token));
  }

  async perfil(usuario) {
    if (!usuario) return { usuario: null, presencas: [] };
    return { usuario, presencas: await usuariosRepository.idsDasPresencas(usuario.id) };
  }

  async #abrirSessao(usuarioId) {
    const token = gerarToken();
    const expira = new Date(Date.now() + SESSAO.duracaoMs);
    await usuariosRepository.criarSessao(sha256(token), usuarioId, expira);
    return { token, expira };
  }
}

export const authService = new AuthService();
export default authService;
