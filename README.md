# Documentação Técnica — Sistema Match de Adoção (Foco em Cães)

## 1. Visão Geral do Projeto

O sistema **Match de Adoção** (focado na espécie canina, `TIPO_ANIMAL = "CAO"`) é uma aplicação Full-Stack desenvolvida para conectar **Adotantes** a **Instituições** responsáveis por abrigar e disponibilizar cães para adoção.

A arquitetura do projeto segue os conceitos trabalhados nos laboratórios da disciplina de Desenvolvimento de Aplicações Web II:

* **Back-end:** Node.js, Express, TypeScript, Prisma ORM (SQLite), Zod, Swagger (`swagger-ui-express`), JWT (`jsonwebtoken`), `bcryptjs` e Vitest/Supertest.
* **Front-end:** React com TypeScript, React Router, contexto de autenticação (`AuthContext`) e contexto de notificações/mensagens (`ToastContext`).

---

## 2. Organização do Back-end

O back-end (`adocao-caes-backend`) é organizado em camadas com separação de responsabilidades:

```text
backend/
├── prisma/
│   ├── schema.prisma          # Definição do banco SQLite e modelos do Prisma
│   └── seed.ts                # População inicial de dados de exemplo
└── src/
    ├── config/
    │   └── env.ts             # Carregamento e tipagem de variáveis de ambiente
    ├── controllers/
    │   └── index.ts           # authController, animalController e matchController
    ├── lib/
    │   ├── constants.ts       # Papéis (ROLES), transições de match e constantes
    │   ├── errors.ts          # Classe AppError para erros HTTP padronizados
    │   └── prisma.ts          # Instância do PrismaClient
    ├── middlewares/
    │   ├── auth.ts            # authenticate (JWT) e authorizeRole
    │   └── validate.ts        # Validação de body, params e query com Zod
    ├── repositories/
    │   ├── animalRepository.ts  # Consultas e persistência de Animal e Vacina
    │   ├── matchRepository.ts   # Consultas, aprovação exclusiva e status de Match
    │   └── userRepositories.ts  # Consultas e persistência de Instituicao e Adotante
    ├── routes/
    │   └── index.ts           # Definição das rotas REST e encadeamento de middlewares
    ├── schemas/
    │   └── index.ts           # Schemas de validação com Zod
    ├── services/
    │   ├── animalService.ts   # Regras de negócio de cães, disponibilidade e vacinas
    │   ├── authService.ts     # Cadastro, login, 2FA, perfil e exclusão de conta
    │   ├── matchService.ts    # Solicitação, transições e aprovação exclusiva (RN04)
    │   └── rules.ts           # Regras compartilhadas (ex: assertPetsCoherent – RN06)
    └── server.ts              # Inicialização do servidor Express e Swagger
```

### 2.1. Schema de Dados (`prisma/schema.prisma`)

O banco de dados relacional utilizado localmente é o **SQLite** (`provider = "sqlite"`), mapeado pelo **Prisma ORM** com `onDelete: Cascade` nas relações dependentes. Como o SQLite não possui enums nativos portáveis no schema, campos como `tipo` e `status` são armazenados como `String` e validados na camada de aplicação (Zod e Services).

#### Modelos e Tabelas (`@@map`)

* **`Instituicao` (`instituicao`):**
  * `id` (`Int`, `@id @default(autoincrement())`)
  * `nome` (`String`)
  * `cnpj` (`String`, `@unique`)
  * `email` (`String`, `@unique`)
  * `senha` (`String`, hash gerado com `bcryptjs`)
  * `telefone` (`String?`), `endereco` (`String?`), `cidade` (`String?`)
  * `criadoEm` (`DateTime`, `@default(now()) @map("criado_em")`)
  * Relacionamento: `animais Animal[]` (`1:N` com `Animal`).

* **`Animal` (`animal`):**
  * `id` (`Int`, `@id @default(autoincrement())`)
  * `tipo` (`String`, `@default("CAO")`)
  * `nome` (`String`), `raca` (`String`), `dataNascimento` (`DateTime @map("data_nascimento")`)
  * `detalhes` (`String?`), `foto` (`String?`)
  * `idInstituicao` (`Int @map("id_instituicao")`)
  * `criadoEm` (`DateTime @default(now()) @map("criado_em")`)
  * Relacionamentos: `instituicao` (`N:1` com `onDelete: Cascade`), `vacinas AnimalVacina[]` e `matches Match[]`.

* **`Vacina` (`vacina`):**
  * `id` (`Int`, `@id @default(autoincrement())`)
  * `nome` (`String`, `@unique`)
  * Relacionamento: `animais AnimalVacina[]`.

* **`AnimalVacina` (`animal_vacina`):**
  * Tabela associativa para o relacionamento `N:M` entre `Animal` e `Vacina`.
  * `idAnimal` (`Int @map("id_animal")`), `idVacina` (`Int @map("id_vacina")`), `dataAplicacao` (`DateTime @map("data_aplicacao")`).
  * Chave primária composta: `@@id([idAnimal, idVacina])`.

* **`Adotante` (`adotante`):**
  * `id` (`Int`, `@id @default(autoincrement())`)
  * `nome` (`String`), `cpf` (`String`, `@unique`), `email` (`String`, `@unique`), `senha` (`String`)
  * `telefone` (`String?`)
  * `possuiPets` (`Boolean @default(false) @map("possui_pets")`), `qtdPets` (`Int @default(0) @map("qtd_pets")`)
  * `criadoEm` (`DateTime @default(now()) @map("criado_em")`)
  * Relacionamento: `matches Match[]` (`1:N` com `Match`).

* **`Match` (`match`):**
  * `id` (`Int`, `@id @default(autoincrement())`)
  * `idAnimal` (`Int @map("id_animal")`), `idAdotante` (`Int @map("id_adotante")`)
  * `status` (`String @default("PENDENTE")`) — valores previstos: `PENDENTE`, `EM_ANDAMENTO`, `APROVADO`, `CANCELADO`
  * `dataVisita` (`DateTime? @map("data_visita")`), `observacoes` (`String?`)
  * `criadoEm` (`DateTime @default(now()) @map("criado_em")`), `atualizadoEm` (`DateTime @updatedAt @map("atualizado_em")`)
  * Relacionamentos: `animal` (`onDelete: Cascade`) e `adotante` (`onDelete: Cascade`), com índice `@@index([idAnimal, status])`.

### 2.2. Regras de Negócio Implementadas (`src/services/`)

* **RN01 — Vínculo institucional obrigatório:** Todo animal é criado associado a `idInstituicao` da instituição autenticada (`animalService.create`).
* **RN02 — Identificação única:** `authService` valida e impede duplicidade de `email`, `cpf` (para `Adotante`) e `cnpj` (para `Instituicao`), lançando `AppError(409)`.
* **RN03 — Solicitação de adoção:** Cada `Match` vincula `idAdotante` e `idAnimal`; `matchService.request` impede solicitação duplicada em aberto para o mesmo cão pelo mesmo adotante.
* **RN04 — Controle de adoções aprovadas:** Um cão não pode ter mais de um `Match` com status `APROVADO`. `matchService.request` bloqueia novos pedidos para cães já aprovados; `animalService.listAvailable` filtra animais sem match `APROVADO` (`matches: { none: { status: 'APROVADO' } }`); e `matchRepository.approveExclusively` trata a aprovação de forma exclusiva.
* **RN05 — Vacinação de animais:** `animalService.addVacina` e `animalService.removeVacina` gerenciam a aplicação e remoção de vacinas para um cão pertencente à instituição autenticada. *(Observação: no `schema.prisma`, `AnimalVacina` usa chave composta `@@id([idAnimal, idVacina])`, o que restringe uma mesma vacina por par animal/vacina no banco atual — ver seção de pontos a melhorar).*
* **RN06 — Coerência dos dados do adotante:** A função `assertPetsCoherent(possuiPets, qtdPets)` em `src/services/rules.ts` lança `AppError(422)` se `possuiPets === false` e `qtdPets > 0`, ou se `possuiPets === true` e `qtdPets < 1`.

### 2.3. Controladores (`src/controllers/index.ts`)

Os controladores atuam como camada de interface HTTP, extraindo parâmetros, delegando às camadas de serviço (`authService`, `animalService`, `matchService`) e devolvendo os códigos de status HTTP apropriados (`200`, `201`, `204`):

* **`authController`:** `registerAdotante`, `registerInstituicao`, `login`, `verify2FA`, `me`, `updateMe`, `deleteAccount`.
* **`animalController`:** `list`, `mine`, `get`, `create`, `update`, `remove`, `addVacina`, `removeVacina`, `listVacinas`.
* **`matchController`:** `create`, `mine`, `forInstituicao`, `changeStatus`, `cancel`.

### 2.4. Rotas e Middlewares (`src/routes/index.ts`, `src/middlewares/auth.ts`, `src/middlewares/validate.ts`)

* **Autenticação e Autorização (`src/middlewares/auth.ts`):**
  * `authenticate`: exige cabeçalho `Authorization: Bearer <token>`, valida o JWT com `jwt.verify` usando `env.jwtSecret` e popula `req.user = { id, role }`. Retorna `401` se ausente, inválido ou expirado.
  * `authorizeRole(...roles)`: verifica se `req.user.role` está autorizado para a rota; caso contrário, retorna `403`.
* **Validação com Zod (`src/middlewares/validate.ts`):** intercepta `body`, `query` e `params` antes do controller.
* **Principais Endpoints:**
  * `POST /auth/register/adotante` e `POST /auth/register/instituicao`
  * `POST /auth/login` (valida credenciais e gera código 2FA de 6 dígitos com expiração de 5 minutos)
  * `POST /auth/verify-2fa` (valida o código 2FA e emite o token JWT definitivo)
  * `GET /perfil`, `PUT /perfil`, `DELETE /perfil` (autenticados)
  * `GET /vacinas` (público)
  * `GET /animais`, `GET /animais/:id` (públicos)
  * `GET /animais/meus`, `POST /animais`, `PUT /animais/:id`, `DELETE /animais/:id`, `POST /animais/:id/vacinas`, `DELETE /animais/:id/vacinas/:vacinaId` (restritos a `INSTITUICAO`)
  * `POST /matches`, `GET /matches/meus`, `PATCH /matches/:id/cancelar` (restritos a `ADOTANTE`)
  * `GET /matches/instituicao`, `PATCH /matches/:id/status` (restritos a `INSTITUICAO`)

### 2.5. Bibliotecas Utilizadas (`backend/package.json`)

* **Produção:** `@prisma/client`, `bcryptjs`, `cors`, `dotenv`, `express`, `express-async-errors`, `jsonwebtoken`, `swagger-ui-express`, `zod`.
* **Desenvolvimento e Testes:** `prisma`, `typescript`, `tsx`, `vitest`, `supertest`, e tipagens `@types/*`.

---

## 3. Organização do Front-end

A pasta `frontend/src` organiza a aplicação em módulos:

```text
frontend/src/
├── components/   # Componentes reutilizáveis da interface
├── context/      # AuthContext (sessão, JWT, login, 2FA, logout) e ToastContext (mensagens)
├── pages/        # Páginas da aplicação (ex: Login.tsx, Profile.tsx, gestão de cães/matches)
├── api.ts        # Cliente HTTP, armazenamento de token e tratamento de 401
├── App.tsx       # Configuração de rotas e layout principal
├── main.tsx      # Ponto de entrada do React
├── styles.css    # Estilos da interface
└── types.ts      # Tipos TypeScript compartilhados (Role, User, etc.)
```

### 3.1. Fluxos Principais na Interface

* **Login e Autenticação em 2 Etapas (`src/pages/Login.tsx` e `src/context/AuthContext.tsx`):**
  1. Usuário escolhe o perfil (`ADOTANTE` ou `INSTITUICAO`), informa e-mail e senha.
  2. Ao enviar, o back-end gera um código numérico de 6 dígitos (exibido no console do servidor e notificado na interface em ambiente local) e alterna a tela para a etapa de verificação 2FA.
  3. Após confirmar o código de 6 dígitos, o `AuthContext` armazena o token JWT, atualiza o estado do usuário e redireciona para a rota de destino.
* **Rotas Protegidas e Logout:**
  * O `logout()` limpa o token armazenado e reseta `user` e `role` no contexto.
  * Ao tentar acessar rotas protegidas sem estar autenticado ou após o logout, a API retorna `401` (ou a rota protege o acesso), disparando o tratamento de não autorizado e redirecionando para o login.
* **Perfil de Usuário (`src/pages/Profile.tsx`):**
  * Exibe e-mail e documento (`CPF` ou `CNPJ`) bloqueados para edição, permite atualizar dados cadastrais (incluindo `possuiPets` e `qtdPets` para adotantes, ou `cidade` e `endereco` para instituições) e senha opcional, além de disponibilizar a opção **Excluir minha conta** (`DELETE /perfil`).
* **Mensagens de Sucesso e Erro (`ToastContext`):**
  * Notificações visuais exibem feedback de sucesso (`notify('success', ...)`) em operações concluídas e mensagens de erro (`notify('error', ...)`) quando ocorrem falhas de validação, permissão ou regra de negócio.

---

## 4. Como Executar Localmente

### Pré-requisitos

* Node.js instalado (testado com Node.js v24.x).

### 4.1. Back-end

1. Acesse a pasta `backend` e instale as dependências:

```bash
cd backend
npm install
```

2. Crie o arquivo `.env` na pasta `backend` (caso não exista):

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua-chave-secreta-local"
```

3. Gere o Prisma Client, execute as migrações e popule os dados iniciais:

```bash
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
```

4. Inicie o servidor em modo de desenvolvimento:

```bash
npm run dev
```

* A documentação interativa do Swagger fica disponível na rota `/api-docs` do servidor configurado.

### 4.2. Front-end

1. Em outro terminal, acesse a pasta `frontend`, instale as dependências e inicie o servidor:

```bash
cd frontend
npm install
npm run dev
```

---

## 5. Pontos Fortes e Pontos a Melhorar

### Pontos Fortes

* **Separação em camadas bem definida:** `Routes` → `Middlewares` (`auth` e `validate`) → `Controllers` → `Services` → `Repositories` → `Prisma`.
* **Validação de entrada e regras de negócio:** Uso de Zod nas bordas das rotas e regras explícitas de domínio (como `RN04` de aprovação única de match e `RN06` de coerência de pets).
* **Segurança e 2FA:** Senhas com hash `bcryptjs`, rotas protegidas por JWT e verificação por perfil (`INSTITUICAO` vs. `ADOTANTE`), acrescida de verificação em duas etapas (2FA) no login.
* **Facilidade de execução local:** Uso de SQLite com Prisma Migrate e Seed prontos para rodar localmente.

### Pontos a Melhorar

* **Múltiplas doses da mesma vacina (`RN05`):** O DER original prevê que um animal possa receber doses da mesma vacina em datas diferentes, mas `AnimalVacina` no `schema.prisma` utiliza `@@id([idAnimal, idVacina])` e `animalService.addVacina` bloqueia vacina já registrada para o animal. Usar uma chave primária própria (`id @id @default(autoincrement())`) permitiria histórico de múltiplas doses com datas distintas.
* **Armazenamento do 2FA em memória:** O `twoFactorStore` usa um `Map` em memória no processo Node.js; em múltiplas instâncias ou reinicializações do servidor, os códigos pendentes são perdidos.
* **Aviso de depreciação do Prisma:** O Prisma 6.19.3 exibe aviso sobre `package.json#prisma` ser substituído por arquivo de configuração próprio em versões futuras (Prisma 7).
* **Cobertura de testes automatizados:** Expandir os testes com Vitest e Supertest para cobrir todos os cenários de erro (`401`, `403`, `404`, `409`, `422`), 2FA e fluxos do front-end.
