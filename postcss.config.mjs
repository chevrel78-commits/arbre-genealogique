// Tailwind CSS par PostCSS : utilisé par Turbopack (développement) comme par Webpack (construction
// de production, voir le script « build » de package.json).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
