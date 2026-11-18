-- CreateTable
CREATE TABLE "instituicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "animal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL DEFAULT 'CAO',
    "nome" TEXT NOT NULL,
    "raca" TEXT NOT NULL,
    "data_nascimento" DATETIME NOT NULL,
    "detalhes" TEXT,
    "foto" TEXT,
    "id_instituicao" INTEGER NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "animal_id_instituicao_fkey" FOREIGN KEY ("id_instituicao") REFERENCES "instituicao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vacina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "animal_vacina" (
    "id_animal" INTEGER NOT NULL,
    "id_vacina" INTEGER NOT NULL,
    "data_aplicacao" DATETIME NOT NULL,

    PRIMARY KEY ("id_animal", "id_vacina"),
    CONSTRAINT "animal_vacina_id_animal_fkey" FOREIGN KEY ("id_animal") REFERENCES "animal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "animal_vacina_id_vacina_fkey" FOREIGN KEY ("id_vacina") REFERENCES "vacina" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adotante" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "possui_pets" BOOLEAN NOT NULL DEFAULT false,
    "qtd_pets" INTEGER NOT NULL DEFAULT 0,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_animal" INTEGER NOT NULL,
    "id_adotante" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data_visita" DATETIME,
    "observacoes" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "match_id_animal_fkey" FOREIGN KEY ("id_animal") REFERENCES "animal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "match_id_adotante_fkey" FOREIGN KEY ("id_adotante") REFERENCES "adotante" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "instituicao_cnpj_key" ON "instituicao"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "instituicao_email_key" ON "instituicao"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vacina_nome_key" ON "vacina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "adotante_cpf_key" ON "adotante"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "adotante_email_key" ON "adotante"("email");

-- CreateIndex
CREATE INDEX "match_id_animal_status_idx" ON "match"("id_animal", "status");
