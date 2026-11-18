const bearer = [{ bearerAuth: [] }];
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const body = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const ok = (description: string, schema?: object, code = '200') => ({
  [code]: { description, ...(schema && { content: { 'application/json': { schema } } }) },
});
const err = (...codes: string[]) =>
  Object.fromEntries(codes.map((c) => [c, { description: `Erro ${c}`, content: { 'application/json': { schema: ref('Erro') } } }]));
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const str = { type: 'string' };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API Match de Adoção de Cães',
    version: '1.0.0',
    description:
      'Autentique em **POST /auth/login**, copie o `token` e clique em *Authorize*.\n\n' +
      'Papéis: `INSTITUICAO` (gerencia cães, vacinas e matches) e `ADOTANTE` (solicita/cancela matches).',
  },
  tags: [{ name: 'Auth' }, { name: 'Animais' }, { name: 'Vacinas' }, { name: 'Matches' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erro: { type: 'object', properties: { message: str, details: {} } },
      Login: {
        type: 'object',
        required: ['role', 'email', 'senha'],
        properties: { role: { type: 'string', enum: ['INSTITUICAO', 'ADOTANTE'] }, email: str, senha: str },
      },
      RegisterAdotante: {
        type: 'object',
        required: ['nome', 'cpf', 'email', 'senha'],
        properties: {
          nome: str, cpf: { type: 'string', example: '529.982.247-25' }, email: str, senha: str, telefone: str,
          possuiPets: { type: 'boolean' }, qtdPets: { type: 'integer' },
        },
      },
      RegisterInstituicao: {
        type: 'object',
        required: ['nome', 'cnpj', 'email', 'senha'],
        properties: {
          nome: str, cnpj: { type: 'string', example: '11.222.333/0001-81' }, email: str, senha: str,
          telefone: str, endereco: str, cidade: str,
        },
      },
      AnimalInput: {
        type: 'object',
        required: ['nome', 'raca', 'dataNascimento'],
        properties: { nome: str, raca: str, dataNascimento: { type: 'string', format: 'date' }, detalhes: str, foto: { type: 'string', format: 'uri' } },
      },
      AnimalVacinaInput: {
        type: 'object',
        required: ['vacinaId', 'dataAplicacao'],
        properties: { vacinaId: { type: 'integer' }, dataAplicacao: { type: 'string', format: 'date' } },
      },
      MatchInput: {
        type: 'object',
        required: ['animalId'],
        properties: { animalId: { type: 'integer' }, dataVisita: { type: 'string', format: 'date-time' }, observacoes: str },
      },
      MatchStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['EM_ANDAMENTO', 'APROVADO', 'CANCELADO'], description: 'CANCELADO = recusar' },
          dataVisita: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register/adotante': {
      post: { tags: ['Auth'], summary: 'Cadastro de adotante (CPF)', requestBody: body(ref('RegisterAdotante')), responses: { ...ok('Criado + token JWT', undefined, '201'), ...err('400', '409', '422') } },
    },
    '/auth/register/instituicao': {
      post: { tags: ['Auth'], summary: 'Cadastro de instituição (CNPJ)', requestBody: body(ref('RegisterInstituicao')), responses: { ...ok('Criado + token JWT', undefined, '201'), ...err('400', '409') } },
    },
    '/auth/login': {
      post: { tags: ['Auth'], summary: 'Login unificado (informe o role)', requestBody: body(ref('Login')), responses: { ...ok('Token JWT { id, role }'), ...err('400', '401') } },
    },
    '/perfil': {
      get: { tags: ['Auth'], summary: 'Dados do usuário logado', security: bearer, responses: { ...ok('Perfil'), ...err('401') } },
      put: { tags: ['Auth'], summary: 'Atualiza o perfil (campos dependem do role)', security: bearer, requestBody: body({ type: 'object' }), responses: { ...ok('Perfil atualizado'), ...err('400', '401', '422') } },
    },
    '/vacinas': { get: { tags: ['Vacinas'], summary: 'Lista vacinas', responses: ok('Lista') } },
    '/animais': {
      get: {
        tags: ['Animais'], summary: 'Lista cães disponíveis (sem match APROVADO)',
        parameters: [
          { name: 'busca', in: 'query', schema: str }, { name: 'raca', in: 'query', schema: str },
          { name: 'instituicaoId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: ok('Lista'),
      },
      post: { tags: ['Animais'], summary: '[INSTITUICAO] Cadastra cão', security: bearer, requestBody: body(ref('AnimalInput')), responses: { ...ok('Criado', undefined, '201'), ...err('400', '401', '403') } },
    },
    '/animais/meus': { get: { tags: ['Animais'], summary: '[INSTITUICAO] Meus cães', security: bearer, responses: { ...ok('Lista'), ...err('401', '403') } } },
    '/animais/{id}': {
      get: { tags: ['Animais'], summary: 'Detalhe do cão (vacinas + instituição)', parameters: [idParam], responses: { ...ok('Cão'), ...err('404') } },
      put: { tags: ['Animais'], summary: '[INSTITUICAO] Edita cão próprio', security: bearer, parameters: [idParam], requestBody: body(ref('AnimalInput')), responses: { ...ok('Atualizado'), ...err('400', '401', '403', '404') } },
      delete: { tags: ['Animais'], summary: '[INSTITUICAO] Remove cão próprio', security: bearer, parameters: [idParam], responses: { ...ok('Removido', undefined, '204'), ...err('401', '403', '404') } },
    },
    '/animais/{id}/vacinas': {
      post: { tags: ['Animais'], summary: '[INSTITUICAO] Registra vacina aplicada', security: bearer, parameters: [idParam], requestBody: body(ref('AnimalVacinaInput')), responses: { ...ok('Cão atualizado', undefined, '201'), ...err('400', '403', '404', '409') } },
    },
    '/animais/{id}/vacinas/{vacinaId}': {
      delete: { tags: ['Animais'], summary: '[INSTITUICAO] Remove registro de vacina', security: bearer, parameters: [idParam, { name: 'vacinaId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { ...ok('Cão atualizado'), ...err('403', '404') } },
    },
    '/matches': {
      post: { tags: ['Matches'], summary: '[ADOTANTE] Solicita adoção (match)', security: bearer, requestBody: body(ref('MatchInput')), responses: { ...ok('Criado', undefined, '201'), ...err('400', '401', '403', '404', '409', '422') } },
    },
    '/matches/meus': { get: { tags: ['Matches'], summary: '[ADOTANTE] Meus pedidos', security: bearer, responses: { ...ok('Lista'), ...err('401', '403') } } },
    '/matches/{id}/cancelar': {
      patch: { tags: ['Matches'], summary: '[ADOTANTE] Cancela pedido próprio', security: bearer, parameters: [idParam], responses: { ...ok('Cancelado'), ...err('403', '404', '409') } },
    },
    '/matches/instituicao': { get: { tags: ['Matches'], summary: '[INSTITUICAO] Pedidos dos meus cães', security: bearer, responses: { ...ok('Lista'), ...err('401', '403') } } },
    '/matches/{id}/status': {
      patch: { tags: ['Matches'], summary: '[INSTITUICAO] Avança/aprova/recusa (RN04: um APROVADO por cão)', security: bearer, parameters: [idParam], requestBody: body(ref('MatchStatusInput')), responses: { ...ok('Atualizado'), ...err('400', '403', '404', '409') } },
    },
  },
};
