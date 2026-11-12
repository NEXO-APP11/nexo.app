// Área do organizador: pede o código e mostra o painel da resenha.
// Usa requisitar(), formatar, preencher() e gradiente() de comum.js.

const API_ORGANIZADOR = '/api/organizador';
// Guarda o código só enquanto a aba estiver aberta (some ao fechar o navegador)
const CHAVE_SESSAO = 'nexo:codigo-organizador';

const telaAcesso = document.getElementById('tela-acesso');
const telaPainel = document.getElementById('tela-painel');
const formCodigo = document.getElementById('form-codigo');
const campoCodigo = document.getElementById('codigo');
const mensagemCodigo = document.getElementById('mensagem-codigo');
const mensagemPainel = document.getElementById('mensagem-painel');
const btnEntrar = formCodigo.querySelector('[type="submit"]');

let codigoAtual = null;
let resenhaAtual = null;

/* ================= SESSÃO ================= */

function lerSessao() {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
}

function salvarSessao(codigo) {
  try {
    if (codigo) sessionStorage.setItem(CHAVE_SESSAO, codigo);
    else sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* navegador sem armazenamento: ignora */
  }
}

/* ================= ENTRAR COM O CÓDIGO ================= */

// Deixa o código sempre em maiúsculas e sem espaços enquanto digita
campoCodigo.addEventListener('input', () => {
  campoCodigo.value = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

async function entrar(codigo) {
  const resenha = await requisitar(`${API_ORGANIZADOR}/entrar`, {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  });
  codigoAtual = resenha.codigo_organizador;
  salvarSessao(codigoAtual);
  mostrarPainel(resenha);
}

formCodigo.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagemCodigo.className = 'form-message';

  const codigo = campoCodigo.value.trim();
  if (codigo.length !== 6) {
    mensagemCodigo.textContent = 'O código tem 6 letras/números.';
    mensagemCodigo.classList.add('erro');
    campoCodigo.focus();
    return;
  }

  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Verificando…';
  try {
    await entrar(codigo);
    mensagemCodigo.textContent = '';
  } catch (erro) {
    mensagemCodigo.textContent = erro.message;
    mensagemCodigo.classList.add('erro');
    campoCodigo.select();
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});

/* ================= PAINEL ================= */

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarPainel(resenha) {
  resenhaAtual = resenha;
  preencher(telaPainel, resenha);
  document.getElementById('painel-imagem').className = `painel-topo ${gradiente(resenha)}`;

  // Números
  const { confirmados, limite_pessoas: limite } = resenha;
  document.getElementById('stat-confirmados').textContent = confirmados;

  const statVagas = document.getElementById('stat-vagas');
  const rotuloVagas = document.getElementById('stat-vagas-rotulo');
  const barra = document.getElementById('barra');
  if (limite) {
    const vagas = Math.max(limite - confirmados, 0);
    statVagas.textContent = vagas;
    rotuloVagas.textContent = vagas === 0 ? 'lotada!' : `vagas restantes de ${limite}`;
    barra.hidden = false;
    document.getElementById('barra-preenchida').style.width = `${Math.min((confirmados / limite) * 100, 100)}%`;
  } else {
    statVagas.textContent = '∞';
    rotuloVagas.textContent = 'sem limite de pessoas';
    barra.hidden = true;
  }

  document.getElementById('stat-arrecadacao').textContent =
    resenha.pagamento === 'gratuito' || !resenha.valor ? 'Gratuita' : moeda(resenha.valor * confirmados);

  document.getElementById('link-publico').href = linkPublico(resenha);

  mensagemPainel.textContent = '';
  mensagemPainel.className = 'form-message';

  telaAcesso.hidden = true;
  telaPainel.hidden = false;
  document.title = `NEXO | ${resenha.nome}`;
}

function linkPublico(resenha) {
  return `${location.origin}/?resenha=${resenha.id}`;
}

function sair() {
  codigoAtual = null;
  resenhaAtual = null;
  salvarSessao(null);
  formCodigo.reset();
  telaPainel.hidden = true;
  telaAcesso.hidden = false;
  document.title = 'NEXO | Área do organizador';
  campoCodigo.focus();
}

document.getElementById('btn-sair').addEventListener('click', sair);

const btnConvite = document.getElementById('btn-convite');
btnConvite.addEventListener('click', async () => {
  const link = linkPublico(resenhaAtual);
  try {
    await navigator.clipboard.writeText(link);
    mensagemPainel.textContent = 'Link copiado! Agora é só mandar pra galera.';
    mensagemPainel.className = 'form-message sucesso';
  } catch {
    mensagemPainel.textContent = `Copie o link: ${link}`;
    mensagemPainel.className = 'form-message';
  }
});

const btnExcluir = document.getElementById('btn-excluir');
btnExcluir.addEventListener('click', async () => {
  const certeza = confirm(`Excluir "${resenhaAtual.nome}"? Isso não pode ser desfeito.`);
  if (!certeza) return;

  btnExcluir.disabled = true;
  try {
    await requisitar(`${API_ORGANIZADOR}/excluir`, {
      method: 'POST',
      body: JSON.stringify({ codigo: codigoAtual }),
    });
    sair();
    mensagemCodigo.textContent = 'Resenha excluída.';
    mensagemCodigo.className = 'form-message sucesso';
  } catch (erro) {
    mensagemPainel.textContent = erro.message;
    mensagemPainel.className = 'form-message erro';
  } finally {
    btnExcluir.disabled = false;
  }
});

/* ================= INÍCIO ================= */

// Se já entrou nesta aba, abre o painel direto (ex: depois de apertar F5)
const codigoSalvo = lerSessao();
if (codigoSalvo) {
  entrar(codigoSalvo).catch(() => salvarSessao(null));
}
