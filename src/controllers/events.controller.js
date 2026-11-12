import { eventsService } from '../services/events.service.js';
import { success } from '../utils/response.js';
import { validateEvent, validateId } from '../utils/validation.js';

export const eventsController = {
  async create(req, res) {
    const event = await eventsService.create(validateEvent(req.body), req.user.id);
    return success(res, 201, 'Encontro criado com sucesso', event);
  },

  async list(_req, res) {
    return success(res, 200, 'Encontros consultados com sucesso', await eventsService.list());
  },

  async get(req, res) {
    return success(res, 200, 'Encontro consultado com sucesso', await eventsService.get(validateId(req.params.id)));
  },

  async update(req, res) {
    const event = await eventsService.update(
      validateId(req.params.id), req.user.id, validateEvent(req.body, { partial: true }),
    );
    return success(res, 200, 'Encontro atualizado com sucesso', event);
  },

  async remove(req, res) {
    await eventsService.remove(validateId(req.params.id), req.user.id);
    return success(res, 200, 'Encontro excluído com sucesso', {});
  },

  async join(req, res) {
    const participant = await eventsService.join(validateId(req.params.id), req.user.id);
    return success(res, 201, 'Presença confirmada com sucesso', participant);
  },

  async leave(req, res) {
    const participant = await eventsService.leave(validateId(req.params.id), req.user.id);
    return success(res, 200, 'Presença cancelada com sucesso', participant);
  },

  async participants(req, res) {
    const participants = await eventsService.participants(validateId(req.params.id));
    return success(res, 200, 'Participantes consultados com sucesso', participants);
  },
};
