// Funções de criptografia usadas pelo cadastro/login.
// Tudo com o módulo nativo "crypto" do Node (sem dependências extras).
import { scrypt, randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SEGREDO_APP } from '../config/seguranca.js';

const scryptAsync = promisify(scrypt);

// Parâmetros do scrypt (custo alto de propósito: dificulta ataques de força bruta)
const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 64;

/** Gera o hash da senha. Formato salvo: scrypt$N$r$p$salt$hash */
export async function gerarHashSenha(senha) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(senha, salt, TAMANHO, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Compara a senha com o hash salvo em tempo constante. */
export async function verificarSenha(senha, salvo) {
  const [algoritmo, n, r, p, saltB64, hashB64] = String(salvo).split('$');
  if (algoritmo !== 'scrypt') return false;

  const esperado = Buffer.from(hashB64, 'base64');
  const calculado = await scryptAsync(senha, Buffer.from(saltB64, 'base64'), esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(esperado, calculado);
}

// Hash "falso" usado quando o usuário não existe, para o login demorar o mesmo tempo
// (assim ninguém descobre quais e-mails/CPFs estão cadastrados pelo tempo de resposta).
export const HASH_FALSO = await gerarHashSenha(randomBytes(16).toString('hex'));

/**
 * O CPF não é salvo em texto puro. Guardamos um HMAC (com o SEGREDO_APP),
 * que permite checar se o CPF já existe sem conseguir "voltar" para o número.
 */
export function hmacCpf(cpfSomenteNumeros) {
  return createHmac('sha256', SEGREDO_APP).update(`cpf:${cpfSomenteNumeros}`).digest('hex');
}

/** Token de sessão aleatório (vai no cookie) */
export function gerarToken() {
  return randomBytes(32).toString('base64url');
}

/** No banco salvamos só o SHA-256 do token: se o banco vazar, as sessões não podem ser usadas. */
export function sha256(texto) {
  return createHash('sha256').update(texto).digest('hex');
}
