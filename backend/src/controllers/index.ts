import type { Request, Response } from 'express';
import { authService } from '../services/authService';
import { animalService } from '../services/animalService';
import { matchService } from '../services/matchService';

const uid = (req: Request) => req.user!.id;

export const authController = {
  registerAdotante: async (req: Request, res: Response) => res.status(201).json(await authService.registerAdotante(req.body)),
  registerInstituicao: async (req: Request, res: Response) => res.status(201).json(await authService.registerInstituicao(req.body)),
  login: async (req: Request, res: Response) => res.json(await authService.login(req.body)),
  verify2FA: async (req: Request, res: Response) => res.json(await authService.verify2FA(req.body)),
  me: async (req: Request, res: Response) => res.json(await authService.getProfile(uid(req), req.user!.role)),
  updateMe: async (req: Request, res: Response) =>
    res.json(
      req.user!.role === 'ADOTANTE'
        ? await authService.updateAdotante(uid(req), req.body)
        : await authService.updateInstituicao(uid(req), req.body),
    ),
};

export const animalController = {
  list: async (req: Request, res: Response) => res.json(await animalService.listAvailable(req.query as never)),
  mine: async (req: Request, res: Response) => res.json(await animalService.listByInstituicao(uid(req))),
  get: async (req: Request, res: Response) => res.json(await animalService.get(Number(req.params.id))),
  create: async (req: Request, res: Response) => res.status(201).json(await animalService.create(uid(req), req.body)),
  update: async (req: Request, res: Response) => res.json(await animalService.update(uid(req), Number(req.params.id), req.body)),
  remove: async (req: Request, res: Response) => {
    await animalService.remove(uid(req), Number(req.params.id));
    res.status(204).send();
  },
  addVacina: async (req: Request, res: Response) =>
    res.status(201).json(await animalService.addVacina(uid(req), Number(req.params.id), req.body)),
  removeVacina: async (req: Request, res: Response) =>
    res.json(await animalService.removeVacina(uid(req), Number(req.params.id), Number(req.params.vacinaId))),
  listVacinas: async (_req: Request, res: Response) => res.json(await animalService.listVacinas()),
};

export const matchController = {
  create: async (req: Request, res: Response) => res.status(201).json(await matchService.request(uid(req), req.body)),
  mine: async (req: Request, res: Response) => res.json(await matchService.listByAdotante(uid(req))),
  forInstituicao: async (req: Request, res: Response) => res.json(await matchService.listByInstituicao(uid(req))),
  changeStatus: async (req: Request, res: Response) =>
    res.json(await matchService.changeStatus(uid(req), Number(req.params.id), req.body)),
  cancel: async (req: Request, res: Response) => res.json(await matchService.cancelByAdotante(uid(req), Number(req.params.id))),
};