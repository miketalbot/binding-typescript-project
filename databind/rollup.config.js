// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.tsx",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
    },
  ],
  external: ["react", "react-dom"],
  plugins: [typescript(), resolve()],
  watch: {
    include: "src/**",
  },
};
