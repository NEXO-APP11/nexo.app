// Validação dos dados de cadastro e login.

const IDADE_MINIMA_CADASTRO = 16;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(valor) {
  return valor === undefined || valor === null ? '' : String(valor).trim();
}

/** Deixa só os números do CPF ("123.456.789-09" → "12345678909"). */
export function somenteNumeros(valor) {
  return texto(valor).replace(/\D/g, '');
}

/** Confere os 2 dígitos verificadores do CPF (algoritmo oficial da Receita). */
export function cpfValido(valor) {
  const cpf = somenteNumeros(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; // ex: 111.111.111-11

  const digito = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) soma += Number(cpf[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** Mostra só o meio do CPF: ***.456.789-** */
export function mascararCpf(cpf) {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

export function idadeEm(dataNascimento, dataReferencia) {
  const [an, mn, dn] = dataNascimento.split('-').map(Number);
  const [ar, mr, dr] = dataReferencia.split('-').map(Number);
  let idade = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) idade--;
  return idade;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d;
}

/** Regras de senha forte. Retorna a mensagem de erro ou null. */
export function problemaNaSenha(senha, { email, cpf, nome } = {}) {
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (senha.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'A senha deve ter letras e números.';
  const minuscula = senha.toLowerCase();
  const usuarioEmail = email ? email.split('@')[0] : '';
  if ((cpf && minuscula.includes(cpf)) || (usuarioEmail.length >= 4 && minuscula.includes(usuarioEmail))) {
    return 'A senha não pode conter seu CPF ou e-mail.';
  }
  const primeiroNome = nome ? nome.toLowerCase().split(' ')[0] : '';
  if (primeiroNome.length >= 4 && minuscula.includes(primeiroNome)) {
    return 'A senha não pode conter seu nome.';
  }
  return null;
}

export function validarCadastro(corpo = {}) {
  const erros = [];

  const nome = texto(corpo.nome).replace(/\s+/g, ' ');
  const email = texto(corpo.email).toLowerCase();
  const cpf = somenteNumeros(corpo.cpf);
  const data_nascimento = texto(corpo.data_nascimento);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const aceite = corpo.aceite === true || corpo.aceite === 'on';

  if (nome.length < 3) erros.push('Informe seu nome completo.');
  else if (nome.length > 100) erros.push('O nome deve ter no máximo 100 caracteres.');

  if (!REGEX_EMAIL.test(email) || email.length > 254) erros.push('Informe um e-mail válido.');

  if (!cpfValido(cpf)) erros.push('CPF inválido. Confira os números.');

  if (!dataValida(data_nascimento) || data_nascimento > hojeISO()) {
    erros.push('Informe uma data de nascimento válida.');
  } else {
    const idade = idadeEm(data_nascimento, hojeISO());
    if (idade < IDADE_MINIMA_CADASTRO) erros.push(`É preciso ter pelo menos ${IDADE_MINIMA_CADASTRO} anos.`);
    else if (idade > 120) erros.push('Informe uma data de nascimento válida.');
  }

  const erroSenha = problemaNaSenha(senha, { email, cpf, nome });
  if (erroSenha) erros.push(erroSenha);

  if (!aceite) erros.push('É preciso aceitar o uso dos seus dados para criar a conta.');

  if (erros.length > 0) return { erros };
  return { dados: { nome, email, cpf, data_nascimento, senha } };
}

/** Login aceita e-mail OU CPF. */
export function validarLogin(corpo = {}) {
  const usuario = texto(corpo.usuario);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!usuario || !senha || senha.length > 128) return { erro: 'Informe e-mail/CPF e senha.' };

  if (usuario.includes('@')) return { dados: { email: usuario.toLowerCase(), senha } };

  const cpf = somenteNumeros(usuario);
  if (!cpfValido(cpf)) return { erro: 'E-mail/CPF ou senha incorretos.' };
  return { dados: { cpf, senha } };
}
