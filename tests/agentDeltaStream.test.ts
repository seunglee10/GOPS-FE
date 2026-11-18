import assert from "node:assert/strict";
import test from "node:test";
import { agentDeltaPreview, createAgentDeltaAccumulator, parseAgentDelta, requestAgentAnalysisPayload } from "../src/agent/agentAnalysisClient";

const report = (status: string, extra: Record<string, unknown> = {}) => ({
  analysisId: "a1",
  symbol: "AAPL",
  status,
  summary: "요약",
  route: { source: "rules", intentType: "analysis", selectedRoles: ["financial"] },
  agentAnswers: [],
  findings: [],
  providerEvidence: [],
  dailySummaries: [],
  ...extra
});

type Listener = (event: { data: string }) => void;
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, Listener[]>();
  closed = false;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, listener: Listener) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  close() {
    this.closed = true;
  }
  emit(name: string, payload: unknown) {
    for (const listener of this.listeners.get(name) ?? []) {
      listener({ data: JSON.stringify(payload) });
    }
  }
}

const delta = (seq: number, text: string) => ({ analysisId: "a1", seq, text });

function setup(statusReports: unknown[] = []) {
  FakeEventSource.instances = [];
  const g = globalThis as Record<string, unknown>;
  const original = { fetch: g.fetch, EventSource: g.EventSource };
  g.EventSource = FakeEventSource;
  // 폴링 대기(sleep)가 브라우저의 window.setTimeout을 쓰므로 Node에서는 globalThis로 대신한다.
  const hadWindow = "window" in g;
  if (!hadWindow) {
    g.window = globalThis;
  }
  let polled = 0;
  g.fetch = async (url: string) => {
    if (String(url).includes("/analyze")) {
      return new Response(JSON.stringify({ ...report("queued"), request_id: "a1", status_url: "/api/agents/reports/a1", stream_url: "/api/agents/reports/a1/stream" }), { status: 202 });
    }
    polled += 1;
    return new Response(JSON.stringify(statusReports.shift() ?? report("running")), { status: 200 });
  };
  return {
    polls: () => polled,
    restore: () => {
      g.fetch = original.fetch;
      g.EventSource = original.EventSource;
      if (!hadWindow) {
        delete g.window;
      }
    }
  };
}

async function started(promise: Promise<unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 20)); // fetch 응답 뒤 EventSource가 만들어질 때까지
  const source = FakeEventSource.instances[0];
  assert.ok(source, "EventSource가 열려야 한다");
  return { source, promise };
}

test("delta text accumulates in seq order and the final report resolves the request", async () => {
  const env = setup();
  try {
    const seen: string[] = [];
    const promise = requestAgentAnalysisPayload({ symbol: "AAPL" }, { onDelta: (text) => seen.push(text) });
    const { source } = await started(promise);
    source.emit("delta", delta(1, "첫 "));
    source.emit("delta", delta(2, "문장"));
    source.emit("delta", delta(3, "입니다."));
    source.emit("report", report("completed", { finalAnswer: { title: "t", summary: "첫 문장입니다.", sections: [], citations: [], limitations: [] } }));
    const result = await promise;
    assert.deepEqual(seen, ["첫 ", "첫 문장", "첫 문장입니다."]);
    assert.equal((result as { status: string }).status, "completed");
    assert.equal(source.closed, true);
  } finally {
    env.restore();
  }
});

test("duplicate and replayed deltas are ignored", () => {
  const acc = createAgentDeltaAccumulator();
  assert.equal(acc.push(delta(1, "가")), "가");
  assert.equal(acc.push(delta(1, "가")), null);
  assert.equal(acc.push(delta(2, "나")), "가나");
  assert.equal(acc.push(delta(2, "나")), null);
  assert.equal(acc.push(delta(1, "가")), null);
});

test("a skipped seq stops delta rendering instead of showing a broken sentence", () => {
  const acc = createAgentDeltaAccumulator();
  assert.equal(acc.push(delta(1, "가")), "가");
  assert.equal(acc.push(delta(3, "다")), null);
  assert.equal(acc.push(delta(4, "라")), null);
});

test("stream failure mid-answer falls back to polling and still returns the final report", async () => {
  const env = setup([report("running"), report("completed", { summary: "폴링으로 받은 최종 답변" })]);
  try {
    const seen: string[] = [];
    const promise = requestAgentAnalysisPayload({ symbol: "AAPL" }, { onDelta: (text) => seen.push(text) });
    const { source } = await started(promise);
    source.emit("delta", delta(1, "일부"));
    source.onerror?.();
    const result = (await promise) as { status: string; summary: string };
    assert.deepEqual(seen, ["일부"]);
    assert.equal(result.status, "completed");
    assert.equal(result.summary, "폴링으로 받은 최종 답변");
    assert.ok(env.polls() >= 2);
    assert.equal(source.closed, true);
  } finally {
    env.restore();
  }
});

test("aborting the request closes the stream", async () => {
  const env = setup();
  try {
    const controller = new AbortController();
    const promise = requestAgentAnalysisPayload({ symbol: "AAPL" }, { signal: controller.signal });
    const { source } = await started(promise);
    controller.abort();
    await assert.rejects(promise);
    assert.equal(source.closed, true);
  } finally {
    env.restore();
  }
});

test("malformed delta payloads are ignored", () => {
  assert.equal(parseAgentDelta("not json"), null);
  assert.equal(parseAgentDelta(JSON.stringify({ analysisId: "a1", seq: "1", text: "x" })), null);
  assert.deepEqual(parseAgentDelta(JSON.stringify(delta(1, "x"))), delta(1, "x"));
});

test("preview keeps the latest part of a long sentence on one line", () => {
  assert.equal(agentDeltaPreview("짧은  문장\n입니다."), "짧은 문장 입니다.");
  const long = "가".repeat(100);
  const preview = agentDeltaPreview(long, 20);
  assert.equal(preview.length, 20);
  assert.ok(preview.startsWith("…"));
});

test("oversized or runaway delta streams stop accumulating", () => {
  const huge = createAgentDeltaAccumulator();
  assert.equal(huge.push(delta(1, "가".repeat(5000))), null);
  assert.equal(huge.push(delta(2, "나")), null);

  const runaway = createAgentDeltaAccumulator();
  let last: string | null = "";
  for (let seq = 1; seq <= 12; seq += 1) {
    last = runaway.push(delta(seq, "가".repeat(4000)));
  }
  assert.equal(last, null);
});

test("preview strips control and bidi characters", () => {
  const preview = agentDeltaPreview("정상\u202e문장\u0007\u200b끝");
  assert.ok(!/[\u0000-\u001f\u200b-\u200f\u202a-\u202e]/.test(preview));
  assert.equal(preview, "정상 문장 끝");
});

test("preview strips unicode format characters beyond the common bidi set", () => {
  // U+061C(아랍 문자 표시), U+2060(단어 결합자), U+E0041(태그 문자), 짝 없는 서로게이트
  const preview = agentDeltaPreview("가\u061c나\u2060다\u{E0041}라\ud800마");
  assert.equal(preview, "가 나 다 라 마");
});

test("preview never leaves a lone surrogate when truncating emoji-heavy text", () => {
  for (let max = 3; max < 12; max += 1) {
    const preview = agentDeltaPreview("😀".repeat(40), max);
    assert.ok(!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(preview), `max=${max}`);
    assert.equal(Array.from(preview).length, max);
  }
});

test("preview turns invisible filler characters into spaces", () => {
  assert.equal(agentDeltaPreview("가\u3164나\u2800다"), "가 나 다");
});
