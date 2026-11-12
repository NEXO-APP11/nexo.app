# NEXO

Encontre uma resenha. Crie a sua.

O NEXO é uma aplicação web para organizar e encontrar encontros, festas e resenhas.
Projeto acadêmico SENAI.

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puro (pasta `public/`)
- **Back-end:** Node.js + Express 5 (pasta `src/`)
- **Banco de dados:** PostgreSQL

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo e ajuste com os dados do seu PostgreSQL:

   ```bash
   cp .env.example .env
   ```

3. Crie o banco de dados (uma vez só) — pelo pgAdmin ou pelo terminal:

   ```sql
   CREATE DATABASE nexo;
   ```

4. Crie a tabela e os dados de exemplo:

   ```bash
   npm run db:init
   ```

5. Inicie o servidor:

   ```bash
   npm run dev
   ```

   Acesse **http://localhost:3000**.

## Estrutura

```
public/                       Front-end (servido pelo Express)
  index.html
  style.css
  app.js                      Busca e cria resenhas pela API
src/
  server.js                   Configuração do Express e tratamento de erros
  config/db.js                Conexão com o PostgreSQL
  database/schema.sql         Tabela "resenhas" + dados de exemplo
  database/init.js            Script do "npm run db:init" (cria o banco e a tabela)
  routes/                     1ª camada: liga URL + método HTTP ao controller
  controllers/                2ª camada: lê a requisição e monta a resposta HTTP
  services/                   3ª camada: regras de negócio (validação, lotação, 404/409)
  repositories/               4ª camada: consultas SQL no PostgreSQL
  errors/AppError.js          Erro de negócio com status HTTP
  validation/                 Validação dos dados recebidos
```

Fluxo de uma requisição: `routes → controllers → services → repositories → banco`.

## API

| Método | Rota                          | Descrição                          |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/api/resenhas`               | Lista as próximas resenhas         |
| GET    | `/api/resenhas/:id`           | Detalhes de uma resenha            |
| POST   | `/api/resenhas`               | Cria uma resenha                   |
| POST   | `/api/resenhas/:id/presenca`  | Confirma presença (respeita limite)|
| DELETE | `/api/resenhas/:id`           | Remove uma resenha                 |

Exemplo de corpo para criar uma resenha:

```json
{
  "nome": "Resenha da Galera",
  "data": "2026-12-20",
  "horario": "20:00",
  "local": "Chácara do João",
  "idade_minima": 18,
  "limite_pessoas": 50,
  "bebidas_comidas": "Refrigerante e pizza",
  "descricao": "Traga seu violão!"
}
```

Campos obrigatórios: `nome`, `data`, `horario` e `local`.
`idade_minima` aceita `0` (sem restrição), `16`, `18` ou `21`.
