import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const include = {
  animal: {
    select: {
      id: true,
      nome: true,
      raca: true,
      foto: true,
      idInstituicao: true,
      instituicao: { select: { id: true, nome: true, telefone: true } },
    },
  },
  adotante: { select: { id: true, nome: true, email: true, telefone: true, possuiPets: true, qtdPets: true } },
} satisfies Prisma.MatchInclude;

export const matchRepository = {
  create: (data: Prisma.MatchUncheckedCreateInput) => prisma.match.create({ data, include }),
  findById: (id: number) => prisma.match.findUnique({ where: { id }, include }),
  listByAdotante: (idAdotante: number) =>
    prisma.match.findMany({ where: { idAdotante }, include, orderBy: { criadoEm: 'desc' } }),
  listByInstituicao: (idInstituicao: number) =>
    prisma.match.findMany({ where: { animal: { idInstituicao } }, include, orderBy: { criadoEm: 'desc' } }),
  hasApproved: async (idAnimal: number) => (await prisma.match.count({ where: { idAnimal, status: 'APROVADO' } })) > 0,
  findActive: (idAnimal: number, idAdotante: number) =>
    prisma.match.findFirst({ where: { idAnimal, idAdotante, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } } }),
  updateStatus: (id: number, status: string, dataVisita?: Date) =>
    prisma.match.update({ where: { id }, data: { status, ...(dataVisita && { dataVisita }) }, include }),

  /**
   * Aprova o match dentro de uma transação, garantindo (RN04) que nenhum outro
   * match do mesmo animal esteja APROVADO. Retorna null em caso de conflito.
   */
  approveExclusively: (id: number, idAnimal: number, dataVisita?: Date) =>
    prisma.$transaction(async (tx) => {
      const others = await tx.match.count({ where: { idAnimal, status: 'APROVADO', NOT: { id } } });
      if (others > 0) return null;
      return tx.match.update({
        where: { id },
        data: { status: 'APROVADO', ...(dataVisita && { dataVisita }) },
        include,
      });
    }),
};
