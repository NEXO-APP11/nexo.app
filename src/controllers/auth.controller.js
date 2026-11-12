// CAMADA 2 — Controller de cadastro/login. Cuida do cookie de sessão.
import { authService } from '../services/auth.service.js';
import { SESSAO, PRODUCAO } from '../config/seguranca.js';

// HttpOnly: o JavaScript da página não consegue ler o cookie (protege contra XSS)
// SameSite=Strict: o cookie não vai em requisições vindas de outros sites (protege contra CSRF)
// Secure (produção): o cookie só trafega por HTTPS
const OPCOES_COOKIE = {
  httpOnly: true,
  sameSite: 'strict',
  secure: PRODUCAO,
  path: '/',
};

function enviarSessao(res, { usuario, token, expira }, status = 200) {
  res.cookie(SESSAO.cookie, token, { ...OPCOES_COOKIE, expires: expira });
  res.status(status).json({ usuario });
}

class AuthController {
  async cadastrar(req, res) {
    enviarSessao(res, await authService.cadastrar(req.body ?? {}), 201);
  }

  async entrar(req, res) {
    enviarSessao(res, await authService.entrar(req.body ?? {}));
  }

  async sair(req, res) {
    await authService.sair(req.tokenSessao);
    res.clearCookie(SESSAO.cookie, OPCOES_COOKIE);
    res.status(204).end();
  }

  async eu(req, res) {
    res.json(await authService.perfil(req.usuario));
  }
}

export const controller = new AuthController();
export default controller;
