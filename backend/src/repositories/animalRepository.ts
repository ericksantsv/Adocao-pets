import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const include = {
  instituicao: { select: { id: true, nome: true, cidade: true, telefone: true, email: true } },
  vacinas: { include: { vacina: true }, orderBy: { dataAplicacao: 'desc' } },
  // usado para calcular "disponivel" (RN04)
  matches: { where: { status: 'APROVADO' }, select: { id: true } },
} satisfies Prisma.AnimalInclude;

export type AnimalWithRelations = Prisma.AnimalGetPayload<{ include: typeof include }>;

export const animalRepository = {
  list: (where: Prisma.AnimalWhereInput = {}) =>
    prisma.animal.findMany({ where, include, orderBy: { criadoEm: 'desc' } }),
  findById: (id: number) => prisma.animal.findUnique({ where: { id }, include }),
  create: (data: Prisma.AnimalUncheckedCreateInput) => prisma.animal.create({ data, include }),
  update: (id: number, data: Prisma.AnimalUpdateInput) => prisma.animal.update({ where: { id }, data, include }),
  delete: (id: number) => prisma.animal.delete({ where: { id } }),
};

export const vacinaRepository = {
  list: () => prisma.vacina.findMany({ orderBy: { nome: 'asc' } }),
  findById: (id: number) => prisma.vacina.findUnique({ where: { id } }),
  findApplied: (idAnimal: number, idVacina: number) =>
    prisma.animalVacina.findUnique({ where: { idAnimal_idVacina: { idAnimal, idVacina } } }),
  apply: (idAnimal: number, idVacina: number, dataAplicacao: Date) =>
    prisma.animalVacina.create({ data: { idAnimal, idVacina, dataAplicacao } }),
  remove: (idAnimal: number, idVacina: number) =>
    prisma.animalVacina.delete({ where: { idAnimal_idVacina: { idAnimal, idVacina } } }),
};
