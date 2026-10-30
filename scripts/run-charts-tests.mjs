import { mkdir, unlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const testCases = [
  {
    entry: new URL("../src/charts/__tests__/indicators.test.ts", import.meta.url),
    outfile: new URL("../.tmp/charts-indicators-test.mjs", import.meta.url)
  }
];
await mkdir(new URL("../.tmp/", import.meta.url), { recursive: true });

try {
  for (const [index, testCase] of testCases.entries()) {
    await build({
      entryPoints: [fileURLToPath(testCase.entry)],
      outfile: fileURLToPath(testCase.outfile),
      bundle: true,
      platform: "node",
      format: "esm",
      sourcemap: false,
      logLevel: "silent"
    });

    await import(`${pathToFileURL(fileURLToPath(testCase.outfile)).href}?t=${Date.now()}-${index}`);
  }
} finally {
  await Promise.all(testCases.map((testCase) => unlink(testCase.outfile).catch(() => undefined)));
}
