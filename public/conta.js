// Página de conta: login, cadastro e perfil.
// Usa requisitar(), carregarSessao(), sessaoAtual e validarNoNavegador() de comum.js.

const telaAuth = document.getElementById('tela-auth');
const telaPerfil = document.getElementById('tela-perfil');
const formEntrar = document.getElementById('painel-entrar');
const formCadastro = document.getElementById('painel-cadastro');
const abaEntrar = document.getElementById('aba-entrar');
const abaCadastro = document.getElementById('aba-cadastro');

/* ================= PARA ONDE VOLTAR DEPOIS DO LOGIN ================= */

// Segurança (open redirect): só aceita caminhos do PRÓPRIO site, como "/?resenha=3".
// Bloqueia "https://site-falso.com" e "//site-falso.com".
function destinoSeguro() {
  const voltar = new URLSearchParams(location.search).get('voltar');
  if (!voltar || !voltar.startsWith('/') || voltar.startsWith('//') || voltar.includes('\\')) return null;
  const url = new URL(voltar, location.origin);
  return url.origin === location.origin ? url.pathname + url.search : null;
}

function depoisDeEntrar() {
  const destino = destinoSeguro();
  if (destino) location.href = destino;
  else mostrarPerfil();
}

/* ================= ABAS ================= */

function trocarAba(cadastro) {
  abaEntrar.setAttribute('aria-selected', String(!cadastro));
  abaCadastro.setAttribute('aria-selected', String(cadastro));
  abaEntrar.tabIndex = cadastro ? -1 : 0;
  abaCadastro.tabIndex = cadastro ? 0 : -1;
  formEntrar.hidden = cadastro;
  formCadastro.hidden = !cadastro;
}

abaEntrar.addEventListener('click', () => trocarAba(false));
abaCadastro.addEventListener('click', () => trocarAba(true));
// Setas do teclado trocam de aba (acessibilidade)
for (const aba of [abaEntrar, abaCadastro]) {
  aba.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const cadastro = aba === abaEntrar;
    trocarAba(cadastro);
    (cadastro ? abaCadastro : abaEntrar).focus();
  });
}

/* ================= MOSTRAR SENHA ================= */

document.querySelectorAll('.mostrar-senha').forEach((botao) => {
  botao.addEventListener('click', () => {
    const campo = botao.previousElementSibling;
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.setAttribute('aria-pressed', String(mostrar));
    botao.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
  });
});

/* ================= MÁSCARA E VALIDAÇÃO DO CPF ================= */

function formatarCpf(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

// Mesmo algoritmo do servidor (o servidor confere de novo — nunca confie só no navegador)
function cpfValido(valor) {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (q) => {
    let soma = 0;
    for (let i = 0; i < q; i++) soma += Number(cpf[i]) * (q + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

const campoCpf = formCadastro.elements.cpf;
campoCpf.addEventListener('input', () => {
  campoCpf.value = formatarCpf(campoCpf.value);
  const completo = campoCpf.value.length === 14;
  campoCpf.setCustomValidity(completo && !cpfValido(campoCpf.value) ? 'CPF inválido. Confira os números.' : '');
});

// O campo de login aceita e-mail ou CPF: se a pessoa digita só números, aplica a máscara
const campoUsuario = formEntrar.elements.usuario;
campoUsuario.addEventListener('input', () => {
  if (/^[\d.\-]+$/.test(campoUsuario.value)) campoUsuario.value = formatarCpf(campoUsuario.value);
});

/* ================= FORÇA DA SENHA ================= */

const campoSenha = formCadastro.elements.senha;
const campoSenha2 = formCadastro.elements.senha2;
const barraForca = document.getElementById('forca-barra');
const textoForca = document.getElementById('forca-texto');

function forcaDaSenha(senha) {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return pontos; // 0 a 5
}

campoSenha.addEventListener('input', () => {
  const senha = campoSenha.value;
  const pontos = forcaDaSenha(senha);
  const niveis = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte'];
  barraForca.style.width = `${(pontos / 5) * 100}%`;
  barraForca.dataset.nivel = pontos <= 1 ? 'fraca' : pontos <= 3 ? 'media' : 'forte';
  textoForca.textContent = senha ? `Força: ${niveis[pontos]}` : 'Mínimo 8 caracteres, com letras e números.';

  const temLetraENumero = /[A-Za-z]/.test(senha) && /\d/.test(senha);
  campoSenha.setCustomValidity(senha && !temLetraENumero ? 'Use letras e números.' : '');
  conferirSenhas();
});

function conferirSenhas() {
  campoSenha2.setCustomValidity(
    campoSenha2.value && campoSenha2.value !== campoSenha.value ? 'As senhas não são iguais.' : ''
  );
}
campoSenha2.addEventListener('input', conferirSenhas);

// Data de nascimento não pode ser no futuro
formCadastro.elements.data_nascimento.max = hojeISO();

/* ================= ENVIO DOS FORMULÁRIOS ================= */

async function enviar(form, url, montarDados, mensagemId, textoBotao) {
  const mensagem = document.getElementById(mensagemId);
  mensagem.className = 'form-message';
  mensagem.textContent = '';
  if (!validarNoNavegador(form, mensagem)) return;

  const botao = form.querySelector('[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Aguarde…';
  try {
    await requisitar(url, { method: 'POST', body: JSON.stringify(montarDados()) });
    form.reset();
    await carregarSessao();
    depoisDeEntrar();
  } catch (erro) {
    mensagem.textContent = erro.message;
    mensagem.className = 'form-message erro';
  } finally {
    botao.disabled = false;
    botao.textContent = textoBotao;
  }
}

formEntrar.addEventListener('submit', (e) => {
  e.preventDefault();
  enviar(
    formEntrar,
    '/api/auth/login',
    () => ({ usuario: formEntrar.elements.usuario.value.trim(), senha: formEntrar.elements.senha.value }),
    'mensagem-entrar',
    'Entrar'
  );
});

formCadastro.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = formCadastro.elements;
  enviar(
    formCadastro,
    '/api/auth/cadastro',
    () => ({
      nome: f.nome.value.trim(),
      email: f.email.value.trim(),
      cpf: f.cpf.value,
      data_nascimento: f.data_nascimento.value,
      senha: f.senha.value,
      aceite: f.aceite.checked,
    }),
    'mensagem-cadastro',
    'Criar conta'
  );
});

/* ================= PERFIL ================= */

function mostrarPerfil() {
  const { usuario, presencas } = sessaoAtual;
  document.getElementById('perfil-ola').textContent = `Olá, ${usuario.nome.split(' ')[0]}!`;
  document.getElementById('perfil-email').textContent = usuario.email;
  document.getElementById('perfil-cpf').textContent = usuario.cpf_mascarado;
  document.getElementById('perfil-nascimento').textContent = paraData(usuario.data_nascimento).toLocaleDateString('pt-BR');
  document.getElementById('perfil-presencas').textContent = presencas.length;
  telaAuth.hidden = true;
  telaPerfil.hidden = false;
}

document.getElementById('btn-sair').addEventListener('click', async () => {
  try {
    await requisitar('/api/auth/sair', { method: 'POST' });
  } finally {
    await carregarSessao();
    telaPerfil.hidden = true;
    telaAuth.hidden = false;
    trocarAba(false);
  }
});

/* ================= INÍCIO ================= */

carregarSessao().then(() => {
  if (sessaoAtual.usuario) depoisDeEntrar();
  else telaAuth.hidden = false;
});
