import { AppError } from '../lib/errors';

/** RN06 – coerência de pets do adotante: possuiPets e qtdPets não podem se contradizer. */
export function assertPetsCoherent(possuiPets: boolean, qtdPets: number) {
  if (!possuiPets && qtdPets > 0) {
    throw new AppError(422, 'RN06: informe "possui pets" ou use quantidade 0 (quantidade > 0 contradiz "não possui pets").');
  }
  if (possuiPets && qtdPets < 1) {
    throw new AppError(422, 'RN06: quem possui pets deve informar ao menos 1 pet.');
  }
}
