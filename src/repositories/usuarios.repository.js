// CAMADA 4 — Repository de usuários e sessões (SQL).
import { pool } from '../config/db.js';

// Campos que podem sair do banco para o resto do sistema (sem senha, sem hash do CPF)
const CAMPOS_PUBLICOS = `
  u.id, u.nome, u.email, u.cpf_mascarado,
  to_char(u.data_nascimento, 'YYYY-MM-DD') AS data_nascimento
`;

class UsuariosRepository {
  async inserir({ nome, email, cpf_hash, cpf_mascarado, data_nascimento, senha_hash }) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios AS u (nome, email, cpf_hash, cpf_mascarado, data_nascimento, senha_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${CAMPOS_PUBLICOS}`,
      [nome, email, cpf_hash, cpf_mascarado, data_nascimento, senha_hash]
    );
    return rows[0];
  }

  // Usado só no login: é o único lugar que lê o senha_hash
  async buscarParaLogin({ email, cpf_hash }) {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS}, u.senha_hash FROM usuarios u
       WHERE ($1::text IS NOT NULL AND u.email = $1) OR ($2::text IS NOT NULL AND u.cpf_hash = $2)`,
      [email ?? null, cpf_hash ?? null]
    );
    return rows[0] ?? null;
  }

  /* ---------- Sessões ---------- */

  async criarSessao(token_hash, usuario_id, expira_em) {
    await pool.query(
      'INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)',
      [token_hash, usuario_id, expira_em]
    );
  }

  async buscarPorSessao(token_hash) {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS} FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = $1 AND s.expira_em > NOW()`,
      [token_hash]
    );
    return rows[0] ?? null;
  }

  async removerSessao(token_hash) {
    await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [token_hash]);
  }

  async removerSessoesExpiradas() {
    await pool.query('DELETE FROM sessoes WHERE expira_em <= NOW()');
  }

  async idsDasPresencas(usuario_id) {
    const { rows } = await pool.query('SELECT resenha_id FROM presencas WHERE usuario_id = $1', [usuario_id]);
    return rows.map((r) => r.resenha_id);
  }
}

export const usuariosRepository = new UsuariosRepository();
export default usuariosRepository;
