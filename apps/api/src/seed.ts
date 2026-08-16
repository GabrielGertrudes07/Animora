/**
 * Seeder do catálogo Animora.
 *
 * Apaga o catálogo de teste (categorias, marcas, atributos, produtos,
 * variantes, imagens, clientes, encomendas) e recria um catálogo realista de
 * pet shop portuguesa, para o dono ver a loja como ela vai ficar a sério.
 *
 * Repetível de propósito: apaga tudo o que cria antes de recriar, com dados
 * deterministas (a única aleatoriedade é um gerador com semente fixa) — correr
 * duas vezes seguidas dá exatamente o mesmo catálogo, sem duplicar nada.
 *
 * Nunca toca na coleção `users`: o dono (`admin@animora.pt`) fica como está.
 * A trava do dashboard (`globals/Definicoes`) é explicitamente deixada ligada
 * no fim, mesmo que alguém a tenha desbloqueado a meio de uma verificação.
 *
 * Corre com `pnpm seed` (na raiz) ou `pnpm --filter @animora/api seed`, que
 * invoca `payload run src/seed.ts` — o Payload já traz o `tsx` que transpila
 * este ficheiro e a `payload run` carrega o `.env` sozinha.
 */
import { createLocalReq, getPayload, type Payload } from 'payload'
import { combinationKey } from '@animora/core'
import sharp from 'sharp'

import config from '../payload.config'
import { finalizarCompra } from './endpoints/checkout'

// ---------------------------------------------------------------------------
// Aleatoriedade determinista — mesma semente, mesmo catálogo em cada corrida.
// ---------------------------------------------------------------------------

function criarPrng(semente: number): () => number {
  let estado = semente >>> 0
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0
    return estado / 4294967296
  }
}
const aleatorio = criarPrng(20260815)
const inteiroEntre = (min: number, max: number): number =>
  min + Math.floor(aleatorio() * (max - min + 1))
const escolher = <T,>(lista: T[]): T => lista[Math.floor(aleatorio() * lista.length)]!

// ---------------------------------------------------------------------------
// Categorias, marcas, atributos
// ---------------------------------------------------------------------------

const CATEGORIAS = [
  { chave: 'caes', name: 'Cães', slug: 'caes' },
  { chave: 'gatos', name: 'Gatos', slug: 'gatos' },
  { chave: 'passaros', name: 'Pássaros', slug: 'passaros' },
  { chave: 'roedores', name: 'Roedores', slug: 'roedores' },
  { chave: 'aquario', name: 'Aquário', slug: 'aquario' },
  { chave: 'alimentacao', name: 'Alimentação', slug: 'alimentacao' },
  { chave: 'higiene', name: 'Higiene', slug: 'higiene' },
  { chave: 'brinquedos', name: 'Brinquedos', slug: 'brinquedos' },
  { chave: 'treino', name: 'Treino', slug: 'treino' },
  { chave: 'acessorios', name: 'Acessórios', slug: 'acessorios' },
] as const
type CategoriaChave = (typeof CATEGORIAS)[number]['chave']

/** Uma cor por categoria, para as imagens geradas serem distinguíveis à vista. */
const CORES_CATEGORIA: Record<CategoriaChave, string> = {
  caes: '#2F6F4E',
  gatos: '#6A4C93',
  passaros: '#1B6FA8',
  roedores: '#8C5E33',
  aquario: '#0F6E8C',
  alimentacao: '#C1440E',
  higiene: '#3E7CB1',
  brinquedos: '#B8860B',
  treino: '#4B5320',
  acessorios: '#8E3B46',
}

const MARCAS = [
  { chave: 'petiscoReal', name: 'Petisco Real', slug: 'petisco-real' },
  { chave: 'focinhoFeliz', name: 'Focinho Feliz', slug: 'focinho-feliz' },
  { chave: 'vidacao', name: 'VidaCão', slug: 'vidacao' },
  { chave: 'miauCia', name: 'Miau & Companhia', slug: 'miau-e-companhia' },
  { chave: 'naturalBicho', name: 'Natural Bicho', slug: 'natural-bicho' },
  { chave: 'aquavida', name: 'AquaVida', slug: 'aquavida' },
  { chave: 'penaviva', name: 'PenaViva', slug: 'penaviva' },
  { chave: 'roedix', name: 'Roedix', slug: 'roedix' },
  { chave: 'trelaCerta', name: 'Trela Certa', slug: 'trela-certa' },
  { chave: 'bicharada', name: 'Bicharada', slug: 'bicharada' },
  { chave: 'patasPro', name: 'PatasPro', slug: 'patas-pro' },
  { chave: 'faunaNorte', name: 'Fauna Norte', slug: 'fauna-norte' },
] as const
type MarcaChave = (typeof MARCAS)[number]['chave']

const ATRIBUTOS = [
  { chave: 'tamanho', nome: 'Tamanho', tipo: 'select', controlo: 'caixas' },
  { chave: 'cor', nome: 'Cor', tipo: 'select', controlo: 'amostras' },
  { chave: 'peso-do-saco', nome: 'Peso do saco', tipo: 'select', controlo: 'caixas' },
  { chave: 'animal-de-destino', nome: 'Animal de destino', tipo: 'select', controlo: 'caixas' },
  { chave: 'porte', nome: 'Porte', tipo: 'select', controlo: 'caixas' },
] as const

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

type VarianteSpec = {
  combination: Record<string, string>
  priceCents: number
  oldPriceCents?: number
  stock: number
  /** Omitido = custo desconhecido. `0` = custo mesmo zero (brinde de fornecedor). */
  costCents?: number
}

type ProdutoSpec = {
  titulo: string
  slug: string
  marca: MarcaChave
  categoria: CategoriaChave
  descricao: string
  variantes: VarianteSpec[]
}

const PRODUTOS: ProdutoSpec[] = [
  // --- Alimentação (9) ---------------------------------------------------
  {
    titulo: 'Ração Frangoso Cão Adulto Frango & Arroz',
    slug: 'racao-frangoso-cao-adulto-frango-arroz',
    marca: 'petiscoReal',
    categoria: 'alimentacao',
    descricao:
      'Ração completa para cães adultos de todas as raças, com frango fresco como primeiro ' +
      'ingrediente e arroz de fácil digestão. Sem corantes nem conservantes artificiais — só o ' +
      'que o seu cão precisa para manter a energia todos os dias.',
    variantes: [
      { combination: { 'Peso do saco': '2 kg', 'Animal de destino': 'Cão' }, priceCents: 1290, costCents: 780, stock: 45 },
      { combination: { 'Peso do saco': '10 kg', 'Animal de destino': 'Cão' }, priceCents: 3990, costCents: 2400, stock: 20 },
      { combination: { 'Peso do saco': '20 kg', 'Animal de destino': 'Cão' }, priceCents: 6990, costCents: 4300, stock: 8 },
    ],
  },
  {
    titulo: 'Ração Focinho Feliz Cão Sénior Salmão',
    slug: 'racao-focinho-feliz-cao-senior-salmao',
    marca: 'focinhoFeliz',
    categoria: 'alimentacao',
    descricao:
      'Formulada para cães a partir dos 7 anos, com glucosamina para as articulações e salmão ' +
      'como fonte de proteína de alta digestibilidade. Ajuda a manter o peso ideal na fase em ' +
      'que o metabolismo abranda.',
    variantes: [
      { combination: { 'Peso do saco': '3 kg', 'Animal de destino': 'Cão' }, priceCents: 1690, costCents: 990, stock: 30 },
      { combination: { 'Peso do saco': '15 kg', 'Animal de destino': 'Cão' }, priceCents: 5990, costCents: 3600, stock: 3 },
    ],
  },
  {
    titulo: 'Ração Miau & Companhia Gato Adulto Peixe',
    slug: 'racao-miau-gato-adulto-peixe',
    marca: 'miauCia',
    categoria: 'alimentacao',
    descricao:
      'Alimento seco para gatos adultos com peixe selecionado, taurina adicionada para a saúde ' +
      'do coração e baixo teor de cinzas para cuidar dos rins. O sabor que os gatos mais ' +
      'exigentes aprovam.',
    variantes: [
      {
        combination: { 'Peso do saco': '1.5 kg', 'Animal de destino': 'Gato' },
        priceCents: 1190,
        oldPriceCents: 1390,
        costCents: 700,
        stock: 50,
      },
      { combination: { 'Peso do saco': '7 kg', 'Animal de destino': 'Gato' }, priceCents: 3490, costCents: 2050, stock: 0 },
    ],
  },
  {
    titulo: 'Ração Natural Bicho Gato Esterilizado Frango',
    slug: 'racao-natural-bicho-gato-esterilizado-frango',
    marca: 'naturalBicho',
    categoria: 'alimentacao',
    descricao:
      'Pensada para gatos esterilizados, com menos gordura e L-carnitina para ajudar a ' +
      'controlar o peso sem comprometer a saciedade. Fibra prebiótica para um trânsito ' +
      'intestinal mais regular.',
    variantes: [
      { combination: { 'Peso do saco': '2 kg', 'Animal de destino': 'Gato' }, priceCents: 1590, stock: 22 },
      { combination: { 'Peso do saco': '8 kg', 'Animal de destino': 'Gato' }, priceCents: 4990, costCents: 2900, stock: 11 },
    ],
  },
  {
    titulo: 'Sementes PenaViva Papagaios e Periquitos',
    slug: 'sementes-penaviva-papagaios-periquitos',
    marca: 'penaviva',
    categoria: 'alimentacao',
    descricao:
      'Mistura de sementes selecionadas para papagaios e periquitos, rica em girassol, painço e ' +
      'aveia. Embalagem com fecho hermético para manter o alimento sempre fresco.',
    variantes: [
      { combination: { 'Peso do saco': '500 g', 'Animal de destino': 'Pássaro' }, priceCents: 490, costCents: 210, stock: 40 },
      { combination: { 'Peso do saco': '1 kg', 'Animal de destino': 'Pássaro' }, priceCents: 890, costCents: 400, stock: 4 },
    ],
  },
  {
    titulo: 'Alimento Roedix para Hamsters e Gerbilos',
    slug: 'alimento-roedix-hamsters-gerbilos',
    marca: 'roedix',
    categoria: 'alimentacao',
    descricao:
      'Mistura equilibrada de cereais, sementes e vegetais desidratados para hamsters, gerbilos ' +
      'e ratinhos. Ajuda a manter os dentes desgastados pela mastigação natural.',
    variantes: [
      { combination: { 'Peso do saco': '400 g', 'Animal de destino': 'Roedor' }, priceCents: 390, costCents: 180, stock: 25 },
      { combination: { 'Peso do saco': '900 g', 'Animal de destino': 'Roedor' }, priceCents: 690, costCents: 0, stock: 15 },
    ],
  },
  {
    titulo: 'Flocos AquaVida para Peixes Tropicais',
    slug: 'flocos-aquavida-peixes-tropicais',
    marca: 'aquavida',
    categoria: 'alimentacao',
    descricao:
      'Alimento em flocos de fácil digestão para todo o tipo de peixes tropicais de aquário, com ' +
      'espirulina para cores mais vivas. Não turva a água quando usado nas doses recomendadas.',
    variantes: [
      { combination: { 'Peso do saco': '100 g', 'Animal de destino': 'Peixe' }, priceCents: 390, costCents: 150, stock: 60 },
      { combination: { 'Peso do saco': '250 g', 'Animal de destino': 'Peixe' }, priceCents: 690, costCents: 260, stock: 2 },
    ],
  },
  {
    titulo: 'Snacks Dentais Petisco Real Cão (pack 7)',
    slug: 'snacks-dentais-petisco-real-cao',
    marca: 'petiscoReal',
    categoria: 'alimentacao',
    descricao:
      'Snack dental crocante que ajuda a reduzir o tártaro em cada mastigação. Pack com 7 ' +
      'unidades para uma semana de higiene oral sem esforço.',
    variantes: [
      {
        combination: { 'Animal de destino': 'Cão' },
        priceCents: 349,
        oldPriceCents: 399,
        costCents: 140,
        stock: 80,
      },
    ],
  },
  {
    titulo: 'Petiscos Liofilizados Miau & Companhia Gato (Fígado)',
    slug: 'petiscos-liofilizados-miau-gato-figado',
    marca: 'miauCia',
    categoria: 'alimentacao',
    descricao:
      'Petiscos 100% fígado liofilizado, sem aditivos nem conservantes, ideais para prémio ou ' +
      'para dar em comprimidos disfarçados. Textura estaladiça que os gatos identificam ao cheiro.',
    variantes: [{ combination: { 'Animal de destino': 'Gato' }, priceCents: 599, stock: 30 }],
  },

  // --- Cães (7) ------------------------------------------------------------
  {
    titulo: 'Coleira Ajustável Trela Certa Classic',
    slug: 'coleira-ajustavel-trela-certa-classic',
    marca: 'trelaCerta',
    categoria: 'caes',
    descricao:
      'Coleira em nylon reforçado com fivela de engate rápido e anel em aço inoxidável para a ' +
      'trela. Ajustável em três tamanhos, para cães desde raças pequenas até grandes.',
    variantes: [
      { combination: { Tamanho: 'S', Cor: 'Preto' }, priceCents: 890, costCents: 490, stock: 25 },
      { combination: { Tamanho: 'S', Cor: 'Azul' }, priceCents: 890, costCents: 490, stock: 18 },
      { combination: { Tamanho: 'S', Cor: 'Vermelho' }, priceCents: 890, costCents: 490, stock: 0 },
      { combination: { Tamanho: 'M', Cor: 'Preto' }, priceCents: 990, costCents: 540, stock: 30 },
      { combination: { Tamanho: 'M', Cor: 'Azul' }, priceCents: 990, costCents: 540, stock: 22 },
      { combination: { Tamanho: 'M', Cor: 'Vermelho' }, priceCents: 990, costCents: 540, stock: 4 },
      { combination: { Tamanho: 'L', Cor: 'Preto' }, priceCents: 1090, costCents: 600, stock: 15 },
      { combination: { Tamanho: 'L', Cor: 'Azul' }, priceCents: 1090, costCents: 600, stock: 0 },
      { combination: { Tamanho: 'L', Cor: 'Vermelho' }, priceCents: 1090, costCents: 600, stock: 9 },
    ],
  },
  {
    titulo: 'Trela Retrátil PatasPro 5m',
    slug: 'trela-retratil-patas-pro-5m',
    marca: 'patasPro',
    categoria: 'caes',
    descricao:
      'Trela retrátil com 5 metros de fita reforçada, travão automático e pega ergonómica ' +
      'antiderrapante. Suporta cães até 30 kg com total segurança.',
    variantes: [{ combination: {}, priceCents: 1990, costCents: 1150, stock: 18 }],
  },
  {
    titulo: 'Peitoral Anti-puxão VidaCão',
    slug: 'peitoral-anti-puxao-vidacao',
    marca: 'vidacao',
    categoria: 'caes',
    descricao:
      'Peitoral em H que distribui a força do puxão pelo peito em vez do pescoço, ideal para ' +
      'cães que puxam a trela. Fivelas em plástico resistente e alça reflectora para passeios ao ' +
      'fim do dia.',
    variantes: [
      { combination: { Tamanho: 'S' }, priceCents: 1490, costCents: 800, stock: 20 },
      { combination: { Tamanho: 'M' }, priceCents: 1490, costCents: 800, stock: 15 },
      { combination: { Tamanho: 'L' }, priceCents: 1490, costCents: 800, stock: 3 },
      { combination: { Tamanho: 'XL' }, priceCents: 1490, stock: 0 },
    ],
  },
  {
    titulo: 'Cama Ortopédica Bicharada Conforto',
    slug: 'cama-ortopedica-bicharada-conforto',
    marca: 'bicharada',
    categoria: 'caes',
    descricao:
      'Cama com espuma viscoelástica que alivia a pressão nas articulações, especialmente ' +
      'indicada para cães sénior ou de raças grandes. Capa exterior amovível e lavável à máquina.',
    variantes: [
      { combination: { Porte: 'Pequeno' }, priceCents: 2990, costCents: 1700, stock: 12 },
      { combination: { Porte: 'Médio' }, priceCents: 3990, costCents: 2300, stock: 9 },
      { combination: { Porte: 'Grande' }, priceCents: 5990, oldPriceCents: 6990, costCents: 3500, stock: 1 },
    ],
  },
  {
    titulo: 'Escova Desembaraçadora Focinho Feliz',
    slug: 'escova-desembaracadora-focinho-feliz',
    marca: 'focinhoFeliz',
    categoria: 'caes',
    descricao:
      'Escova com dentes finos em aço inoxidável que remove pelo morto sem puxar nem magoar a ' +
      'pele. Cabo ergonómico pensado para sessões de escovagem mais longas.',
    variantes: [{ combination: {}, priceCents: 990, costCents: 480, stock: 55 }],
  },
  {
    titulo: 'Casota Exterior Fauna Norte Madeira',
    slug: 'casota-exterior-fauna-norte-madeira',
    marca: 'faunaNorte',
    categoria: 'caes',
    descricao:
      'Casota em madeira de pinho tratada, com telhado inclinado para escorrer a água da chuva e ' +
      'base elevada que isola do frio do chão. Montagem simples, sem ferramentas especiais.',
    variantes: [
      { combination: { Porte: 'Médio' }, priceCents: 8990, costCents: 5400, stock: 4 },
      { combination: { Porte: 'Grande' }, priceCents: 12990, costCents: 7800, stock: 2 },
    ],
  },
  {
    titulo: 'Bebedouro Automático VidaCão 3L',
    slug: 'bebedouro-automatico-vidacao-3l',
    marca: 'vidacao',
    categoria: 'caes',
    descricao:
      'Bebedouro com reservatório de 3 litros e sistema de nível constante, para o seu cão ter ' +
      'sempre água fresca disponível mesmo em dias mais quentes ou fins de semana fora.',
    variantes: [{ combination: {}, priceCents: 1790, costCents: 980, stock: 26 }],
  },

  // --- Gatos (6) -----------------------------------------------------------
  {
    titulo: 'Arranhador Miau & Companhia Torre',
    slug: 'arranhador-miau-torre',
    marca: 'miauCia',
    categoria: 'gatos',
    descricao:
      'Torre arranhador com três andares, plataforma para descanso e corda de sisal natural que ' +
      'ajuda a manter as unhas saudáveis. Estrutura estável, testada para gatos até 8 kg.',
    variantes: [{ combination: {}, priceCents: 3490, oldPriceCents: 3990, costCents: 2000, stock: 14 }],
  },
  {
    titulo: 'Caixa de Areia Miau & Companhia com Tampa',
    slug: 'caixa-areia-miau-com-tampa',
    marca: 'miauCia',
    categoria: 'gatos',
    descricao:
      'Caixa de areia fechada com filtro de carvão ativado que reduz os odores e porta basculante ' +
      'para mais privacidade. Inclui pá amovível para limpeza diária.',
    variantes: [{ combination: {}, priceCents: 2490, costCents: 1400, stock: 20 }],
  },
  {
    titulo: 'Areia Aglomerante Natural Bicho 10L',
    slug: 'areia-aglomerante-natural-bicho-10l',
    marca: 'naturalBicho',
    categoria: 'gatos',
    descricao:
      'Areia aglomerante de baixa poeira, com forte poder de absorção de odores. Aglomera em ' +
      'bolas firmes, fáceis de remover sem sujar o resto da caixa.',
    variantes: [{ combination: {}, priceCents: 899, stock: 48 }],
  },
  {
    titulo: 'Brinquedo Miau & Companhia Varinha com Penas',
    slug: 'brinquedo-miau-varinha-penas',
    marca: 'miauCia',
    categoria: 'gatos',
    descricao:
      'Varinha telescópica com penas naturais na ponta, ideal para estimular o instinto de caça ' +
      'em sessões curtas de brincadeira. Peças de substituição vendidas em separado.',
    variantes: [{ combination: {}, priceCents: 599, costCents: 250, stock: 33 }],
  },
  {
    titulo: 'Transportadora Fauna Norte Gato',
    slug: 'transportadora-fauna-norte-gato',
    marca: 'faunaNorte',
    categoria: 'gatos',
    descricao:
      'Transportadora rígida com porta metálica e ventilação lateral, aprovada para viagens de ' +
      'carro e visitas ao veterinário. Fácil de limpar e com pega reforçada.',
    variantes: [{ combination: {}, priceCents: 2990, costCents: 1700, stock: 9 }],
  },
  {
    titulo: 'Comedouro Elevado Miau & Companhia Duplo',
    slug: 'comedouro-elevado-miau-duplo',
    marca: 'miauCia',
    categoria: 'gatos',
    descricao:
      'Comedouro duplo elevado que facilita a postura ao comer e beber, reduzindo o esforço no ' +
      'pescoço — especialmente útil para gatos mais idosos. Taças em aço inoxidável amovíveis ' +
      'para lavar na máquina.',
    variantes: [{ combination: {}, priceCents: 1590, costCents: 850, stock: 0 }],
  },

  // --- Higiene (5) -----------------------------------------------------------
  {
    titulo: 'Champô Natural Bicho Pelo Sensível 250ml',
    slug: 'champo-natural-bicho-pelo-sensivel-250ml',
    marca: 'naturalBicho',
    categoria: 'higiene',
    descricao:
      'Champô suave à base de aveia, formulado para peles sensíveis e reativas. pH equilibrado ' +
      'para não remover os óleos naturais do pelo do seu animal.',
    variantes: [{ combination: {}, priceCents: 1290, costCents: 620, stock: 5 }],
  },
  {
    titulo: 'Champô Focinho Feliz Filhotes 300ml',
    slug: 'champo-focinho-feliz-filhotes-300ml',
    marca: 'focinhoFeliz',
    categoria: 'higiene',
    descricao:
      'Champô hipoalergénico formulado para a pele delicada dos cachorros, com fórmula lacrimal ' +
      'que não arde nos olhos. Perfume suave que dura vários dias após o banho.',
    variantes: [{ combination: {}, priceCents: 990, costCents: 480, stock: 40 }],
  },
  {
    titulo: 'Toalhitas Petisco Real Limpeza Patas',
    slug: 'toalhitas-petisco-real-limpeza-patas',
    marca: 'petiscoReal',
    categoria: 'higiene',
    descricao:
      'Toalhitas humedecidas para limpar as patas depois do passeio, sem deixar resíduos nem ' +
      'irritar a pele. Prático para o dia a dia, sem precisar de banho completo.',
    variantes: [{ combination: {}, priceCents: 499, stock: 60 }],
  },
  {
    titulo: 'Aparador de Unhas VidaCão Profissional',
    slug: 'aparador-unhas-vidacao-profissional',
    marca: 'vidacao',
    categoria: 'higiene',
    descricao:
      'Aparador com lâmina em aço cirúrgico e travão de segurança que evita cortar demasiado ' +
      'perto do vaso sanguíneo. Cabo emborrachado para um corte mais firme e preciso.',
    variantes: [{ combination: {}, priceCents: 890, costCents: 400, stock: 22 }],
  },
  {
    titulo: 'Absorvente Higiénico Bicharada para Cadelas',
    slug: 'absorvente-higienico-bicharada-cadelas',
    marca: 'bicharada',
    categoria: 'higiene',
    descricao:
      'Pack de fraldas descartáveis para cadelas no cio ou com incontinência ligeira, com ' +
      'elástico ajustável nas patas para não escorregarem. Núcleo absorvente de alta capacidade.',
    variantes: [{ combination: {}, priceCents: 690, costCents: 320, stock: 1 }],
  },

  // --- Acessórios (5) --------------------------------------------------------
  {
    titulo: 'Taça Dupla PatasPro Inox',
    slug: 'taca-dupla-patas-pro-inox',
    marca: 'patasPro',
    categoria: 'acessorios',
    descricao:
      'Conjunto de duas taças em aço inoxidável, resistentes a ferrugem e fáceis de higienizar na ' +
      'máquina de lavar loiça. Base emborrachada antiderrapante que evita escorregar durante as ' +
      'refeições.',
    variantes: [
      { combination: { Cor: 'Preto' }, priceCents: 790, costCents: 380, stock: 30 },
      { combination: { Cor: 'Azul' }, priceCents: 790, costCents: 380, stock: 4 },
      { combination: { Cor: 'Verde' }, priceCents: 790, costCents: 380, stock: 0 },
    ],
  },
  {
    titulo: 'Cinto de Segurança para Carro Trela Certa',
    slug: 'cinto-seguranca-carro-trela-certa',
    marca: 'trelaCerta',
    categoria: 'acessorios',
    descricao:
      'Cinto de segurança que se liga ao peitoral e ao cinto de segurança do carro, para viagens ' +
      'mais seguras e sem distrações ao volante. Fita elástica que absorve travagens bruscas.',
    variantes: [
      { combination: { Tamanho: 'S' }, priceCents: 1290, costCents: 700, stock: 25 },
      { combination: { Tamanho: 'M' }, priceCents: 1290, costCents: 700, stock: 18 },
      { combination: { Tamanho: 'L' }, priceCents: 1290, stock: 6 },
    ],
  },
  {
    titulo: 'Comedouro Lento Bicharada Anti-engasgamento',
    slug: 'comedouro-lento-bicharada-anti-engasgamento',
    marca: 'bicharada',
    categoria: 'acessorios',
    descricao:
      'Comedouro com labirinto interno que obriga o animal a comer mais devagar, reduzindo o ' +
      'risco de engasgamento e regurgitação. Compatível com ração seca e húmida.',
    variantes: [{ combination: {}, priceCents: 1490, costCents: 750, stock: 16 }],
  },
  {
    titulo: 'Cobertor Polar Fauna Norte para Animais',
    slug: 'cobertor-polar-fauna-norte',
    marca: 'faunaNorte',
    categoria: 'acessorios',
    descricao:
      'Cobertor macio em polar, lavável na máquina, pensado para forrar camas, transportadoras ou ' +
      'o banco do carro. Mantém o calor sem pesar nem largar muito pelo.',
    variantes: [
      { combination: { Cor: 'Cinzento' }, priceCents: 1190, costCents: 560, stock: 33 },
      { combination: { Cor: 'Bege' }, priceCents: 1190, costCents: 560, stock: 2 },
    ],
  },
  {
    titulo: 'Kit Viagem PatasPro (Taça Dobrável + Garrafa)',
    slug: 'kit-viagem-patas-pro',
    marca: 'patasPro',
    categoria: 'acessorios',
    descricao:
      'Kit compacto com taça dobrável em silicone e garrafa com dispensador, ideal para passeios ' +
      'longos, praia ou viagens de carro. Cabe em qualquer mochila ou bolsa lateral.',
    variantes: [{ combination: {}, priceCents: 1590, stock: 12 }],
  },

  // --- Brinquedos (4) ----------------------------------------------------
  {
    titulo: 'Bola de Borracha Petisco Real Resistente',
    slug: 'bola-borracha-petisco-real-resistente',
    marca: 'petiscoReal',
    categoria: 'brinquedos',
    descricao:
      'Bola em borracha natural resistente à mordida, com ressalto irregular que torna a ' +
      'brincadeira mais imprevisível. Tamanho pensado para cães médios e grandes.',
    variantes: [{ combination: { 'Animal de destino': 'Cão' }, priceCents: 499, costCents: 210, stock: 70 }],
  },
  {
    titulo: 'Brinquedo de Corda VidaCão Trança Tripla',
    slug: 'brinquedo-corda-vidacao-tranca-tripla',
    marca: 'vidacao',
    categoria: 'brinquedos',
    descricao:
      'Corda de algodão entrançado que ajuda a limpar os dentes durante a brincadeira e resiste ' +
      'bem a puxões de dois cães em simultâneo. Ideal também para brincar com o dono.',
    variantes: [
      {
        combination: { 'Animal de destino': 'Cão' },
        priceCents: 599,
        oldPriceCents: 699,
        costCents: 220,
        stock: 45,
      },
    ],
  },
  {
    titulo: 'Bola de Borracha Promocional Roedix (Brinde)',
    slug: 'bola-borracha-promocional-roedix',
    marca: 'roedix',
    categoria: 'brinquedos',
    descricao:
      'Bolinha leve e colorida, oferecida pelo fornecedor em campanha promocional — vendida a ' +
      'preço simbólico para dar lugar a stock novo. Segura para hamsters e gerbilos brincarem e ' +
      'empurrarem na gaiola.',
    variantes: [{ combination: { 'Animal de destino': 'Roedor' }, priceCents: 199, costCents: 0, stock: 25 }],
  },
  {
    titulo: 'Ratinho de Pelúcia com Catnip Miau & Companhia',
    slug: 'ratinho-pelucia-catnip-miau',
    marca: 'miauCia',
    categoria: 'brinquedos',
    descricao:
      'Ratinho de pelúcia recheado com catnip, que desperta o interesse de gatos mais preguiçosos ' +
      'para brincar. Costuras reforçadas para aguentar mordidelas e patadas.',
    variantes: [{ combination: { 'Animal de destino': 'Gato' }, priceCents: 449, costCents: 180, stock: 3 }],
  },

  // --- Aquário (2) -----------------------------------------------------------
  {
    titulo: 'Filtro Interior AquaVida 200L',
    slug: 'filtro-interior-aquavida-200l',
    marca: 'aquavida',
    categoria: 'aquario',
    descricao:
      'Filtro interior silencioso com esponja de dupla densidade, indicado para aquários até 200 ' +
      'litros. Fácil de abrir para limpeza sem desligar a instalação elétrica.',
    variantes: [{ combination: {}, priceCents: 2490, costCents: 1400, stock: 9 }],
  },
  {
    titulo: 'Kit Plantas Artificiais AquaVida Decor',
    slug: 'kit-plantas-artificiais-aquavida-decor',
    marca: 'aquavida',
    categoria: 'aquario',
    descricao:
      'Conjunto de plantas artificiais atóxicas, com base em cerâmica que as mantém no lugar sem ' +
      'flutuar. Cores fixas que não desbotam com a luz do aquário.',
    variantes: [{ combination: {}, priceCents: 1290, stock: 0 }],
  },

  // --- Pássaros (2) ------------------------------------------------------
  {
    titulo: 'Gaiola PenaViva Voadora Grande',
    slug: 'gaiola-penaviva-voadora-grande',
    marca: 'penaviva',
    categoria: 'passaros',
    descricao:
      'Gaiola espaçosa com poleiros em madeira natural e bandeja amovível para limpeza rápida do ' +
      'fundo. Grades com espaçamento seguro para periquitos e calopsitas.',
    variantes: [{ combination: {}, priceCents: 5990, costCents: 3600, stock: 4 }],
  },
  {
    titulo: 'Poleiro PenaViva Natural Regulável',
    slug: 'poleiro-penaviva-natural-regulavel',
    marca: 'penaviva',
    categoria: 'passaros',
    descricao:
      'Poleiro em madeira natural de diâmetro variável, que ajuda a manter as unhas das aves ' +
      'desgastadas de forma saudável. Fixação universal para a maioria das gaiolas.',
    variantes: [{ combination: {}, priceCents: 890, costCents: 380, stock: 38 }],
  },

  // --- Roedores (1) --------------------------------------------------------
  {
    titulo: 'Gaiola Roedix Hamster Deluxe com Túneis',
    slug: 'gaiola-roedix-hamster-deluxe-tuneis',
    marca: 'roedix',
    categoria: 'roedores',
    descricao:
      'Gaiola modular com túneis, roda de exercício silenciosa e vários pisos para explorar. ' +
      'Portas amplas que facilitam a limpeza e o manuseamento do animal.',
    variantes: [{ combination: {}, priceCents: 3990, costCents: 2200, stock: 7 }],
  },

  // --- Treino (1) ----------------------------------------------------------
  {
    titulo: 'Clicker de Treino VidaCão + Guia',
    slug: 'clicker-treino-vidacao-guia',
    marca: 'vidacao',
    categoria: 'treino',
    descricao:
      'Clicker ergonómico com fita de pulso, acompanhado de um pequeno guia de treino por reforço ' +
      'positivo. Método simples para ensinar comandos básicos em poucas sessões.',
    variantes: [{ combination: {}, priceCents: 599, stock: 42 }],
  },
]

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

const CLIENTES = [
  {
    nome: 'Marta Sousa',
    email: 'marta.sousa@exemplo.pt',
    linha1: 'Rua das Flores, 12',
    codigoPostal: '1200-192',
    localidade: 'Lisboa',
  },
  {
    nome: 'João Pereira',
    email: 'joao.pereira@exemplo.pt',
    linha1: 'Avenida da Boavista, 540',
    codigoPostal: '4050-011',
    localidade: 'Porto',
  },
  {
    nome: 'Beatriz Nunes',
    email: 'beatriz.nunes@exemplo.pt',
    linha1: 'Rua do Souto, 88',
    codigoPostal: '4700-320',
    localidade: 'Braga',
  },
  {
    nome: 'Ricardo Alves',
    email: 'ricardo.alves@exemplo.pt',
    linha1: 'Rua Ferreira Borges, 34',
    codigoPostal: '3000-213',
    localidade: 'Coimbra',
  },
  {
    nome: 'Sofia Martins',
    email: 'sofia.martins@exemplo.pt',
    linha1: 'Rua de Santo António, 7',
    codigoPostal: '8000-078',
    localidade: 'Faro',
  },
  {
    nome: 'Tiago Ferreira',
    email: 'tiago.ferreira@exemplo.pt',
    linha1: 'Rua Direita, 210',
    codigoPostal: '3800-101',
    localidade: 'Aveiro',
  },
  {
    nome: 'Inês Rocha',
    email: 'ines.rocha@exemplo.pt',
    linha1: 'Avenida Luísa Todi, 145',
    codigoPostal: '2900-587',
    localidade: 'Setúbal',
  },
] as const

// ---------------------------------------------------------------------------
// Imagens — geradas localmente com o sharp, sem serviços externos.
// ---------------------------------------------------------------------------

function escaparXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Quebra de linha simples por contagem de caracteres, para caber no cartaz. */
function quebrarLinhas(texto: string, larguraMax: number): string[] {
  const palavras = texto.split(' ')
  const linhas: string[] = []
  let atual = ''
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (tentativa.length > larguraMax && atual) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const LADO = 800

/**
 * Uma imagem quadrada por produto: fundo sólido na cor da categoria (para as
 * categorias serem distinguíveis à vista) com o nome do produto composto por
 * cima em SVG — o sharp compõe o texto sobre a base rasterizada.
 */
async function gerarImagemProduto(titulo: string, corCategoria: string): Promise<Buffer> {
  const base = sharp({
    create: { width: LADO, height: LADO, channels: 3, background: hexParaRgb(corCategoria) },
  })

  const linhas = quebrarLinhas(titulo, 16)
  const alturaLinha = 56
  const yInicial = LADO / 2 - ((linhas.length - 1) * alturaLinha) / 2
  const tspans = linhas
    .map((linha, i) => `<tspan x="${LADO / 2}" y="${yInicial + i * alturaLinha}">${escaparXml(linha)}</tspan>`)
    .join('')

  const overlay = `<svg width="${LADO}" height="${LADO}" xmlns="http://www.w3.org/2000/svg">
    <rect x="28" y="28" width="${LADO - 56}" height="${LADO - 56}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="6"/>
    <text font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${tspans}</text>
  </svg>`

  return base.composite([{ input: Buffer.from(overlay) }]).png().toBuffer()
}

// ---------------------------------------------------------------------------
// RichText mínimo (Lexical) para a descrição dos produtos.
// ---------------------------------------------------------------------------

function paragrafo(texto: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: texto, version: 1 },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

/**
 * Deriva `Product.options` a partir das combinações explícitas de cada
 * variante — uma só fonte de verdade: escrever a variante já escreve a opção.
 * Assume que `variantes` é sempre o produto cartesiano completo das opções
 * (nunca uma combinação parcial), como o `syncVariants` vai gerar de qualquer
 * forma a partir do que aqui sair.
 */
function deriveOptions(
  variantes: VarianteSpec[],
): { name: string; values: { value: string }[] }[] {
  const ordem: string[] = []
  const valores = new Map<string, string[]>()

  for (const v of variantes) {
    for (const [chave, valor] of Object.entries(v.combination)) {
      if (!valores.has(chave)) {
        valores.set(chave, [])
        ordem.push(chave)
      }
      const lista = valores.get(chave)!
      if (!lista.includes(valor)) lista.push(valor)
    }
  }

  return ordem.map((nome) => ({ name: nome, values: valores.get(nome)!.map((value) => ({ value })) }))
}

// ---------------------------------------------------------------------------
// Limpeza — apaga o catálogo de teste antes de o recriar.
// ---------------------------------------------------------------------------

/** Idioma comum do Payload para "todos os documentos desta coleção". */
const TUDO = { id: { exists: true } }

async function limpar(payload: Payload): Promise<void> {
  // Primeiro: esvaziar a configuração de filtros. Sem isto, apagar os
  // atributos de uma corrida anterior é recusado — `bloquearApagarSeConfigurado`
  // vê-os ainda referenciados na configuração da corrida passada.
  await payload.updateGlobal({
    slug: 'configuracao-filtros',
    data: { padrao: [], porCategoria: [] },
  })

  // Encomendas e clientes antes dos produtos: apontam para variantes.
  await payload.delete({ collection: 'orders', where: TUDO })
  await payload.delete({ collection: 'customers', where: TUDO })
  // Produtos apagam as suas variantes sozinhos (`deleteVariantsOfProduct`).
  await payload.delete({ collection: 'products', where: TUDO })
  await payload.delete({ collection: 'brands', where: TUDO })
  await payload.delete({ collection: 'categories', where: TUDO })
  await payload.delete({ collection: 'attributes', where: TUDO })
  await payload.delete({ collection: 'media', where: TUDO })
}

// ---------------------------------------------------------------------------
// Categorias, marcas, atributos, configuração de filtros
// ---------------------------------------------------------------------------

async function criarCategorias(payload: Payload): Promise<Record<CategoriaChave, number>> {
  const ids = {} as Record<CategoriaChave, number>
  for (const c of CATEGORIAS) {
    const doc = await payload.create({ collection: 'categories', data: { name: c.name, slug: c.slug } })
    ids[c.chave] = Number(doc.id)
  }
  return ids
}

async function criarMarcas(payload: Payload): Promise<Record<MarcaChave, number>> {
  const ids = {} as Record<MarcaChave, number>
  for (const m of MARCAS) {
    const doc = await payload.create({ collection: 'brands', data: { name: m.name, slug: m.slug } })
    ids[m.chave] = Number(doc.id)
  }
  return ids
}

async function criarAtributos(payload: Payload): Promise<number[]> {
  const ids: number[] = []
  for (const [i, a] of ATRIBUTOS.entries()) {
    const doc = await payload.create({
      collection: 'attributes',
      data: {
        nome: a.nome,
        chave: a.chave,
        tipo: a.tipo,
        alcance: 'filtro',
        controlo: a.controlo,
        ordem: i,
      },
    })
    ids.push(Number(doc.id))
  }
  return ids
}

async function configurarFiltros(payload: Payload, atributoIds: number[]): Promise<void> {
  await payload.updateGlobal({
    slug: 'configuracao-filtros',
    data: {
      padrao: atributoIds.map((id) => ({ atributo: id, visivel: true })),
      porCategoria: [],
    },
  })
}

// ---------------------------------------------------------------------------
// Produtos e variantes
// ---------------------------------------------------------------------------

async function criarProduto(
  payload: Payload,
  spec: ProdutoSpec,
  categoriaIds: Record<CategoriaChave, number>,
  marcaIds: Record<MarcaChave, number>,
): Promise<number> {
  const categoriaNome = CATEGORIAS.find((c) => c.chave === spec.categoria)!.name
  const cor = CORES_CATEGORIA[spec.categoria]

  const imagemBuffer = await gerarImagemProduto(spec.titulo, cor)
  const alt = `Fotografia do produto ${spec.titulo}, da categoria ${categoriaNome}, loja Animora.`
  const imagem = await payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data: imagemBuffer,
      mimetype: 'image/png',
      name: `${spec.slug}.png`,
      size: imagemBuffer.length,
    },
  })

  const produto = await payload.create({
    collection: 'products',
    data: {
      title: spec.titulo,
      slug: spec.slug,
      description: paragrafo(spec.descricao),
      brand: marcaIds[spec.marca],
      categories: [categoriaIds[spec.categoria]],
      options: deriveOptions(spec.variantes),
      gallery: [{ image: imagem.id }],
      primaryImage: imagem.id,
    },
  })

  // `syncVariants` (afterChange) já criou uma linha por combinação, a 0€/0
  // unidades. Aqui só se preenchem os valores reais, por combinação.
  const { docs: variantesCriadas } = await payload.find({
    collection: 'variants',
    where: { product: { equals: produto.id } },
    depth: 0,
    limit: 0,
  })

  for (const vSpec of spec.variantes) {
    const chave = combinationKey(vSpec.combination)
    const linha = variantesCriadas.find((v) => combinationKey(v.combination as Record<string, string>) === chave)
    if (!linha) {
      throw new Error(
        `Variante não encontrada para "${spec.titulo}": ${JSON.stringify(vSpec.combination)}`,
      )
    }

    await payload.update({
      collection: 'variants',
      id: linha.id,
      data: {
        priceCents: vSpec.priceCents,
        ...(vSpec.oldPriceCents !== undefined ? { oldPriceCents: vSpec.oldPriceCents } : {}),
        ajusteStock: vSpec.stock,
        ...(vSpec.costCents !== undefined ? { costCents: vSpec.costCents } : {}),
      },
    })
  }

  await payload.update({ collection: 'products', id: produto.id, data: { _status: 'published' } })

  return spec.variantes.length
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

type ClienteCriado = { id: number; email: string; morada: Record<string, string> }

async function criarClientes(payload: Payload): Promise<ClienteCriado[]> {
  const criados: ClienteCriado[] = []
  for (const c of CLIENTES) {
    const morada = {
      nomeDestinatario: c.nome,
      linha1: c.linha1,
      codigoPostal: c.codigoPostal,
      localidade: c.localidade,
    }
    const doc = await payload.create({
      collection: 'customers',
      data: {
        email: c.email,
        password: 'animora123',
        nome: c.nome,
        moradas: [{ etiqueta: 'Casa', ...morada }],
      },
    })
    criados.push({ id: Number(doc.id), email: c.email, morada })
  }
  return criados
}

// ---------------------------------------------------------------------------
// Encomendas — pelo checkout real (`finalizarCompra`), que respeita o stock.
// ---------------------------------------------------------------------------

const NUM_ENCOMENDAS = 20
const DIA_MS = 86_400_000
const ESTADOS_CICLO = ['pago', 'pago', 'pago', 'enviado', 'enviado', 'entregue', 'entregue', 'a-aguardar-pagamento'] as const

async function criarEncomendas(payload: Payload, clientes: ClienteCriado[]): Promise<number> {
  const { docs: variantesVendaveis } = await payload.find({
    collection: 'variants',
    where: {
      and: [
        { active: { equals: true } },
        { priceCents: { greater_than: 0 } },
        { stock: { greater_than: 0 } },
      ],
    },
    depth: 0,
    limit: 0,
  })

  const estoque = new Map<number, number>(variantesVendaveis.map((v) => [Number(v.id), v.stock]))
  const idsDisponiveis = [...estoque.keys()]

  const criadas: number[] = []

  for (let i = 0; i < NUM_ENCOMENDAS; i++) {
    // Os primeiros pedidos cobrem cada cliente pelo menos uma vez; o resto é
    // aleatório (com semente fixa) entre todos.
    const cliente = i < clientes.length ? clientes[i]! : escolher(clientes)

    const numLinhas = inteiroEntre(1, 3)
    const linhas: { variantId: number; qty: number }[] = []
    const usadosNestaEncomenda = new Set<number>()

    for (let j = 0; j < numLinhas; j++) {
      const candidatos = idsDisponiveis.filter(
        (id) => !usadosNestaEncomenda.has(id) && (estoque.get(id) ?? 0) > 0,
      )
      if (candidatos.length === 0) break

      const variantId = escolher(candidatos)
      const stockAtual = estoque.get(variantId)!
      const qty = Math.min(inteiroEntre(1, 2), stockAtual)

      linhas.push({ variantId, qty })
      usadosNestaEncomenda.add(variantId)
      estoque.set(variantId, stockAtual - qty)
    }

    if (linhas.length === 0) continue

    const req = await createLocalReq({ user: { ...cliente, collection: 'customers' } as never }, payload)
    const resposta = await finalizarCompra(req, {
      linhas,
      moradaEnvio: cliente.morada,
    })

    if (resposta.status !== 201) {
      console.warn(`  aviso: encomenda ${i} recusada (${resposta.status}):`, await resposta.json())
      continue
    }

    const corpo = (await resposta.json()) as { id: number }
    criadas.push(corpo.id)
  }

  // Estados variados e datas espalhadas pelos últimos 60 dias. A primeira
  // encomenda criada torna-se a única cancelada — a transição por `update`
  // repõe o stock que ela tinha reservado (`reporStockAoCancelar`).
  const db = payload.db as unknown as { drizzle: { execute: (sql: string) => Promise<unknown> } }

  for (const [i, id] of criadas.entries()) {
    const estado = i === 0 ? 'cancelado' : ESTADOS_CICLO[i % ESTADOS_CICLO.length]!
    if (estado !== 'a-aguardar-pagamento') {
      await payload.update({ collection: 'orders', id, data: { estado } })
    }

    const dataEncomenda = new Date(Date.now() - inteiroEntre(0, 59) * DIA_MS).toISOString()
    await db.drizzle.execute(
      `update orders set created_at = '${dataEncomenda}', updated_at = '${dataEncomenda}' where id = ${id}`,
    )
  }

  return criadas.length
}

// ---------------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const payload = await getPayload({ config })

  try {
    console.log('A limpar o catálogo existente...')
    await limpar(payload)

    console.log('A criar categorias e marcas...')
    const categoriaIds = await criarCategorias(payload)
    const marcaIds = await criarMarcas(payload)

    console.log('A criar atributos e configuração de filtros...')
    const atributoIds = await criarAtributos(payload)
    await configurarFiltros(payload, atributoIds)

    console.log(`A criar ${PRODUTOS.length} produtos...`)
    let totalVariantes = 0
    for (const spec of PRODUTOS) {
      totalVariantes += await criarProduto(payload, spec, categoriaIds, marcaIds)
    }

    console.log('A criar clientes...')
    const clientes = await criarClientes(payload)

    console.log('A criar encomendas...')
    const numEncomendas = await criarEncomendas(payload, clientes)

    // A trava do dashboard fica sempre ligada no fim do seeder, mesmo que
    // alguém a tenha desbloqueado a meio de uma verificação manual.
    await payload.updateGlobal({ slug: 'definicoes', data: { dashboardDesbloqueado: false } })

    console.log(
      `\nConcluído: ${CATEGORIAS.length} categorias, ${MARCAS.length} marcas, ` +
        `${ATRIBUTOS.length} atributos, ${PRODUTOS.length} produtos (${totalVariantes} variantes), ` +
        `${clientes.length} clientes, ${numEncomendas} encomendas. Dashboard bloqueado.`,
    )
  } finally {
    await payload.destroy()
  }
}

await main()
