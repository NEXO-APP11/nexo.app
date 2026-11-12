CREATE TABLE IF NOT EXISTS resenhas (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(100) NOT NULL,
    data             DATE         NOT NULL,
    horario          TIME         NOT NULL,
    local            VARCHAR(150) NOT NULL,
    cidade           VARCHAR(100),
    estado           CHAR(2),
    pagamento        VARCHAR(20)  NOT NULL DEFAULT 'gratuito',
    valor            NUMERIC(8,2),
    codigo_organizador VARCHAR(10),
    idade_minima     SMALLINT     NOT NULL DEFAULT 0 CHECK (idade_minima IN (0, 16, 18, 21)),
    limite_pessoas   INTEGER      CHECK (limite_pessoas IS NULL OR limite_pessoas > 0),
    bebidas_comidas  VARCHAR(255),
    descricao        TEXT,
    confirmados      INTEGER      NOT NULL DEFAULT 0 CHECK (confirmados >= 0),
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (limite_pessoas IS NULL OR confirmados <= limite_pessoas)
);

-- Atualiza bancos criados antes de existirem as colunas cidade/estado/pagamento/valor
ALTER TABLE resenhas ADD COLUMN IF NOT EXISTS cidade    VARCHAR(100);
ALTER TABLE resenhas ADD COLUMN IF NOT EXISTS estado    CHAR(2);
ALTER TABLE resenhas ADD COLUMN IF NOT EXISTS pagamento VARCHAR(20) NOT NULL DEFAULT 'gratuito';
ALTER TABLE resenhas ADD COLUMN IF NOT EXISTS valor     NUMERIC(8,2);
ALTER TABLE resenhas ADD COLUMN IF NOT EXISTS codigo_organizador VARCHAR(10);

ALTER TABLE resenhas DROP CONSTRAINT IF EXISTS resenhas_pagamento_check;
ALTER TABLE resenhas ADD CONSTRAINT resenhas_pagamento_check CHECK (
    (pagamento = 'gratuito' AND valor IS NULL) OR
    (pagamento IN ('pix', 'dinheiro', 'cartao') AND valor > 0)
);

CREATE INDEX IF NOT EXISTS idx_resenhas_data ON resenhas (data, horario);

-- Dados de exemplo (só são inseridos se a tabela estiver vazia).
-- As datas são relativas ao dia de hoje para que sempre apareçam como "próximas".
INSERT INTO resenhas (nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao, confirmados)
SELECT * FROM (VALUES
    ('Resenha Sunset',     CURRENT_DATE + 3,  TIME '16:00', 'Praia João Rosa',   'Biguaçu',   'SC', 'pix',      20.00::numeric, 18, 60,   'Água, refrigerante e petiscos', 'Fim de tarde na praia com som ambiente.', 32),
    ('Resenha dos Amigos', CURRENT_DATE + 9,  TIME '20:00', 'Centro',            'Biguaçu',   'SC', 'gratuito', NULL::numeric,  16, 30,   'Pizza e refrigerante',          'Encontro tranquilo para a galera da turma.', 18),
    ('Resenha NEXO',       CURRENT_DATE + 16, TIME '21:00', 'Centro de Eventos', 'São José',  'SC', 'dinheiro', 15.00::numeric, 18, NULL, 'Cada um leva o seu',            'A resenha oficial de lançamento do NEXO.', 45)
) AS exemplo(nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao, confirmados)
WHERE NOT EXISTS (SELECT 1 FROM resenhas);

-- Resenhas antigas que ainda não têm cidade
UPDATE resenhas SET cidade = 'Não informada' WHERE cidade IS NULL;

-- Código do organizador: gerado para resenhas que ainda não têm (exemplos e resenhas antigas).
-- As novas resenhas recebem o código pelo back-end (services/resenhas.service.js).
UPDATE resenhas
SET codigo_organizador = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE codigo_organizador IS NULL;

ALTER TABLE resenhas ALTER COLUMN codigo_organizador SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resenhas_codigo ON resenhas (codigo_organizador);

-- ================= USUÁRIOS (cadastro único por CPF) =================
-- O CPF NÃO é salvo em texto puro:
--   cpf_hash     = HMAC-SHA256 do CPF com o SEGREDO_APP (garante que cada CPF só se cadastre uma vez)
--   cpf_mascarado = só para exibir ao próprio usuário (ex: ***.456.789-**)
-- A senha é salva com scrypt + salt (nunca em texto puro).
CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(100) NOT NULL,
    email            VARCHAR(254) NOT NULL UNIQUE,
    cpf_hash         CHAR(64)     NOT NULL UNIQUE,
    cpf_mascarado    VARCHAR(14)  NOT NULL,
    data_nascimento  DATE         NOT NULL,
    senha_hash       TEXT         NOT NULL,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sessões de login: guardamos só o SHA-256 do token que fica no cookie.
CREATE TABLE IF NOT EXISTS sessoes (
    token_hash  CHAR(64)    PRIMARY KEY,
    usuario_id  INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em   TIMESTAMPTZ NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes (usuario_id);

-- Presenças: cada usuário só confirma uma vez em cada resenha.
CREATE TABLE IF NOT EXISTS presencas (
    resenha_id  INTEGER     NOT NULL REFERENCES resenhas(id) ON DELETE CASCADE,
    usuario_id  INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (resenha_id, usuario_id)
);
