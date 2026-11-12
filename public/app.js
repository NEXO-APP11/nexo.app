const API = '/api/resenhas';

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
  document.getElementById('codigo-box').hidden = true;

  const url = new URL(location.href);
  url.searchParams.set('resenha', resenha.id);
  history.replaceState(null, '', url);

  if (!modal.open) modal.showModal();
}

function atualizarBotaoPresenca() {
  const r = resenhaAberta;
  const logado = Boolean(sessaoAtual.usuario);
  const jaConfirmou = sessaoAtual.presencas.includes(r.id);
  const lotada = Boolean(r.limite_pessoas) && r.confirmados >= r.limite_pessoas;

  btnPresenca.disabled = jaConfirmou || (lotada && logado);
  btnPresenca.textContent = !logado
    ? 'Entrar para confirmar'
    : jaConfirmou
      ? 'Presença confirmada ✓'
      : lotada
        ? 'Lotada'
        : 'Confirmar presença';
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

  // Sem login: manda para a página de conta e volta para esta resenha depois
  if (!sessaoAtual.usuario) {
    location.href = `conta?voltar=${encodeURIComponent(`/?resenha=${id}`)}`;
    return;
  }

  btnPresenca.disabled = true;
  try {
    const atualizada = await requisitar(`${API}/${id}/presenca`, { method: 'POST' });
    sessaoAtual.presencas.push(id);
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

ligarCampoValor(form, document.getElementById('grupo-valor'));
ligarCamposLocal(form, document.getElementById('lista-cidades'));

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagemForm.className = 'form-message';

  if (!validarNoNavegador(form, mensagemForm)) return;

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
    mostrarCodigoOrganizador(criada.codigo_organizador);
  } catch (erro) {
    mensagemForm.textContent = erro.message;
    mensagemForm.classList.add('erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar resenha';
  }
});

/* ================= INÍCIO ================= */

// Carrega a sessão primeiro para o botão de presença já saber se a pessoa está logada
carregarSessao().finally(() => {
  carregarResenhas();
  abrirResenhaDoLink();
});

/* ================= CÓDIGO DO ORGANIZADOR ================= */

function mostrarCodigoOrganizador(codigo) {
  if (!codigo) return;
  document.getElementById('codigo-valor').textContent = codigo;
  document.getElementById('codigo-box').hidden = false;
  document.getElementById('btn-copiar-codigo').textContent = 'Copiar código';
}

const btnCopiarCodigo = document.getElementById('btn-copiar-codigo');
btnCopiarCodigo.addEventListener('click', async () => {
  const codigo = document.getElementById('codigo-valor').textContent;
  try {
    await navigator.clipboard.writeText(codigo);
    btnCopiarCodigo.textContent = 'Código copiado ✓';
  } catch {
    btnCopiarCodigo.textContent = 'Anote o código acima';
  }
});
