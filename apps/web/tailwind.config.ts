import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde-escuro (confiança, texto) + terracota (energia da marca,
        // agora mais viva — ver docs/superpowers/specs do redesign) + creme
        // (só para superfícies pontuais, o fundo da loja passou a branco).
        ink: '#18352A',
        'ink-muted': '#4F685F',
        terracota: { DEFAULT: '#F2703A', dark: '#D6531F', strong: '#C76E47' },
        sage: { DEFAULT: '#6F8F72', dark: '#58735E', soft: '#E1F3E7' },
        // Só para desconto/urgência — nunca reutilizado como cor de marca.
        promo: { DEFAULT: '#E63946', dark: '#C22836', soft: '#FCE1E3' },
        cream: '#F7F5EF',
        line: 'rgba(111, 143, 114, 0.18)',
      },
      fontFamily: {
        // Duas famílias e mais nada: uma de título com carácter (Fraunces,
        // serifa suave) e uma de texto legível (Nunito Sans). Carregadas por
        // `next/font` no layout, que as auto-aloja e evita o salto de fonte.
        display: ['var(--fonte-titulo)', 'Georgia', 'serif'],
        sans: ['var(--fonte-texto)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '18px' },
      boxShadow: {
        sm: '0 10px 20px rgba(24, 53, 42, 0.06)',
        md: '0 18px 45px rgba(24, 53, 42, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
