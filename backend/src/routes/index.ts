import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorizeRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { animalController, authController, matchController } from '../controllers';
import * as s from '../schemas';

const routes = Router();
const inst = [authenticate, authorizeRole('INSTITUICAO')];
const adot = [authenticate, authorizeRole('ADOTANTE')];

const verify2FASchema = z.object({
  role: z.enum(['ADOTANTE', 'INSTITUICAO']),
  email: z.string().email(),
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
});

// Auth / perfil
routes.post('/auth/register/adotante', validate({ body: s.registerAdotanteSchema }), authController.registerAdotante);
routes.post('/auth/register/instituicao', validate({ body: s.registerInstituicaoSchema }), authController.registerInstituicao);
routes.post('/auth/login', validate({ body: s.loginSchema }), authController.login);
routes.post('/auth/verify-2fa', validate({ body: verify2FASchema }), authController.verify2FA);
routes.get('/perfil', authenticate, authController.me);
routes.put('/perfil', authenticate, (req, res, next) => {
  const schema = req.user!.role === 'ADOTANTE' ? s.updateAdotanteSchema : s.updateInstituicaoSchema;
  validate({ body: schema })(req, res, next);
}, authController.updateMe);

// Vacinas
routes.get('/vacinas', animalController.listVacinas);

// Animais (listagem/detalhe públicos; escrita só INSTITUICAO)
routes.get('/animais', validate({ query: s.listAnimaisQuery }), animalController.list);
routes.get('/animais/meus', ...inst, animalController.mine);
routes.get('/animais/:id', validate({ params: s.idParam }), animalController.get);
routes.post('/animais', ...inst, validate({ body: s.createAnimalSchema }), animalController.create);
routes.put('/animais/:id', ...inst, validate({ params: s.idParam, body: s.updateAnimalSchema }), animalController.update);
routes.delete('/animais/:id', ...inst, validate({ params: s.idParam }), animalController.remove);
routes.post('/animais/:id/vacinas', ...inst, validate({ params: s.idParam, body: s.addVacinaSchema }), animalController.addVacina);
routes.delete('/animais/:id/vacinas/:vacinaId', ...inst, validate({ params: s.animalVacinaParams }), animalController.removeVacina);

// Matches
routes.post('/matches', ...adot, validate({ body: s.createMatchSchema }), matchController.create);
routes.get('/matches/meus', ...adot, matchController.mine);
routes.patch('/matches/:id/cancelar', ...adot, validate({ params: s.idParam }), matchController.cancel);
routes.get('/matches/instituicao', ...inst, matchController.forInstituicao);
routes.patch('/matches/:id/status', ...inst, validate({ params: s.idParam, body: s.updateMatchStatusSchema }), matchController.changeStatus);

export { routes };