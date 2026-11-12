// Funções usadas pelas duas páginas (index.html e organizador.html).
// Carregado antes de app.js / organizador.js.

const GRADIENTES = ['image-one', 'image-two', 'image-three'];
const NOMES_PAGAMENTO = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };

/* ================= UTILITÁRIOS ================= */

async function requisitar(url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opcoes,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Rode "npm run dev" e abra http://localhost:3000');
  }
  if (resposta.status === 404 && !resposta.headers.get('content-type')?.includes('json')) {
    throw new Error('A página não foi aberta pelo servidor. Rode "npm run dev" e abra http://localhost:3000');
  }
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(corpo?.erro || 'Não foi possível completar a ação. Tente novamente.');
  }
  return corpo;
}

function paraData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function hojeISO() {
  const hoje = new Date();
  hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
  return hoje.toISOString().slice(0, 10);
}

const formatar = {
  dataCurta: (iso) =>
    paraData(iso)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      .replace('.', '')
      .replace(' de ', ' ')
      .toUpperCase(),
  dataLonga: (iso) =>
    paraData(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  diaSemana: (iso) => {
    const dia = paraData(iso).toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  },
  quando: (iso) => {
    const dias = Math.round((paraData(iso) - paraData(hojeISO())) / 86_400_000);
    if (dias <= 0) return 'Hoje';
    if (dias === 1) return 'Amanhã';
    return `Em ${dias} dias`;
  },
  idade: (idade) => (idade > 0 ? `${idade}+` : 'Livre'),
  endereco: (r) => {
    const cidade = [r.cidade, r.estado].filter(Boolean).join(' - ');
    return cidade ? `${r.local} · ${cidade}` : r.local;
  },
  pagamento: (r) => {
    if (r.pagamento === 'gratuito' || !r.valor) return 'Gratuita';
    const valor = Number(r.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `${valor} · ${NOMES_PAGAMENTO[r.pagamento] ?? r.pagamento}`;
  },
  presentes: (r) =>
    r.limite_pessoas
      ? `${r.confirmados}/${r.limite_pessoas} presentes`
      : `${r.confirmados} ${r.confirmados === 1 ? 'presente' : 'presentes'}`,
};

// Preenche elementos [data-campo] usando textContent (evita injeção de HTML)
function preencher(raiz, resenha) {
  const valores = {
    nome: resenha.nome,
    local: resenha.local,
    endereco: formatar.endereco(resenha),
    pagamento: formatar.pagamento(resenha),
    horario: resenha.horario,
    data: formatar.dataLonga(resenha.data),
    'data-curta': formatar.dataCurta(resenha.data),
    idade: formatar.idade(resenha.idade_minima),
    presentes: formatar.presentes(resenha),
    confirmados: `${resenha.confirmados} ${resenha.confirmados === 1 ? 'pessoa' : 'pessoas'}`,
    quando: formatar.quando(resenha.data),
    bebidas_comidas: resenha.bebidas_comidas ?? '',
    descricao: resenha.descricao ?? '',
  };

  raiz.querySelectorAll('[data-campo]').forEach((el) => {
    el.textContent = valores[el.dataset.campo] ?? '';
  });
  raiz.querySelectorAll('[data-se]').forEach((el) => {
    el.hidden = !resenha[el.dataset.se];
  });
}

function gradiente(resenha) {
  return GRADIENTES[resenha.id % GRADIENTES.length];
}
