import type { z } from 'zod';
import { AppError } from '../lib/errors';
import { TIPO_ANIMAL } from '../lib/constants';
import { animalRepository, vacinaRepository, type AnimalWithRelations } from '../repositories/animalRepository';
import type { addVacinaSchema, createAnimalSchema, listAnimaisQuery, updateAnimalSchema } from '../schemas';

/** Remove a lista interna de matches e expõe `disponivel` (sem match APROVADO – RN04). */
const present = ({ matches, ...animal }: AnimalWithRelations) => ({ ...animal, disponivel: matches.length === 0 });

async function getOwned(idInstituicao: number, id: number) {
  const animal = await animalRepository.findById(id);
  if (!animal) throw new AppError(404, 'Cachorro não encontrado.');
  if (animal.idInstituicao !== idInstituicao) throw new AppError(403, 'Este cachorro pertence a outra instituição.');
  return animal;
}

export const animalService = {
  async listAvailable(q: z.infer<typeof listAnimaisQuery>) {
    const animais = await animalRepository.list({
      tipo: TIPO_ANIMAL,
      matches: { none: { status: 'APROVADO' } },
      ...(q.instituicaoId && { idInstituicao: q.instituicaoId }),
      ...(q.raca && { raca: { contains: q.raca } }),
      ...(q.busca && { OR: [{ nome: { contains: q.busca } }, { raca: { contains: q.busca } }] }),
    });
    return animais.map(present);
  },

  async listByInstituicao(idInstituicao: number) {
    return (await animalRepository.list({ idInstituicao })).map(present);
  },

  async get(id: number) {
    const animal = await animalRepository.findById(id);
    if (!animal) throw new AppError(404, 'Cachorro não encontrado.');
    return present(animal);
  },

  async create(idInstituicao: number, input: z.infer<typeof createAnimalSchema>) {
    return present(await animalRepository.create({ ...input, tipo: TIPO_ANIMAL, idInstituicao }));
  },

  async update(idInstituicao: number, id: number, input: z.infer<typeof updateAnimalSchema>) {
    await getOwned(idInstituicao, id);
    return present(await animalRepository.update(id, input));
  },

  async remove(idInstituicao: number, id: number) {
    await getOwned(idInstituicao, id);
    await animalRepository.delete(id);
  },

  async addVacina(idInstituicao: number, idAnimal: number, input: z.infer<typeof addVacinaSchema>) {
    await getOwned(idInstituicao, idAnimal);
    if (!(await vacinaRepository.findById(input.vacinaId))) throw new AppError(404, 'Vacina não encontrada.');
    if (await vacinaRepository.findApplied(idAnimal, input.vacinaId)) {
      throw new AppError(409, 'Esta vacina já foi registrada para o cachorro.');
    }
    await vacinaRepository.apply(idAnimal, input.vacinaId, input.dataAplicacao);
    return animalService.get(idAnimal);
  },

  async removeVacina(idInstituicao: number, idAnimal: number, idVacina: number) {
    await getOwned(idInstituicao, idAnimal);
    if (!(await vacinaRepository.findApplied(idAnimal, idVacina))) throw new AppError(404, 'Vacina não registrada neste cachorro.');
    await vacinaRepository.remove(idAnimal, idVacina);
    return animalService.get(idAnimal);
  },

  listVacinas: () => vacinaRepository.list(),
};
