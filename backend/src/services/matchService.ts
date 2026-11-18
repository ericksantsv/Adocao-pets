import type { z } from 'zod';
import { AppError } from '../lib/errors';
import { MATCH_TRANSITIONS, type MatchStatus } from '../lib/constants';
import { animalRepository } from '../repositories/animalRepository';
import { matchRepository } from '../repositories/matchRepository';
import { adotanteRepository } from '../repositories/userRepositories';
import type { createMatchSchema, updateMatchStatusSchema } from '../schemas';
import { assertPetsCoherent } from './rules';

function assertTransition(from: string, to: MatchStatus) {
  if (!MATCH_TRANSITIONS[from as MatchStatus]?.includes(to)) {
    throw new AppError(409, `Transição inválida: ${from} → ${to}.`);
  }
}

export const matchService = {
  async request(idAdotante: number, input: z.infer<typeof createMatchSchema>) {
    const adotante = await adotanteRepository.findById(idAdotante);
    if (!adotante) throw new AppError(404, 'Adotante não encontrado.');
    assertPetsCoherent(adotante.possuiPets, adotante.qtdPets); // RN06

    const animal = await animalRepository.findById(input.animalId);
    if (!animal) throw new AppError(404, 'Cachorro não encontrado.');
    if (await matchRepository.hasApproved(animal.id)) {
      throw new AppError(409, 'RN04: este cachorro já possui uma adoção APROVADA e não está mais disponível.');
    }
    if (await matchRepository.findActive(animal.id, idAdotante)) {
      throw new AppError(409, 'Você já possui uma solicitação em aberto para este cachorro.');
    }
    return matchRepository.create({
      idAnimal: animal.id,
      idAdotante,
      dataVisita: input.dataVisita,
      observacoes: input.observacoes,
    });
  },

  listByAdotante: (idAdotante: number) => matchRepository.listByAdotante(idAdotante),
  listByInstituicao: (idInstituicao: number) => matchRepository.listByInstituicao(idInstituicao),

  /** Instituição: avança, aprova ou recusa (CANCELADO) o match de um de seus cães. */
  async changeStatus(idInstituicao: number, id: number, input: z.infer<typeof updateMatchStatusSchema>) {
    const match = await matchRepository.findById(id);
    if (!match) throw new AppError(404, 'Match não encontrado.');
    if (match.animal.idInstituicao !== idInstituicao) throw new AppError(403, 'Este match pertence a outra instituição.');
    assertTransition(match.status, input.status);

    if (input.status === 'APROVADO') {
      const approved = await matchRepository.approveExclusively(id, match.idAnimal, input.dataVisita);
      if (!approved) {
        throw new AppError(409, 'RN04: já existe um match APROVADO para este cachorro. Não é possível aprovar outro.');
      }
      return approved;
    }
    return matchRepository.updateStatus(id, input.status, input.dataVisita);
  },

  /** Adotante: cancela o próprio pedido. */
  async cancelByAdotante(idAdotante: number, id: number) {
    const match = await matchRepository.findById(id);
    if (!match) throw new AppError(404, 'Match não encontrado.');
    if (match.idAdotante !== idAdotante) throw new AppError(403, 'Este pedido pertence a outro adotante.');
    assertTransition(match.status, 'CANCELADO');
    return matchRepository.updateStatus(id, 'CANCELADO');
  },
};
