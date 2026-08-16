import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta herdada de legacy/styles.css — verde escuro, terracota, creme
        ink: '#18352A',
        'ink-muted': '#4F685F',
        terracota: { DEFAULT: '#D9825B', dark: '#BF6A44', strong: '#C76E47' },
        sage: { DEFAULT: '#6F8F72', dark: '#58735E' },
        cream: '#F7F5EF',
        line: 'rgba(111, 143, 114, 0.18)',
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
