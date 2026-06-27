// Babel is only used by Jest (NODE_ENV=test). Vite/esbuild handles dev & build,
// so these presets are scoped to the "test" env to avoid affecting the bundler.
module.exports = {
  env: {
    test: {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        "@babel/preset-typescript",
        ["@babel/preset-react", { runtime: "automatic" }],
      ],
      plugins: ["babel-plugin-transform-import-meta"],
    },
  },
};
