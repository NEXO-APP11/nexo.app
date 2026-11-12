// Middlewares de cibersegurança aplicados a todo o site.
import { PRODUCAO } from '../config/seguranca.js';
import { AppError } from '../errors/AppError.js';

/**
 * Cabeçalhos de segurança HTTP.
 * - CSP: só permite scripts/estilos do próprio site (bloqueia XSS injetado)
 * - frame-ancestors/X-Frame-Options: impede o site de ser aberto dentro de outro (clickjacking)
 * - nosniff: o navegador não "adivinha" o tipo dos arquivos
 */
export function cabecalhosSeguranca(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self' https://servicodados.ibge.gov.br",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (PRODUCAO) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** Respostas da API nunca ficam em cache (dados pessoais). */
export function semCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * Proteção CSRF: requisições que alteram dados (POST/PUT/PATCH/DELETE)
 * só são aceitas se vierem do próprio site.
 */
export function mesmaOrigem(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origem = req.get('origin');
  const esperado = `${req.protocol}://${req.get('host')}`;
  if (origem && origem !== esperado) {
    return next(new AppError('Requisição bloqueada: origem não permitida.', 403));
  }

  // Corpo precisa ser JSON (formulários de outros sites não conseguem enviar JSON sem CORS)
  if (req.get('content-length') > 0 && !req.is('application/json')) {
    return next(new AppError('Envie os dados em formato JSON.', 415));
  }
  next();
}

/**
 * Limite de tentativas por IP (contra força bruta e spam).
 * Ex: limitarTentativas({ maximo: 10, janelaMs: 15 * 60_000 })
 */
export function limitarTentativas({ maximo, janelaMs, mensagem }) {
  const contagens = new Map();

  // Limpa contadores antigos de tempos em tempos
  setInterval(() => {
    const agora = Date.now();
    for (const [chave, item] of contagens) if (item.expira <= agora) contagens.delete(chave);
  }, janelaMs).unref();

  return (req, res, next) => {
    const agora = Date.now();
    const chave = req.ip;
    let item = contagens.get(chave);
    if (!item || item.expira <= agora) {
      item = { total: 0, expira: agora + janelaMs };
      contagens.set(chave, item);
    }
    item.total++;

    res.setHeader('RateLimit-Limit', maximo);
    res.setHeader('RateLimit-Remaining', Math.max(maximo - item.total, 0));

    if (item.total > maximo) {
      const segundos = Math.ceil((item.expira - agora) / 1000);
      res.setHeader('Retry-After', segundos);
      const minutos = Math.ceil(segundos / 60);
      return next(
        new AppError(mensagem ?? `Muitas tentativas. Tente de novo em ${minutos} minuto(s).`, 429)
      );
    }
    next();
  };
}
