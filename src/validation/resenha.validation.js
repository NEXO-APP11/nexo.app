const IDADES_PERMITIDAS = [0, 16, 18, 21];
const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];
const FORMAS_PAGAMENTO = ['gratuito', 'pix', 'dinheiro', 'cartao'];

function textoOpcional(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Valida e normaliza os dados enviados para criar uma resenha.
 * Retorna { dados } quando tudo está certo ou { erros } com a lista de problemas.
 */
export function validarResenha(corpo = {}) {
  const erros = [];

  const nome = textoOpcional(corpo.nome);
  const data = textoOpcional(corpo.data);
  const horario = textoOpcional(corpo.horario);
  const local = textoOpcional(corpo.local);
  const cidade = textoOpcional(corpo.cidade);
  const estado = textoOpcional(corpo.estado)?.toUpperCase() ?? null;
  const bebidas_comidas = textoOpcional(corpo.bebidas_comidas);
  const descricao = textoOpcional(corpo.descricao);

  if (!nome) erros.push('Informe o nome da resenha.');
  else if (nome.length > 100) erros.push('O nome deve ter no máximo 100 caracteres.');

  if (!data || !dataValida(data)) erros.push('Informe uma data válida.');
  else if (data < hojeISO()) erros.push('A data não pode estar no passado.');

  if (!horario || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) erros.push('Informe um horário válido (HH:MM).');

  if (!local) erros.push('Informe o local.');
  else if (local.length > 150) erros.push('O local deve ter no máximo 150 caracteres.');

  if (!cidade) erros.push('Informe a cidade.');
  else if (cidade.length > 100) erros.push('A cidade deve ter no máximo 100 caracteres.');

  if (!estado) erros.push('Informe o estado.');
  else if (!ESTADOS.includes(estado)) erros.push('Estado inválido.');

  const pagamento = textoOpcional(corpo.pagamento) ?? 'gratuito';
  let valor = null;
  if (!FORMAS_PAGAMENTO.includes(pagamento)) {
    erros.push('Forma de pagamento inválida.');
  } else if (pagamento !== 'gratuito') {
    // Aceita "20", "20.50" ou "20,50"
    valor = Number(String(corpo.valor ?? '').trim().replace(',', '.'));
    if (!corpo.valor || !Number.isFinite(valor) || valor <= 0 || valor > 100000) {
      erros.push('Informe o valor da entrada (maior que zero).');
    } else {
      valor = Math.round(valor * 100) / 100;
    }
  }

  const idade_minima = Number(corpo.idade_minima ?? 0);
  if (!IDADES_PERMITIDAS.includes(idade_minima)) erros.push('Idade mínima inválida.');

  let limite_pessoas = textoOpcional(corpo.limite_pessoas);
  if (limite_pessoas !== null) {
    limite_pessoas = Number(limite_pessoas);
    if (!Number.isInteger(limite_pessoas) || limite_pessoas < 1 || limite_pessoas > 10000) {
      erros.push('O limite de pessoas deve ser um número inteiro entre 1 e 10000.');
    }
  }

  if (bebidas_comidas && bebidas_comidas.length > 255) erros.push('Bebidas/comidas deve ter no máximo 255 caracteres.');
  if (descricao && descricao.length > 1000) erros.push('A descrição deve ter no máximo 1000 caracteres.');

  if (erros.length > 0) return { erros };

  return {
    dados: { nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao },
  };
}

/**
 * Normaliza o código do organizador ("k7m-p2q" vira "K7MP2Q").
 * Retorna o código ou null se o formato for inválido.
 */
export function validarCodigo(valor) {
  const codigo = String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : null;
}

/** Converte o parâmetro :id em número inteiro positivo, ou retorna null. */
export function validarId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}
