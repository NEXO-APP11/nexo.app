import {pool} from '../config/db.js'

class FerramentasServices {

    async getAll() {
        const resultado = await pool.query(
            'SELECT * FROM ferramentas'
        );

        return resultado.rows;
    } 

    async create(id, modelo, marca, descricao, preco) {
        const resultado = await pool.query(
            `INSERT INTO ferramentas
            ( modelo, marca, descricao, preco) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING* `,
         [modelo, marca, descricao, preco]
        );

        return resultado.rows;
    }
}
    export default new FerramentasServices();