// Lê o cookie de sessão e descobre qual usuário está logado.
import { SESSAO } from '../config/seguranca.js';
import { authService } from '../services/auth.service.js';
import { AppError } from '../errors/AppError.js';

function lerCookie(req, nome) {
  const cabecalho = req.get('cookie') ?? '';
  for (const parte of cabecalho.split(';')) {
    const [chave, ...valor] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(valor.join('='));
  }
  return null;
}

/** Coloca req.usuario (ou null) em todas as requisições da API. */
export async function carregarUsuario(req, res, next) {
  req.tokenSessao = lerCookie(req, SESSAO.cookie);
  req.usuario = req.tokenSessao ? await authService.usuarioDaSessao(req.tokenSessao) : null;
  next();
}

/** Bloqueia a rota para quem não está logado. */
export function exigirLogin(req, res, next) {
  if (!req.usuario) return next(new AppError('Entre na sua conta para continuar.', 401));
  next();
}
