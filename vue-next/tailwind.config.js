/** Tailwind acotado a `.rym-tw` y sin preflight para no alterar los estilos legacy de index.html. */
export default {
  content: ['./src/**/*.{vue,ts}'],
  important: '.rym-tw',
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
}
