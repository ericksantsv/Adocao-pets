import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const yearsAgo = (y: number) => new Date(Date.now() - y * 365 * 24 * 3600 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000);

async function main() {
  const senha = await bcrypt.hash('123456', 10);

  const instituicao = await prisma.instituicao.upsert({
    where: { email: 'abrigo@exemplo.com' },
    update: {},
    create: {
      nome: 'Abrigo Patas Felizes',
      cnpj: '11222333000181',
      email: 'abrigo@exemplo.com',
      senha,
      telefone: '(11) 4002-8922',
      endereco: 'Rua das Acácias, 100',
      cidade: 'São Paulo',
    },
  });

  await prisma.adotante.upsert({
    where: { email: 'adotante@exemplo.com' },
    update: {},
    create: {
      nome: 'Maria Adotante',
      cpf: '52998224725',
      email: 'adotante@exemplo.com',
      senha,
      telefone: '(11) 99999-0000',
      possuiPets: false,
      qtdPets: 0,
    },
  });

  const [antirrabica, v8, v10] = await Promise.all(
    ['Antirrábica', 'V8', 'V10'].map((nome) =>
      prisma.vacina.upsert({ where: { nome }, update: {}, create: { nome } }),
    ),
  );

  // Recria os cães do seed de forma idempotente
  await prisma.animal.deleteMany({ where: { idInstituicao: instituicao.id } });

  const caes = [
    { nome: 'Thor', raca: 'Labrador', anos: 3, detalhes: 'Brincalhão, ótimo com crianças e muito energético.', foto: 'https://placedog.net/500/400?id=1', vacinas: [antirrabica, v10] },
    { nome: 'Luna', raca: 'Vira-lata caramelo', anos: 1, detalhes: 'Dócil, castrada e já aprendeu comandos básicos.', foto: 'https://placedog.net/500/400?id=2', vacinas: [antirrabica, v8] },
    { nome: 'Bidu', raca: 'Beagle', anos: 5, detalhes: 'Calmo e carinhoso. Ideal para apartamento.', foto: 'https://placedog.net/500/400?id=3', vacinas: [v8, v10] },
  ];

  for (const c of caes) {
    await prisma.animal.create({
      data: {
        tipo: 'CAO',
        nome: c.nome,
        raca: c.raca,
        dataNascimento: yearsAgo(c.anos),
        detalhes: c.detalhes,
        foto: c.foto,
        idInstituicao: instituicao.id,
        vacinas: { create: c.vacinas.map((v) => ({ idVacina: v.id, dataAplicacao: daysAgo(30) })) },
      },
    });
  }

  console.log('Seed concluído.');
  console.log('  Instituição: abrigo@exemplo.com / 123456');
  console.log('  Adotante:    adotante@exemplo.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
