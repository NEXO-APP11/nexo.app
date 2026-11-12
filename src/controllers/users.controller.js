import { usersService } from '../services/users.service.js';
import { success } from '../utils/response.js';
import { validateLogin, validateRegistration, validateUserUpdate } from '../utils/validation.js';

export const usersController = {
  async register(req, res) {
    const user = await usersService.register(validateRegistration(req.body));
    return success(res, 201, 'Usuário cadastrado com sucesso', user);
  },

  async login(req, res) {
    const result = await usersService.login(validateLogin(req.body));
    return success(res, 200, 'Login realizado com sucesso', result);
  },

  async me(req, res) {
    return success(res, 200, 'Usuário consultado com sucesso', await usersService.getMe(req.user.id));
  },

  async updateMe(req, res) {
    const user = await usersService.updateMe(req.user.id, validateUserUpdate(req.body));
    return success(res, 200, 'Usuário atualizado com sucesso', user);
  },
};
