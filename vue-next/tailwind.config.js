/** Tailwind acotado a `.rym-tw` y sin preflight para no alterar los estilos legacy de index.html. */
export default {
  content: ['./src/**/*.{vue,ts}'],
  important: '.rym-tw',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        /* Paleta viva RYM: naranja, azul, verde, amarillo, gris y negro */
        rym: {
          orange: { 50: '#fff4ea', 100: '#ffe4cc', 400: '#ff9a3d', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
          blue: { 50: '#eaf2ff', 100: '#d4e4ff', 400: '#4f8ff0', 500: '#2563eb', 600: '#1d4fd8', 800: '#12356f', 900: '#0f2b48' },
          green: { 50: '#e8faf2', 100: '#c9f2de', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857' },
          yellow: { 50: '#fff9e0', 100: '#fff0b3', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
          gray: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 400: '#94a3b8', 500: '#64748b', 700: '#334155' },
          black: { 700: '#1e293b', 800: '#0f172a', 900: '#020617' },
        },
      },
      keyframes: {
        'rym-fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'rym-glow': { '0%,100%': { boxShadow: '0 0 0 0 rgba(249,115,22,.35)' }, '50%': { boxShadow: '0 0 0 8px rgba(249,115,22,0)' } },
        'rym-shine': { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
        'rym-bar': { '0%': { width: '0%' } },
      },
      animation: {
        'rym-fade-up': 'rym-fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'rym-glow': 'rym-glow 2.2s ease-in-out infinite',
        'rym-shine': 'rym-shine 3.2s ease-in-out infinite',
        'rym-bar': 'rym-bar .9s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
