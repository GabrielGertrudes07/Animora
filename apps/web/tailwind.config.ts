import type { Config } from 'tailwindcss'

/**
 * O vocabulário visual da loja, e nada além dele.
 *
 * A regra que governa esta lista é **uma cor, uma função**. A versão anterior
 * tinha dezanove cores em cinco famílias, das quais quatro eram quentes e
 * competiam pelo mesmo papel — `terracota`, `promo`, `sol` e `dourado`.
 *
 * A razão de fundo era uma regra do design system que mandava amostrar a
 * paleta do pacote de arte da campanha (`public/banner/`): a loja herdava as
 * cores do cartaz e, com elas, a gama do cartaz — dourado metálico, laranja
 * lustroso, brilho. Essa regra inverteu-se: **a marca dita a arte**, e a arte
 * gerada obedece a esta lista. Ver
 * `docs/superpowers/specs/2026-08-28-linguagem-visual-premium-design.md`.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Texto. Verde-escuro de confiança e o seu tom de apoio.
        ink: '#18352A',
        'ink-muted': '#4F685F',
        // A única cor de ação da loja: se algo é terracota, é clicável ou está
        // ativo. Mais contido do que o `#F2703A` anterior, que era uma amostra
        // do botão do cartaz — saturado para gritar dentro de um banner.
        terracota: { DEFAULT: '#E0623A', dark: '#C44A24' },
        // Apoio botânico: ilustrações de estado vazio, marca de água do
        // placeholder, avisos calmos. Nunca texto de leitura.
        sage: '#6F8F72',
        // Superfície tingida. Colapsa o `cream` e o `creme-luz` anteriores —
        // estavam a menos de 3% de distância percetual e faziam o mesmo
        // trabalho em sítios diferentes. É também o texto sobre floresta.
        papel: '#F7F5EF',
        line: 'rgba(111, 143, 114, 0.18)',
        // O chão das superfícies de campanha. `fundo` reabriu de `#061003`
        // (quase preto, que matava a leitura de clareira) para este.
        floresta: { DEFAULT: '#0D2305', fundo: '#0A1A06' },
      },
      fontFamily: {
        // Duas famílias e mais nada: Bricolage Grotesque nos títulos (nunca
        // abaixo de 24px — em corpo pequeno não lê como display, lê como
        // irregular) e Figtree no texto. Carregadas por `next/font` no layout.
        display: ['var(--fonte-titulo)', 'Georgia', 'serif'],
        sans: ['var(--fonte-texto)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // A escala, num sítio só. Antes cada secção escrevia
        // `text-3xl sm:text-4xl` à mão e o tamanho derrapava entre páginas.
        display: ['clamp(2.75rem, 6vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        titulo: ['clamp(1.75rem, 3vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        secao: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.14em' }],
      },
      spacing: {
        // O ar entre secções, também num sítio só.
        secao: 'clamp(4rem, 9vw, 8rem)',
      },
      maxWidth: {
        // A medida do texto corrido. Mais do que isto e o olho perde a linha.
        leitura: '62ch',
      },
      borderRadius: {
        // Três raios. Eram cinco (`lg` 33×, `card` 23×, `full` 14×, `xl` 6×,
        // `2xl` 1×), sem nenhuma regra sobre qual usar onde.
        campo: '10px',
        card: '14px',
      },
      boxShadow: {
        // Duas elevações, ambas na cor da marca e não em preto neutro.
        sm: '0 10px 20px rgba(24, 53, 42, 0.06)',
        md: '0 18px 45px rgba(24, 53, 42, 0.12)',
      },
      transitionTimingFunction: {
        // A curva da loja, uma só. Estava escrita à mão no carrossel.
        loja: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
