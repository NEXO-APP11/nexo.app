import 'dotenv/config';

// Segredo da aplicação: protege o CPF (HMAC) e as sessões.
// Sem ele o servidor NÃO sobe — é melhor falhar do que rodar inseguro.
const segredo = process.env.SEGREDO_APP ?? '';

if (segredo.length < 32 || segredo.startsWith('troque-por')) {
  console.error(
    '\n[SEGURANÇA] Defina SEGREDO_APP no arquivo .env (mínimo 32 caracteres aleatórios).\n' +
      'Gere um com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n'
  );
  process.exit(1);
}

export const SEGREDO_APP = segredo;
export const PRODUCAO = process.env.NODE_ENV === 'production';

export const SESSAO = {
  cookie: 'nexo_sessao',
  duracaoMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
};
