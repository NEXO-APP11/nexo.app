// CAMADA 4 — Repository: único lugar que conversa com o banco de dados (SQL).
import { pool } from '../config/db.js';

// Formata data e horário no próprio SQL para evitar problemas de fuso horário no JavaScript.
const CAMPOS = `
  id, nome,
  to_char(data, 'YYYY-MM-DD') AS data,
  to_char(horario, 'HH24:MI') AS horario,
  local, cidade, estado, pagamento, valor::float8 AS valor, idade_minima, limite_pessoas, bebidas_comidas, descricao, confirmados
`;

class ResenhasRepository {
  async listarProximas() {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS} FROM resenhas
       WHERE data >= CURRENT_DATE
       ORDER BY data, horario`
    );
    return rows;
  }

  async buscarPorId(id) {
    const { rows } = await pool.query(`SELECT ${CAMPOS} FROM resenhas WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async inserir({ codigo_organizador, nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao }) {
    const { rows } = await pool.query(
      `INSERT INTO resenhas
         (codigo_organizador, nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${CAMPOS}, codigo_organizador`,
      [codigo_organizador, nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao]
    );
    return rows[0];
  }

  // Incrementa "confirmados" de forma atômica. Retorna null se não existir ou se estiver lotada.
  async incrementarConfirmados(id) {
    const { rows } = await pool.query(
      `UPDATE resenhas
       SET confirmados = confirmados + 1
       WHERE id = $1 AND (limite_pessoas IS NULL OR confirmados < limite_pessoas)
       RETURNING ${CAMPOS}`,
      [id]
    );
    return rows[0] ?? null;
  }

  // O código do organizador nunca sai nas consultas públicas, só nestas duas.
  async buscarPorCodigo(codigo) {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS}, codigo_organizador FROM resenhas WHERE codigo_organizador = $1`,
      [codigo]
    );
    return rows[0] ?? null;
  }

  async removerPorCodigo(codigo) {
    const { rowCount } = await pool.query('DELETE FROM resenhas WHERE codigo_organizador = $1', [codigo]);
    return rowCount > 0;
  }
}

export const resenhasRepository = new ResenhasRepository();
export default resenhasRepository;
