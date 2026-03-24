import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.js",
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  // Node built-ins should not be bundled
  external: ["node:*", "crypto", "fs", "path", "events", "http", "https", "net", "tls", "url", "util", "stream", "zlib", "os", "child_process"],
});
