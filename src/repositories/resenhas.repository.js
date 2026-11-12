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

  /**
   * Registra a presença do usuário numa TRANSAÇÃO (tudo ou nada):
   * 1) grava em "presencas" (a chave primária impede confirmar 2 vezes)
   * 2) soma +1 em "confirmados" só se ainda houver vaga
   * Retorna { status: 'ok' | 'duplicada' | 'lotada', resenha }
   */
  async registrarPresenca(resenhaId, usuarioId) {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');

      const inserida = await cliente.query(
        `INSERT INTO presencas (resenha_id, usuario_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [resenhaId, usuarioId]
      );
      if (inserida.rowCount === 0) {
        await cliente.query('ROLLBACK');
        return { status: 'duplicada' };
      }

      const { rows } = await cliente.query(
        `UPDATE resenhas
         SET confirmados = confirmados + 1
         WHERE id = $1 AND (limite_pessoas IS NULL OR confirmados < limite_pessoas)
         RETURNING ${CAMPOS}`,
        [resenhaId]
      );
      if (rows.length === 0) {
        await cliente.query('ROLLBACK');
        return { status: 'lotada' };
      }

      await cliente.query('COMMIT');
      return { status: 'ok', resenha: rows[0] };
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }

  // O código do organizador nunca sai nas consultas públicas, só nestas duas.
  async buscarPorCodigo(codigo) {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS}, codigo_organizador FROM resenhas WHERE codigo_organizador = $1`,
      [codigo]
    );
    return rows[0] ?? null;
  }

  async atualizarPorCodigo(codigo, { nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao }) {
    const { rows } = await pool.query(
      `UPDATE resenhas SET
         nome = $2, data = $3, horario = $4, local = $5, cidade = $6, estado = $7,
         pagamento = $8, valor = $9, idade_minima = $10, limite_pessoas = $11,
         bebidas_comidas = $12, descricao = $13
       WHERE codigo_organizador = $1
       RETURNING ${CAMPOS}, codigo_organizador`,
      [codigo, nome, data, horario, local, cidade, estado, pagamento, valor, idade_minima, limite_pessoas, bebidas_comidas, descricao]
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
