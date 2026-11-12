const IDADES_PERMITIDAS = [0, 16, 18, 21];

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
  const bebidas_comidas = textoOpcional(corpo.bebidas_comidas);
  const descricao = textoOpcional(corpo.descricao);

  if (!nome) erros.push('Informe o nome da resenha.');
  else if (nome.length > 100) erros.push('O nome deve ter no máximo 100 caracteres.');

  if (!data || !dataValida(data)) erros.push('Informe uma data válida.');
  else if (data < hojeISO()) erros.push('A data não pode estar no passado.');

  if (!horario || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) erros.push('Informe um horário válido (HH:MM).');

  if (!local) erros.push('Informe o local.');
  else if (local.length > 150) erros.push('O local deve ter no máximo 150 caracteres.');

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
    dados: { nome, data, horario, local, idade_minima, limite_pessoas, bebidas_comidas, descricao },
  };
}

/** Converte o parâmetro :id em número inteiro positivo, ou retorna null. */
export function validarId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}
