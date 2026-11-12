import bcrypt from 'bcryptjs';
import { usersModel } from '../models/users.model.js';
import { createAccessToken } from '../config/token.js';
import { HttpError } from '../utils/http-error.js';

const passwordRounds = 12;

function publicUser(user) {
  const { id, name, email, created_at } = user;
  return { id, name, email, created_at };
}

export const usersService = {
  async register({ name, email, password }) {
    const passwordHash = await bcrypt.hash(password, passwordRounds);
    try {
      return publicUser(await usersModel.create({ name, email, password: passwordHash }));
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'Este e-mail já está cadastrado');
      throw error;
    }
  },

  async login({ email, password }) {
    const user = await usersModel.findByEmail(email);
    const matches = user ? await bcrypt.compare(password, user.password) : false;
    if (!matches) throw new HttpError(401, 'E-mail ou senha inválidos');
    const safeUser = publicUser(user);
    return { user: safeUser, token: createAccessToken(user), token_type: 'Bearer' };
  },

  async getMe(id) {
    const user = await usersModel.findById(id);
    if (!user) throw new HttpError(404, 'Usuário não encontrado');
    return publicUser(user);
  },

  async updateMe(id, updates) {
    const data = { ...updates };
    if (data.password) data.password = await bcrypt.hash(data.password, passwordRounds);
    try {
      const user = await usersModel.updateById(id, data);
      if (!user) throw new HttpError(404, 'Usuário não encontrado');
      return publicUser(user);
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'Este e-mail já está cadastrado');
      throw error;
    }
  },
};
