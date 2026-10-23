import type { Config } from 'tailwindcss'

/**
 * O vocabulário visual da loja, e nada além dele.
 *
 * A regra que governa esta lista continua a ser **uma cor, uma função**.
 * Esta paleta substitui por completo a anterior (`ink`/`terracota`/`sage`/
 * `papel`/`floresta`) — não há aliases de compatibilidade nem as duas
 * paletas lado a lado. Fonte única dos valores: tabela de tokens em
 * `docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md` §5.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fundo da loja: branco puro (pedido do Gabriel — o quase-branco
        // #FFFDFC lia-se bege). A profundidade dos cartões vem da borda e da
        // sombra, não de um tom de fundo diferente.
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        // Creme pontual: faixas e blocos que precisam de se distinguir do
        // fundo sem virar cor de marca.
        cream: '#FDF3EC',
        // A única cor de ação da loja: se algo é laranja, é clicável ou está
        // ativo. `hover` é o tom mais escuro — mais escrutínio, mais peso.
        //
        // Valor amostrado diretamente do banner/mockup de referência do
        // Gabriel (`#ED6900`), não o `#F57C00` da spec original — o pedido
        // explícito foi bater com a referência visual, não com o valor
        // escrito na spec. Nota de acessibilidade, não bloqueio: texto
        // branco sobre este laranja dá ~3,17:1 (falha o 4,5:1 de texto
        // normal, quase atinge o 3:1 de texto grande) — a própria
        // referência aceita esse compromisso, e é uma melhoria sobre o
        // `#F57C00` original (2,70:1). `orange-deep` fica disponível para
        // quem precisar de mais contraste, mas deixou de ser o valor
        // predefinido dos botões/barra promocional.
        orange: { DEFAULT: '#ED6900', hover: '#D15C00' },
        'orange-deep': '#B85800',
        // Teal faz o trabalho que `ink`/`sage` faziam: estrutura, títulos e
        // apoio. Dois tons só, sem escala intermédia.
        'teal-900': '#085B6B',
        'teal-700': '#0F6F78',
        // Acento de contraste — o único tom saturado fora do laranja.
        aqua: '#00B4B0',
        // Texto de leitura e o seu tom secundário. Mais frio que `teal-900`
        // de propósito: texto corrido não deve competir com títulos.
        text: '#103F46',
        'text-muted': '#647679',
        // Divisória hairline, neutra — já não deriva de `sage` a 18%.
        border: '#E8ECEC',
        // Estado, não marca: usados só em confirmação/erro, nunca em UI de
        // ação (isso é `orange`).
        success: '#1F8A5B',
        danger: '#C84444',
      },
      fontFamily: {
        // Três famílias: Fredoka nos títulos (rounded, nunca abaixo de 24px),
        // Montserrat no texto/interface, Caveat só em manuscrito decorativo
        // — nunca em informação funcional. Carregadas por `next/font` no
        // layout.
        display: ['var(--fonte-titulo)', 'system-ui', 'sans-serif'],
        sans: ['var(--fonte-texto)', 'system-ui', 'sans-serif'],
        script: ['var(--fonte-manuscrita)', 'cursive'],
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
        // O ar entre secções, também num sítio só. Reduzido (era
        // `clamp(4rem, 9vw, 8rem)`, 64-128px): lido como vitrine editorial
        // espaçada em vez de comércio — a home é a única consumidora deste
        // token (PLP e PDP têm o próprio ritmo), por isso mexer aqui compacta
        // só ela.
        secao: 'clamp(2.5rem, 6vw, 4rem)',
      },
      maxWidth: {
        // A medida do texto corrido. Mais do que isto e o olho perde a linha.
        leitura: '62ch',
      },
      borderRadius: {
        // Cinco raios, hierarquia de campo a superfície de campanha. Eram
        // dois (`campo` 10px, `card` 14px), sem cobrir pílulas nem
        // superfícies grandes.
        sm: '10px',
        md: '16px',
        lg: '22px',
        xl: '28px',
        pill: '999px',
      },
      boxShadow: {
        // Três elevações, todas tingidas de teal (não preto neutro): repouso
        // de cartão, hover de cartão, e drawer/modal — que continua neutro
        // porque cobre a página inteira e não deve ler como parte da marca.
        card: '0 6px 24px rgba(8, 91, 107, 0.06)',
        'card-hover': '0 12px 32px rgba(8, 91, 107, 0.10)',
        drawer: '0 20px 60px rgba(0, 0, 0, 0.16)',
      },
      transitionTimingFunction: {
        // A curva da loja, uma só. Substitui `loja` — mesma função (uma
        // curva, para tudo o que se move), nome novo para acompanhar a
        // troca de identidade.
        brand: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      /**
       * Animação do Hero em CSS puro (sem GSAP) — o padrão pedido pelo
       * Gabriel, calcado no `Hero`/`HeroMedia` do vivapapelcor
       * (`Vivapapelcor/web/src/app/globals.css`): uma camada entra (fade +
       * translateY + leve rotação a partir de `--tilt`), depois flutua em
       * loop (`--sway`). `cubic-bezier(0.445, 0.05, 0.55, 0.95)` é a curva
       * seno usada lá para movimento contínuo — acelera/desacelera devagar,
       * sem a sensação de "mola mecânica" que o `ease-in-out` padrão tem em
       * loop.
       */
      keyframes: {
        'hero-enter': {
          from: { opacity: '0', transform: 'translateY(28px) scale(0.92) rotate(var(--tilt, 0deg))' },
          to: { opacity: '1', transform: 'translateY(0) scale(1) rotate(0deg)' },
        },
        'hero-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(var(--sway, 0deg))' },
        },
        'hero-copy': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // O cartão do banner inteiro assenta primeiro; as camadas lá dentro
        // (hero-enter/hero-copy) chegam por cima dele.
        'hero-banner': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'entrada-cima': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'hero-enter': 'hero-enter 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        'hero-float': 'hero-float 4s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite',
        'hero-copy': 'hero-copy 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        // `backwards` e não `both`: o estado inicial vale durante o atraso,
        // mas no fim não fica `transform` nenhum agarrado — um `transform`
        // permanente criaria um contexto de empilhamento e prenderia o painel
        // do mega-menu por baixo do banner.
        'hero-banner': 'hero-banner 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s backwards',
        'entrada-cima': 'entrada-cima 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards',
      },
    },
  },
  plugins: [],
} satisfies Config
