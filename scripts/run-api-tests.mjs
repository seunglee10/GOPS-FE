import { mkdir, unlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const outfile = new URL("../.tmp/api-mappers-test.mjs", import.meta.url);
await mkdir(new URL("../.tmp/", import.meta.url), { recursive: true });

try {
  await build({
    entryPoints: [fileURLToPath(new URL("../tests/apiMappers.test.ts", import.meta.url))],
    outfile: fileURLToPath(outfile),
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: false,
    logLevel: "silent",
    define: { "import.meta.env.VITE_DATA_SOURCE": '"api"' },
    external: ["react", "react-dom"]
  });
  await import(`${pathToFileURL(fileURLToPath(outfile)).href}?t=${Date.now()}`);
  console.log("api mapper tests passed");
} finally {
  await unlink(outfile).catch(() => undefined);
}
