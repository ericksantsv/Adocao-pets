import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const instituicaoRepository = {
  create: (data: Prisma.InstituicaoCreateInput) => prisma.instituicao.create({ data }),
  findById: (id: number) => prisma.instituicao.findUnique({ where: { id } }),
  findByEmail: (email: string) => prisma.instituicao.findUnique({ where: { email } }),
  findByCnpj: (cnpj: string) => prisma.instituicao.findUnique({ where: { cnpj } }),
  update: (id: number, data: Prisma.InstituicaoUpdateInput) => prisma.instituicao.update({ where: { id }, data }),
};

export const adotanteRepository = {
  create: (data: Prisma.AdotanteCreateInput) => prisma.adotante.create({ data }),
  findById: (id: number) => prisma.adotante.findUnique({ where: { id } }),
  findByEmail: (email: string) => prisma.adotante.findUnique({ where: { email } }),
  findByCpf: (cpf: string) => prisma.adotante.findUnique({ where: { cpf } }),
  update: (id: number, data: Prisma.AdotanteUpdateInput) => prisma.adotante.update({ where: { id }, data }),
};
