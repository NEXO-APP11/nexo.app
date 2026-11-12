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

/* ================= SESSÃO DO USUÁRIO ================= */

// Pergunta ao servidor quem está logado. O cookie de sessão é HttpOnly:
// o JavaScript não consegue lê-lo, só o servidor.
let sessaoAtual = { usuario: null, presencas: [] };

async function carregarSessao() {
  try {
    sessaoAtual = await requisitar('/api/auth/eu');
  } catch {
    sessaoAtual = { usuario: null, presencas: [] };
  }
  atualizarCabecalho();
  return sessaoAtual;
}

// Mostra "Entrar" ou o primeiro nome do usuário no topo do site
function atualizarCabecalho() {
  const link = document.getElementById('link-conta');
  if (!link) return;
  const usuario = sessaoAtual.usuario;
  link.textContent = usuario ? `👤 ${usuario.nome.split(' ')[0]}` : 'Entrar';
  link.title = usuario ? 'Minha conta' : 'Entrar ou criar conta';
}

/* ================= CAMPOS DE FORMULÁRIO REUTILIZÁVEIS ================= */

// Campo "Valor" só aparece (e é obrigatório) quando a resenha não é gratuita
function ligarCampoValor(form, grupoValor) {
  const atualizar = () => {
    const paga = form.elements.pagamento.value !== 'gratuito';
    grupoValor.hidden = !paga;
    form.elements.valor.required = paga;
    form.elements.valor.disabled = !paga; // desabilitado = não vai no envio
  };
  form.elements.pagamento.addEventListener('change', atualizar);
  form.addEventListener('reset', () => setTimeout(atualizar));
  atualizar();
  return atualizar;
}

// Balão de cidade/estado: ao escolher o estado, sugere as cidades dele (dados do IBGE).
// Se a internet/IBGE falhar, a pessoa ainda pode digitar a cidade normalmente.
const cacheCidades = {};

function carregarCidades(uf) {
  if (!/^[A-Z]{2}$/.test(uf)) return Promise.resolve([]);
  if (!cacheCidades[uf]) {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    cacheCidades[uf] = fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((cidades) => cidades.map((c) => c.nome))
      .catch(() => {
        delete cacheCidades[uf];
        return [];
      });
  }
  return cacheCidades[uf];
}

function ligarCamposLocal(form, listaCidades) {
  const campoEstado = form.elements.estado;
  const campoCidade = form.elements.cidade;

  // manterCidade = true quando o formulário é preenchido com dados já salvos (edição)
  async function aoTrocarEstado(manterCidade = false) {
    const uf = campoEstado.value;
    if (!manterCidade) campoCidade.value = '';
    listaCidades.replaceChildren();
    campoCidade.disabled = !uf;
    campoCidade.placeholder = uf ? 'Digite a cidade' : 'Escolha o estado primeiro';
    if (!uf) return;

    const cidades = await carregarCidades(uf);
    if (campoEstado.value !== uf) return; // trocou de estado enquanto carregava
    listaCidades.replaceChildren(...cidades.map((nome) => new Option(nome)));
  }

  campoEstado.addEventListener('change', () => aoTrocarEstado());
  form.addEventListener('reset', () => setTimeout(() => aoTrocarEstado()));
  return aoTrocarEstado;
}

// Mostra o primeiro campo inválido com uma mensagem amigável. Retorna true se está tudo ok.
function validarNoNavegador(form, mensagemEl) {
  if (form.checkValidity()) return true;
  const invalido = form.querySelector(':invalid');
  const rotulo = form.querySelector(`label[for="${invalido.id}"]`)?.firstChild.textContent.trim();
  mensagemEl.textContent = rotulo
    ? `Confira o campo "${rotulo}": ${invalido.validationMessage}`
    : invalido.validationMessage;
  mensagemEl.className = 'form-message erro';
  invalido.focus();
  return false;
}
