import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Schemas = { body?: ZodTypeAny; params?: ZodTypeAny; query?: ZodTypeAny };

/** Valida e substitui body/params/query pelos dados já parseados (ZodError cai no errorHandler). */
export const validate = (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
  if (schemas.body) req.body = schemas.body.parse(req.body);
  if (schemas.params) req.params = schemas.params.parse(req.params);
  if (schemas.query) req.query = schemas.query.parse(req.query);
  next();
};
