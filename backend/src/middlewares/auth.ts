import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { ROLES, type Role } from '../lib/constants';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Token não informado. Faça login.');

  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as { id: number; role: Role };
    if (!ROLES.includes(payload.role)) throw new Error('role inválida');
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'Token inválido ou expirado. Faça login novamente.');
  }
}

export const authorizeRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'Não autenticado.');
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, `Acesso restrito ao perfil: ${roles.join(' ou ')}.`);
    }
    next();
  };
