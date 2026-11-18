// 역할: AI 답변 SSE delta 클라이언트 테스트를 단독 프로세스로 돌린다.
// 이유: 이 테스트는 전역 fetch·EventSource를 바꾸고 폴링 대기를 기다린다. 여러 테스트 파일을 한 프로세스에서
//       차례로 import하는 러너(run-layout-tests 등)에 섞으면 뒤쪽 파일이 로드되며 전역 fetch를 덮어써 깨진다.
import { mkdir, unlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const outfile = new URL("../.tmp/agent-delta-stream-test.mjs", import.meta.url);
await mkdir(new URL("../.tmp/", import.meta.url), { recursive: true });

try {
  await build({
    entryPoints: [fileURLToPath(new URL("../tests/agentDeltaStream.test.ts", import.meta.url))],
    outfile: fileURLToPath(outfile),
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: false,
    logLevel: "silent",
    external: ["react", "react-dom"]
  });
  await import(`${pathToFileURL(fileURLToPath(outfile)).href}?t=${Date.now()}`);
} finally {
  await unlink(outfile).catch(() => undefined);
}
