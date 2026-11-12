import { eventsModel } from '../models/events.model.js';
import { HttpError } from '../utils/http-error.js';

export const eventsService = {
  create(event, creatorId) {
    return eventsModel.create({ ...event, creator_id: creatorId });
  },

  list() {
    return eventsModel.list();
  },

  async get(id) {
    const event = await eventsModel.findById(id);
    if (!event) throw new HttpError(404, 'Encontro não encontrado');
    return event;
  },

  async update(id, userId, updates) {
    const event = await this.get(id);
    if (String(event.creator_id) !== String(userId)) throw new HttpError(403, 'Somente o criador pode editar este encontro');
    const newLimit = Object.hasOwn(updates, 'max_participants') ? updates.max_participants : event.max_participants;
    if (newLimit !== null && newLimit < event.participant_count) {
      throw new HttpError(409, 'O limite não pode ser menor que as confirmações atuais');
    }
    return eventsModel.updateById(id, updates);
  },

  async remove(id, userId) {
    const event = await this.get(id);
    if (String(event.creator_id) !== String(userId)) throw new HttpError(403, 'Somente o criador pode excluir este encontro');
    await eventsModel.deleteById(id);
  },

  async join(id, userId) {
    const result = await eventsModel.join(id, userId);
    if (result.missingEvent) throw new HttpError(404, 'Encontro não encontrado');
    if (result.duplicate) throw new HttpError(409, 'Você já confirmou presença neste encontro');
    if (result.full) throw new HttpError(409, 'O encontro atingiu o limite de participantes');
    return result.participant;
  },

  async leave(id, userId) {
    const event = await eventsModel.findById(id);
    if (!event) throw new HttpError(404, 'Encontro não encontrado');
    const participant = await eventsModel.leave(id, userId);
    if (!participant) throw new HttpError(404, 'Você não confirmou presença neste encontro');
    return participant;
  },

  async participants(id) {
    await this.get(id);
    return eventsModel.listParticipants(id);
  },
};
