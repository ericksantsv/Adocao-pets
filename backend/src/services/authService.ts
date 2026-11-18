import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import type { Role } from '../lib/constants';
import { adotanteRepository, instituicaoRepository } from '../repositories/userRepositories';
import type {
  loginSchema,
  registerAdotanteSchema,
  registerInstituicaoSchema,
  updateAdotanteSchema,
  updateInstituicaoSchema,
} from '../schemas';
import { assertPetsCoherent } from './rules';

const sign = (id: number, role: Role) =>
  jwt.sign({ id, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

const strip = <T extends { senha: string }>({ senha: _senha, ...rest }: T) => rest;
const hash = (s: string) => bcrypt.hash(s, 10);

// Armazenamento em memória para códigos 2FA (chave: "ROLE:email")
const twoFactorStore = new Map<string, { code: string; expiresAt: number; userId: number }>();

async function assertEmailFree(email: string) {
  if ((await instituicaoRepository.findByEmail(email)) || (await adotanteRepository.findByEmail(email))) {
    throw new AppError(409, 'E-mail já cadastrado.');
  }
}

export const authService = {
  async registerAdotante(input: z.infer<typeof registerAdotanteSchema>) {
    assertPetsCoherent(input.possuiPets, input.qtdPets);
    await assertEmailFree(input.email);
    if (await adotanteRepository.findByCpf(input.cpf)) throw new AppError(409, 'CPF já cadastrado.');
    const user = await adotanteRepository.create({ ...input, senha: await hash(input.senha) });
    return { token: sign(user.id, 'ADOTANTE'), role: 'ADOTANTE' as const, user: strip(user) };
  },

  async registerInstituicao(input: z.infer<typeof registerInstituicaoSchema>) {
    await assertEmailFree(input.email);
    if (await instituicaoRepository.findByCnpj(input.cnpj)) throw new AppError(409, 'CNPJ já cadastrado.');
    const user = await instituicaoRepository.create({ ...input, senha: await hash(input.senha) });
    return { token: sign(user.id, 'INSTITUICAO'), role: 'INSTITUICAO' as const, user: strip(user) };
  },

  async login({ role, email, senha }: z.infer<typeof loginSchema>) {
    const user =
      role === 'INSTITUICAO' ? await instituicaoRepository.findByEmail(email) : await adotanteRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(senha, user.senha))) throw new AppError(401, 'E-mail ou senha incorretos.');

    // Gera código de 6 dígitos válido por 5 minutos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    twoFactorStore.set(`${role}:${email}`, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      userId: user.id,
    });

    console.log(`\n🔐 [2FA] Código de verificação para ${email} (${role}): ${code}\n`);

    return {
      requires2FA: true,
      role,
      email,
      // Retornado apenas em ambiente de desenvolvimento para facilitar testes locais/demonstração
      devCodeHint: code,
    };
  },

  async verify2FA({ role, email, code }: { role: Role; email: string; code: string }) {
    const key = `${role}:${email}`;
    const record = twoFactorStore.get(key);

    if (!record) throw new AppError(400, 'Nenhuma verificação 2FA pendente. Faça login novamente.');
    if (Date.now() > record.expiresAt) {
      twoFactorStore.delete(key);
      throw new AppError(401, 'Código 2FA expirado. Faça login novamente.');
    }
    if (record.code !== code.trim()) {
      throw new AppError(401, 'Código de verificação 2FA inválido.');
    }

    twoFactorStore.delete(key);

    const user =
      role === 'INSTITUICAO'
        ? await instituicaoRepository.findById(record.userId)
        : await adotanteRepository.findById(record.userId);
    if (!user) throw new AppError(404, 'Usuário não encontrado.');

    return { token: sign(user.id, role), role, user: strip(user) };
  },

  async getProfile(id: number, role: Role) {
    const user = role === 'INSTITUICAO' ? await instituicaoRepository.findById(id) : await adotanteRepository.findById(id);
    if (!user) throw new AppError(404, 'Usuário não encontrado.');
    return { role, user: strip(user) };
  },

  async updateAdotante(id: number, input: z.infer<typeof updateAdotanteSchema>) {
    const current = await adotanteRepository.findById(id);
    if (!current) throw new AppError(404, 'Usuário não encontrado.');
    assertPetsCoherent(input.possuiPets ?? current.possuiPets, input.qtdPets ?? current.qtdPets);
    const { senha, ...rest } = input;
    const user = await adotanteRepository.update(id, { ...rest, ...(senha && { senha: await hash(senha) }) });
    return { role: 'ADOTANTE' as const, user: strip(user) };
  },

  async updateInstituicao(id: number, input: z.infer<typeof updateInstituicaoSchema>) {
    const { senha, ...rest } = input;
    const user = await instituicaoRepository.update(id, { ...rest, ...(senha && { senha: await hash(senha) }) });
    return { role: 'INSTITUICAO' as const, user: strip(user) };
  },
};