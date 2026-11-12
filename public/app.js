const API = '/api/resenhas';
const GRADIENTES = ['image-one', 'image-two', 'image-three'];
const CHAVE_CONFIRMADAS = 'nexo:confirmadas';

const listaEl = document.getElementById('lista-resenhas');
const statusEl = document.getElementById('status-resenhas');
const destaqueEl = document.getElementById('destaque');
const modeloCard = document.getElementById('modelo-card');
const form = document.getElementById('form-resenha');
const mensagemForm = document.getElementById('mensagem-form');
const modal = document.getElementById('modal-detalhes');
const mensagemModal = document.getElementById('mensagem-modal');
const btnPresenca = document.getElementById('btn-presenca');

let resenhaAberta = null;

/* ================= UTILITÁRIOS ================= */

async function requisitar(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
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

function lerConfirmadas() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_CONFIRMADAS)) ?? []);
  } catch {
    return new Set();
  }
}

function salvarConfirmada(id) {
  try {
    const ids = lerConfirmadas();
    ids.add(id);
    localStorage.setItem(CHAVE_CONFIRMADAS, JSON.stringify([...ids]));
  } catch {
    /* navegador sem armazenamento: ignora */
  }
}

/* ================= LISTAGEM ================= */

let resenhasCache = [];

function renderizar(resenhas) {
  resenhasCache = resenhas;
  listaEl.replaceChildren();

  if (resenhas.length === 0) {
    statusEl.textContent = 'Nenhuma resenha marcada ainda. Que tal criar a primeira?';
    statusEl.hidden = false;
    destaqueEl.hidden = true;
    return;
  }

  statusEl.hidden = true;

  for (const resenha of resenhas) {
    const card = modeloCard.content.firstElementChild.cloneNode(true);
    card.querySelector('.event-image').classList.add(gradiente(resenha));
    preencher(card, resenha);
    card.querySelector('[data-acao="detalhes"]').addEventListener('click', () => abrirDetalhes(resenha));
    listaEl.append(card);
  }

  const proxima = resenhas[0];
  preencher(destaqueEl, proxima);
  destaqueEl.querySelector('[data-campo="data"]').textContent = formatar.diaSemana(proxima.data);
  destaqueEl.querySelector('[data-acao="detalhes"]').onclick = () => abrirDetalhes(proxima);
  destaqueEl.hidden = false;
}

async function carregarResenhas() {
  try {
    renderizar(await requisitar(API));
  } catch (erro) {
    statusEl.textContent = `Não foi possível carregar as resenhas. ${erro.message}`;
    statusEl.hidden = false;
  }
}

/* ================= DETALHES (MODAL) ================= */

function abrirDetalhes(resenha) {
  resenhaAberta = resenha;
  preencher(modal, resenha);

  const imagem = document.getElementById('modal-imagem');
  imagem.className = `modal-image ${gradiente(resenha)}`;

  atualizarBotaoPresenca();
  mensagemModal.textContent = '';
  mensagemModal.className = 'form-message';

  const url = new URL(location.href);
  url.searchParams.set('resenha', resenha.id);
  history.replaceState(null, '', url);

  if (!modal.open) modal.showModal();
}

function atualizarBotaoPresenca() {
  const r = resenhaAberta;
  const jaConfirmou = lerConfirmadas().has(r.id);
  const lotada = r.limite_pessoas && r.confirmados >= r.limite_pessoas;

  btnPresenca.disabled = jaConfirmou || lotada;
  btnPresenca.textContent = jaConfirmou ? 'Presença confirmada ✓' : lotada ? 'Lotada' : 'Confirmar presença';
}

function fecharDetalhes() {
  modal.close();
}

modal.addEventListener('close', () => {
  resenhaAberta = null;
  const url = new URL(location.href);
  url.searchParams.delete('resenha');
  history.replaceState(null, '', url);
});

// Fecha ao clicar fora do conteúdo
modal.addEventListener('click', (evento) => {
  if (evento.target === modal) fecharDetalhes();
});

document.getElementById('btn-fechar').addEventListener('click', fecharDetalhes);

btnPresenca.addEventListener('click', async () => {
  const id = resenhaAberta.id;
  btnPresenca.disabled = true;

  try {
    const atualizada = await requisitar(`${API}/${id}/presenca`, { method: 'POST' });
    salvarConfirmada(id);
    abrirDetalhes(atualizada);
    mensagemModal.textContent = 'Presença confirmada! Nos vemos lá 🎉';
    mensagemModal.className = 'form-message sucesso';
    renderizar(resenhasCache.map((r) => (r.id === id ? atualizada : r)));
  } catch (erro) {
    mensagemModal.textContent = erro.message;
    mensagemModal.className = 'form-message erro';
    atualizarBotaoPresenca();
  }
});

document.getElementById('btn-compartilhar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    mensagemModal.textContent = 'Link copiado! Agora é só mandar pra galera.';
    mensagemModal.className = 'form-message sucesso';
  } catch {
    mensagemModal.textContent = `Copie o link: ${location.href}`;
    mensagemModal.className = 'form-message';
  }
});

// Abre a resenha se a página foi aberta por um link compartilhado (?resenha=ID)
async function abrirResenhaDoLink() {
  const id = new URLSearchParams(location.search).get('resenha');
  if (!id) return;
  try {
    abrirDetalhes(await requisitar(`${API}/${encodeURIComponent(id)}`));
  } catch {
    /* link inválido ou resenha removida: apenas ignora */
  }
}

/* ================= CRIAR RESENHA ================= */

form.elements.data.min = hojeISO();

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagemForm.className = 'form-message';

  if (!form.checkValidity()) {
    const invalido = form.querySelector(':invalid');
    const rotulo = form.querySelector(`label[for="${invalido.id}"]`)?.firstChild.textContent.trim();
    mensagemForm.textContent = `Confira o campo "${rotulo}": ${invalido.validationMessage}`;
    mensagemForm.classList.add('erro');
    invalido.focus();
    return;
  }

  const botao = form.querySelector('[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Criando…';

  try {
    const dados = Object.fromEntries(new FormData(form));
    const criada = await requisitar(API, { method: 'POST', body: JSON.stringify(dados) });

    form.reset();
    mensagemForm.textContent = 'Resenha criada com sucesso! 🎉';
    mensagemForm.classList.add('sucesso');

    await carregarResenhas();
    abrirDetalhes(criada);
  } catch (erro) {
    mensagemForm.textContent = erro.message;
    mensagemForm.classList.add('erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar resenha';
  }
});

/* ================= INÍCIO ================= */

carregarResenhas();
abrirResenhaDoLink();
