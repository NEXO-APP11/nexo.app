CREATE TABLE IF NOT EXISTS resenhas (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(100) NOT NULL,
    data             DATE         NOT NULL,
    horario          TIME         NOT NULL,
    local            VARCHAR(150) NOT NULL,
    idade_minima     SMALLINT     NOT NULL DEFAULT 0 CHECK (idade_minima IN (0, 16, 18, 21)),
    limite_pessoas   INTEGER      CHECK (limite_pessoas IS NULL OR limite_pessoas > 0),
    bebidas_comidas  VARCHAR(255),
    descricao        TEXT,
    confirmados      INTEGER      NOT NULL DEFAULT 0 CHECK (confirmados >= 0),
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (limite_pessoas IS NULL OR confirmados <= limite_pessoas)
);

CREATE INDEX IF NOT EXISTS idx_resenhas_data ON resenhas (data, horario);

-- Dados de exemplo (só são inseridos se a tabela estiver vazia).
-- As datas são relativas ao dia de hoje para que sempre apareçam como "próximas".
INSERT INTO resenhas (nome, data, horario, local, idade_minima, limite_pessoas, bebidas_comidas, descricao, confirmados)
SELECT * FROM (VALUES
    ('Resenha Sunset',     CURRENT_DATE + 3,  TIME '16:00', 'Praia João Rosa',   18, 60,   'Água, refrigerante e petiscos', 'Fim de tarde na praia com som ambiente.', 32),
    ('Resenha dos Amigos', CURRENT_DATE + 9,  TIME '20:00', 'Centro - Biguaçu',  16, 30,   'Pizza e refrigerante',          'Encontro tranquilo para a galera da turma.', 18),
    ('Resenha NEXO',       CURRENT_DATE + 16, TIME '21:00', 'São José - SC',     18, NULL, 'Cada um leva o seu',            'A resenha oficial de lançamento do NEXO.', 45)
) AS exemplo(nome, data, horario, local, idade_minima, limite_pessoas, bebidas_comidas, descricao, confirmados)
WHERE NOT EXISTS (SELECT 1 FROM resenhas);
