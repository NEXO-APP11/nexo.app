// Erro de regra de negócio com o status HTTP que deve ser devolvido ao cliente.
export class AppError extends Error {
  constructor(mensagem, status = 400, detalhes) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.detalhes = detalhes;
  }
}
