import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

// Gera CPFs válidos distintos para não colidir entre cadastros
function cpf(seed: number) {
  const base = String(100000000 + seed).split('').map(Number);
  const dv = (digits: number[]) => {
    const r = (digits.reduce((s, d, i) => s + d * (digits.length + 1 - i), 0) * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

const future = () => new Date(Date.now() + 7 * 864e5).toISOString();
const tag = Date.now();

let instToken: string;
let outraInstToken: string;
let adotToken: string;
let adot2Token: string;
let animalId: number;
let matchA: number;
let matchB: number;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  const i1 = await request(app).post('/auth/register/instituicao').send({ nome: 'Abrigo A', cnpj: '11.222.333/0001-81', email: `a${tag}@abrigo.com`, senha: '123456' });
  instToken = i1.body.token;
  const i2 = await request(app).post('/auth/register/instituicao').send({ nome: 'Abrigo B', cnpj: '11444777000161', email: `b${tag}@abrigo.com`, senha: '123456' });
  outraInstToken = i2.body.token;
  const a1 = await request(app).post('/auth/register/adotante').send({ nome: 'Ana', cpf: cpf(1), email: `ana${tag}@mail.com`, senha: '123456' });
  adotToken = a1.body.token;
  const a2 = await request(app).post('/auth/register/adotante').send({ nome: 'Beto', cpf: cpf(2), email: `beto${tag}@mail.com`, senha: '123456' });
  adot2Token = a2.body.token;
});

describe('Autenticação', () => {
  it('rejeita CPF inválido (400)', async () => {
    const r = await request(app).post('/auth/register/adotante').send({ nome: 'X Y', cpf: '111.111.111-11', email: 'x@x.com', senha: '123456' });
    expect(r.status).toBe(400);
  });

  it('RN06: possuiPets=false com qtdPets>0 retorna 422', async () => {
    const r = await request(app).post('/auth/register/adotante').send({ nome: 'Caio', cpf: cpf(3), email: `c${tag}@m.com`, senha: '123456', possuiPets: false, qtdPets: 2 });
    expect(r.status).toBe(422);
  });

  it('login retorna token; senha errada retorna 401', async () => {
    const ok = await request(app).post('/auth/login').send({ role: 'ADOTANTE', email: `ana${tag}@mail.com`, senha: '123456' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await request(app).post('/auth/login').send({ role: 'ADOTANTE', email: `ana${tag}@mail.com`, senha: 'errada' });
    expect(bad.status).toBe(401);
  });

  it('rota protegida sem token retorna 401', async () => {
    expect((await request(app).get('/perfil')).status).toBe(401);
    expect((await request(app).get('/matches/meus')).status).toBe(401);
  });
});

describe('Autorização por papel', () => {
  it('ADOTANTE não pode cadastrar cão (403)', async () => {
    const r = await request(app).post('/animais').set(auth(adotToken)).send({ nome: 'Rex', raca: 'SRD', dataNascimento: '2020-01-01' });
    expect(r.status).toBe(403);
  });

  it('INSTITUICAO cadastra cão e registra vacina', async () => {
    const c = await request(app).post('/animais').set(auth(instToken)).send({ nome: 'Rex', raca: 'SRD', dataNascimento: '2020-01-01' });
    expect(c.status).toBe(201);
    animalId = c.body.id;
    expect(c.body.disponivel).toBe(true);

    const vacina = await prisma.vacina.create({ data: { nome: `V10-${tag}` } });
    const body = { vacinaId: vacina.id, dataAplicacao: '2025-01-15' };
    const v = await request(app).post(`/animais/${animalId}/vacinas`).set(auth(instToken)).send(body);
    expect(v.status).toBe(201);
    expect(v.body.vacinas).toHaveLength(1);
    // mesma vacina duas vezes -> 409; outra instituição -> 403
    expect((await request(app).post(`/animais/${animalId}/vacinas`).set(auth(instToken)).send(body)).status).toBe(409);
    expect((await request(app).post(`/animais/${animalId}/vacinas`).set(auth(outraInstToken)).send(body)).status).toBe(403);
  });

  it('outra instituição não edita cão alheio (403)', async () => {
    const r = await request(app).put(`/animais/${animalId}`).set(auth(outraInstToken)).send({ nome: 'Hack' });
    expect(r.status).toBe(403);
  });

  it('INSTITUICAO não pode solicitar match (403)', async () => {
    const r = await request(app).post('/matches').set(auth(instToken)).send({ animalId });
    expect(r.status).toBe(403);
  });
});

describe('Matches e RN04', () => {
  it('dois adotantes solicitam o mesmo cão', async () => {
    const a = await request(app).post('/matches').set(auth(adotToken)).send({ animalId, dataVisita: future() });
    const b = await request(app).post('/matches').set(auth(adot2Token)).send({ animalId });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    matchA = a.body.id;
    matchB = b.body.id;
  });

  it('solicitação duplicada em aberto retorna 409', async () => {
    const r = await request(app).post('/matches').set(auth(adotToken)).send({ animalId });
    expect(r.status).toBe(409);
  });

  it('outra instituição não gerencia o match (403)', async () => {
    const r = await request(app).patch(`/matches/${matchA}/status`).set(auth(outraInstToken)).send({ status: 'APROVADO' });
    expect(r.status).toBe(403);
  });

  it('aprova o primeiro; aprovar o segundo viola RN04 (409)', async () => {
    const ok = await request(app).patch(`/matches/${matchA}/status`).set(auth(instToken)).send({ status: 'APROVADO' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('APROVADO');

    const dup = await request(app).patch(`/matches/${matchB}/status`).set(auth(instToken)).send({ status: 'APROVADO' });
    expect(dup.status).toBe(409);
    expect(dup.body.message).toMatch(/RN04/);
  });

  it('cão aprovado some da listagem pública e fica indisponível', async () => {
    const list = await request(app).get('/animais');
    expect(list.body.find((a: { id: number }) => a.id === animalId)).toBeUndefined();
    const one = await request(app).get(`/animais/${animalId}`);
    expect(one.body.disponivel).toBe(false);
  });

  it('novo pedido para cão já adotado retorna 409', async () => {
    const r = await request(app).post('/matches').set(auth(adot2Token)).send({ animalId });
    expect(r.status).toBe(409);
  });

  it('adotante não cancela pedido de outro (403) nem pedido já aprovado (409)', async () => {
    expect((await request(app).patch(`/matches/${matchA}/cancelar`).set(auth(adot2Token))).status).toBe(403);
    expect((await request(app).patch(`/matches/${matchA}/cancelar`).set(auth(adotToken))).status).toBe(409);
  });

  it('adotante cancela o próprio pedido em aberto', async () => {
    const r = await request(app).patch(`/matches/${matchB}/cancelar`).set(auth(adot2Token));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('CANCELADO');
  });
});
