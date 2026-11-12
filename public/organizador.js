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

  preencherFormEdicao(resenha);
  carregarCustos();

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
  document.querySelectorAll('.secao-org').forEach((secao) => (secao.open = false));
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

/* ================= EDITAR INFORMAÇÕES ================= */

const formEditar = document.getElementById('form-editar');
const mensagemEditar = document.getElementById('mensagem-editar');
const atualizarCampoValorEdicao = ligarCampoValor(formEditar, document.getElementById('ed-grupo-valor'));
const atualizarCidadesEdicao = ligarCamposLocal(formEditar, document.getElementById('ed-lista-cidades'));

function preencherFormEdicao(r) {
  const f = formEditar.elements;
  f.nome.value = r.nome;
  f.data.value = r.data;
  f.horario.value = r.horario;
  f.local.value = r.local;
  f.estado.value = r.estado ?? '';
  f.cidade.value = r.cidade && r.cidade !== 'Não informada' ? r.cidade : '';
  atualizarCidadesEdicao(true);
  f.pagamento.value = r.pagamento;
  f.valor.value = r.valor ?? '';
  atualizarCampoValorEdicao();
  f.idade_minima.value = String(r.idade_minima);
  f.limite_pessoas.value = r.limite_pessoas ?? '';
  // Não deixa colocar um limite menor que quem já confirmou
  f.limite_pessoas.min = Math.max(1, r.confirmados);
  f.bebidas_comidas.value = r.bebidas_comidas ?? '';
  f.descricao.value = r.descricao ?? '';
  f.data.min = r.data < hojeISO() ? r.data : hojeISO();
}

formEditar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagemEditar.textContent = '';
  mensagemEditar.className = 'form-message';
  if (!validarNoNavegador(formEditar, mensagemEditar)) return;

  const botao = formEditar.querySelector('[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Salvando…';
  try {
    const dados = Object.fromEntries(new FormData(formEditar));
    const atualizada = await requisitar(`${API_ORGANIZADOR}/atualizar`, {
      method: 'POST',
      body: JSON.stringify({ ...dados, codigo: codigoAtual }),
    });
    mostrarPainel(atualizada);
    mensagemEditar.textContent = 'Alterações salvas ✓';
    mensagemEditar.className = 'form-message sucesso';
  } catch (erro) {
    mensagemEditar.textContent = erro.message;
    mensagemEditar.className = 'form-message erro';
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar alterações';
  }
});

document.getElementById('btn-desfazer').addEventListener('click', () => {
  preencherFormEdicao(resenhaAtual);
  mensagemEditar.textContent = 'Os campos voltaram para o que está salvo.';
  mensagemEditar.className = 'form-message';
});

/* ================= CALCULADORA DE CUSTOS ================= */

const formCalc = document.getElementById('form-calculadora');
const CAMPOS_CUSTO = ['bebidas', 'comida', 'local', 'som', 'outros'];
const btnUsarValor = document.getElementById('btn-usar-valor');
let valorSugerido = 0;

const chaveCustos = () => `nexo:custos:${resenhaAtual.id}`;

function publicoPadrao() {
  return resenhaAtual.limite_pessoas || Math.max(resenhaAtual.confirmados, 1);
}

// Os gastos ficam só neste navegador (não são dados sensíveis e não vão para o servidor)
function carregarCustos() {
  let salvo = {};
  try {
    salvo = JSON.parse(localStorage.getItem(chaveCustos())) ?? {};
  } catch {
    salvo = {};
  }
  for (const campo of CAMPOS_CUSTO) formCalc.elements[campo].value = salvo[campo] ?? '';
  formCalc.elements.publico.value = salvo.publico || publicoPadrao();
  calcular();
}

function salvarCustos() {
  const dados = {};
  for (const campo of [...CAMPOS_CUSTO, 'publico']) dados[campo] = formCalc.elements[campo].value;
  try {
    localStorage.setItem(chaveCustos(), JSON.stringify(dados));
  } catch {
    /* navegador sem armazenamento: ignora */
  }
}

function numeroDoCampo(campo) {
  const valor = Number(formCalc.elements[campo].value);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

function calcular() {
  const total = CAMPOS_CUSTO.reduce((soma, campo) => soma + numeroDoCampo(campo), 0);
  const publico = Math.max(1, Math.floor(numeroDoCampo('publico')) || 1);
  const porPessoa = total / publico;
  const entrada = resenhaAtual.pagamento === 'gratuito' ? 0 : Number(resenhaAtual.valor) || 0;
  const arrecadacao = entrada * publico;
  const saldo = arrecadacao - total;

  document.getElementById('calc-total').textContent = moeda(total);
  document.getElementById('calc-por-pessoa').textContent = moeda(porPessoa);
  document.getElementById('calc-arrecadacao').textContent = moeda(arrecadacao);
  document.getElementById('calc-arrecadacao-rotulo').textContent =
    entrada > 0 ? `arrecadação (${publico} × ${moeda(entrada)})` : 'arrecadação (resenha gratuita)';

  const caixaSaldo = document.getElementById('calc-saldo-box');
  document.getElementById('calc-saldo').textContent = moeda(Math.abs(saldo));
  document.getElementById('calc-saldo-rotulo').textContent = saldo >= 0 ? 'lucro / sobra' : 'prejuízo';
  caixaSaldo.classList.toggle('positivo', total > 0 && saldo >= 0);
  caixaSaldo.classList.toggle('negativo', saldo < 0);

  // Sugestão de preço: arredonda para cima, em reais inteiros
  valorSugerido = Math.ceil(porPessoa);
  const sugestao = document.getElementById('calc-sugestao');
  if (total === 0) {
    sugestao.textContent = 'Preencha os gastos acima para ver o resultado.';
  } else if (entrada >= porPessoa) {
    sugestao.textContent = `✅ Com a entrada de ${moeda(entrada)} os custos ficam cobertos.`;
  } else {
    const empate =
      entrada > 0 ? ` Com a entrada atual, você precisaria de ${Math.ceil(total / entrada)} pessoas para empatar.` : '';
    sugestao.textContent = `⚠️ Para não ter prejuízo, cobre pelo menos ${moeda(valorSugerido)} por pessoa.${empate}`;
  }
  btnUsarValor.disabled = total === 0 || entrada >= porPessoa;
  btnUsarValor.textContent = `Usar ${moeda(valorSugerido)} como entrada`;
}

formCalc.addEventListener('input', () => {
  calcular();
  salvarCustos();
});
formCalc.addEventListener('submit', (e) => e.preventDefault());

document.getElementById('btn-limpar-calc').addEventListener('click', () => {
  try {
    localStorage.removeItem(chaveCustos());
  } catch {
    /* ignora */
  }
  carregarCustos();
});

// Leva o valor sugerido para o formulário de edição (o organizador ainda precisa salvar)
btnUsarValor.addEventListener('click', () => {
  const f = formEditar.elements;
  if (f.pagamento.value === 'gratuito') f.pagamento.value = 'pix';
  atualizarCampoValorEdicao();
  f.valor.value = valorSugerido.toFixed(2);
  document.getElementById('secao-editar').open = true;
  mensagemEditar.textContent = `Entrada de ${moeda(valorSugerido)} preenchida. Confira e clique em "Salvar alterações".`;
  mensagemEditar.className = 'form-message sucesso';
  f.valor.focus();
});

/* ================= INÍCIO ================= */

// Se já entrou nesta aba, abre o painel direto (ex: depois de apertar F5)
const codigoSalvo = lerSessao();
if (codigoSalvo) {
  entrar(codigoSalvo).catch(() => salvarSessao(null));
}
