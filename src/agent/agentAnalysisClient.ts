import {
  formatAgentAnalysisReport,
  normalizeAgentAnalysisReport,
  normalizeLayoutProposal,
  type AgentAnalysisReport,
  type IntentRoute
} from "./agentAnalysis";
import type { AgentLayoutProposal } from "../layout/agentLayoutTypes";
import { readArray, readObject } from "../shared/json";

const AGENT_REPORT_TERMINAL_STATUSES = new Set(["completed", "deep_completed", "failed", "canceled"]);
const AGENT_REPORT_POLL_INTERVAL_MS = 1000;
const AGENT_REPORT_POLL_TIMEOUT_MS = 120000;
const AGENT_ENTITY_RESOLVE_STATUSES = new Set<AgentEntityResolveStatus>(["confirmed", "not_found", "ambiguous", "unsupported"]);
const AGENT_LAYOUT_RESOLVE_STATUSES = new Set<AgentLayoutResolveStatus>(["ui_layout", "ui_clarify", "not_ui", "failed"]);

type AgentAnalysisRequest = {
  symbol: string;
  prompt: string;
};

export type AgentAnalysisAccepted = {
  analysisId: string;
  status: string;
  statusUrl: string;
  streamUrl?: string;
};

export type AgentAnalysisRequestOptions = {
  requestId?: string;
  signal?: AbortSignal;
  onAccepted?: (accepted: AgentAnalysisAccepted) => void;
  /** 답변 요약 문장이 생성되는 대로 호출된다. text는 지금까지 받은 전체 문장이다. */
  onDelta?: (text: string) => void;
};

export type AgentAnalysisDelta = { analysisId: string; seq: number; text: string };

/**
 * delta 이벤트를 seq 순서대로 이어 붙인다. 이미 받은 seq 이하(중복·재전송)와 건너뛴 seq는 버린다.
 * 건너뛰면 문장이 끊기므로 멈추고, 최종 report가 오면 화면이 그 값으로 교체된다.
 */
const AGENT_DELTA_MAX_CHUNK_CHARS = 4096;
const AGENT_DELTA_MAX_TOTAL_CHARS = 32768;

export function createAgentDeltaAccumulator() {
  let lastSeq = 0;
  let text = "";
  let broken = false;
  return {
    push(delta: AgentAnalysisDelta): string | null {
      if (broken || delta.seq <= lastSeq) {
        return null;
      }
      // 한 조각이나 누적 길이가 비정상적으로 크면 멈춘다. 최종 report가 전체 답변을 가져온다.
      if (
        delta.seq !== lastSeq + 1
        || delta.text.length > AGENT_DELTA_MAX_CHUNK_CHARS
        || text.length + delta.text.length > AGENT_DELTA_MAX_TOTAL_CHARS
      ) {
        broken = true;
        return null;
      }
      lastSeq = delta.seq;
      text += delta.text;
      return text;
    }
  };
}

/** 헤더 한 줄에 맞게, 스트리밍 중인 문장의 가장 최근 부분만 보여 준다. */
export function agentDeltaPreview(text: string, maxChars = 64): string {
  // 전체를 훑지 않고 뒤쪽 구간만 정리한다. 제어문자·양방향 제어·폭 없는 문자는 헤더에 보이지 않게 제거한다.
  const tail = text.slice(-maxChars * 4);
  const flat = tail.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > maxChars ? `…${flat.slice(flat.length - maxChars + 1)}` : flat;
}

export function parseAgentDelta(data: string): AgentAnalysisDelta | null {
  try {
    const value = JSON.parse(data) as Record<string, unknown>;
    if (typeof value.analysisId === "string" && typeof value.seq === "number" && typeof value.text === "string") {
      return { analysisId: value.analysisId, seq: value.seq, text: value.text };
    }
  } catch {
    // 잘못된 delta는 무시한다. 최종 report가 전체 답변을 가져온다.
  }
  return null;
}

export type AgentEntityResolveStatus = "confirmed" | "not_found" | "ambiguous" | "unsupported";

export type AgentEntityResolveResponse = {
  status: AgentEntityResolveStatus;
  chartShortcut: boolean;
  chartAction?: "replace" | "add" | "none";
  chartPlacementIntent?: "top" | "bottom" | "left" | "right" | "center";
  symbol?: string;
  symbols?: string[];
  canonicalName?: string;
  matchedText?: string;
  matchedAlias?: string;
  confidence?: number;
  entityType?: string;
  reason?: string;
};

export type AgentLayoutResolveStatus = "ui_layout" | "ui_clarify" | "not_ui" | "failed";

export type AgentLayoutResolveResponse = {
  status: AgentLayoutResolveStatus;
  summary: string;
  rationale?: string;
  analysisId?: string;
  route: IntentRoute | null;
  layoutProposal: AgentLayoutProposal | null;
  agentTrace: Record<string, unknown>;
};

export async function requestAgentAnalysis({ symbol, prompt }: AgentAnalysisRequest): Promise<AgentAnalysisReport> {
  return requestAgentAnalysisPayload({
    symbol,
    intent: prompt,
    routerMode: "hybrid",
    messages: [{ role: "user", content: prompt }]
  });
}

export async function requestAgentAnalysisPayload(payload: unknown, options: AgentAnalysisRequestOptions = {}): Promise<AgentAnalysisReport> {
  const requestId = options.requestId ?? makeAgentRequestId();
  const response = await fetch("/api/agents/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": makeIdempotencyKey()
    },
    body: JSON.stringify(payloadWithRequestId(payload, requestId)),
    signal: options.signal
  });
  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiErrorMessage(response, responsePayload, "Agent analysis API"));
  }
  const accepted = normalizeAgentAccepted(responsePayload);
  if (accepted) {
    options.onAccepted?.(accepted);
  }
  return waitForAgentAnalysisReport(responsePayload, options.signal, options.onDelta);
}

export function formatAgentAnalysisForChat(report: AgentAnalysisReport): string {
  return formatAgentAnalysisReport(report);
}

export async function resolveAgentLayoutCommand(payload: unknown): Promise<AgentLayoutResolveResponse | null> {
  try {
    const response = await fetch("/api/agents/layout/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const responsePayload = await response.json().catch(() => null);
    if (!response.ok) {
      return null;
    }
    return normalizeAgentLayoutResolveResponse(responsePayload);
  } catch {
    return null;
  }
}

export async function resolveAgentChartShortcut(query: string): Promise<AgentEntityResolveResponse | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  const params = new URLSearchParams({ q: trimmed, mode: "chartShortcut" });
  try {
    const response = await fetch(`/api/agents/entities/resolve?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return null;
    }
    return normalizeAgentEntityResolveResponse(await response.json() as unknown);
  } catch {
    return null;
  }
}

export async function cancelAgentAnalysis(analysisId: string): Promise<AgentAnalysisReport | null> {
  const requestId = analysisId.trim();
  if (!requestId) {
    return null;
  }
  const response = await fetch(`/api/agents/reports/${encodeURIComponent(requestId)}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiErrorMessage(response, payload, "Agent cancel API"));
  }
  return normalizeAgentAnalysisPayload(payload);
}

export function createAgentAnalysisRequestId(): string {
  return makeAgentRequestId();
}

export function isAgentRequestAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function normalizeAgentLayoutResolveResponse(payload: unknown): AgentLayoutResolveResponse {
  const source = readObject(payload);
  const rawStatus = readString(source?.status);
  const status = rawStatus && AGENT_LAYOUT_RESOLVE_STATUSES.has(rawStatus as AgentLayoutResolveStatus)
    ? rawStatus as AgentLayoutResolveStatus
    : "failed";
  return {
    status,
    summary: readString(source?.summary) ?? "",
    rationale: readString(source?.rationale) ?? undefined,
    analysisId: readString(source?.analysisId) ?? undefined,
    route: normalizeIntentRoute(source?.route),
    layoutProposal: normalizeLayoutProposal(source?.layoutProposal),
    agentTrace: readObject(source?.agentTrace) ?? {}
  };
}

export function normalizeAgentEntityResolveResponse(payload: unknown): AgentEntityResolveResponse {
  const source = readObject(payload);
  const rawStatus = readString(source?.status);
  const status = rawStatus && AGENT_ENTITY_RESOLVE_STATUSES.has(rawStatus as AgentEntityResolveStatus)
    ? rawStatus as AgentEntityResolveStatus
    : "unsupported";
  return {
    status,
    chartShortcut: source?.chartShortcut === true,
    chartAction: readChartAction(source?.chartAction),
    chartPlacementIntent: readChartPlacementIntent(source?.chartPlacementIntent),
    symbol: readString(source?.symbol) ?? undefined,
    symbols: readArray(source?.symbols).map(readString).filter((item): item is string => Boolean(item)),
    canonicalName: readString(source?.canonicalName) ?? undefined,
    matchedText: readString(source?.matchedText) ?? undefined,
    matchedAlias: readString(source?.matchedAlias) ?? undefined,
    confidence: readNumber(source?.confidence) ?? undefined,
    entityType: readString(source?.entityType) ?? undefined,
    reason: readString(source?.reason) ?? undefined
  };
}

function readChartAction(value: unknown): AgentEntityResolveResponse["chartAction"] {
  return value === "replace" || value === "add" || value === "none" ? value : undefined;
}

function readChartPlacementIntent(value: unknown): AgentEntityResolveResponse["chartPlacementIntent"] {
  return value === "top" || value === "bottom" || value === "left" || value === "right" || value === "center" ? value : undefined;
}

function normalizeIntentRoute(value: unknown): IntentRoute | null {
  const source = readObject(value);
  const sourceName = readString(source?.source);
  const intentType = readString(source?.intentType);
  if (!source || !sourceName || !intentType) {
    return null;
  }
  return {
    source: sourceName,
    intentType,
    selectedRoles: readArray(source.selectedRoles).filter((item): item is string => typeof item === "string"),
    confidence: readNumber(source.confidence) ?? undefined,
    reason: readString(source.reason) ?? undefined
  };
}

async function waitForAgentAnalysisReport(payload: unknown, signal?: AbortSignal, onDelta?: (text: string) => void): Promise<AgentAnalysisReport> {
  throwIfAborted(signal);
  let report = normalizeAgentAnalysisPayload(payload);
  if (isTerminalAgentReport(report)) {
    return report;
  }

  const streamUrl = resolveAgentReportStreamUrl(payload);
  if (streamUrl && typeof EventSource !== "undefined") {
    try {
      return await waitForAgentAnalysisReportStream(streamUrl, signal, onDelta);
    } catch (error) {
      if (isAgentRequestAbortError(error)) {
        throw error;
      }
      // Redis/SSE may be unavailable in local and compatibility deployments.
    }
  }

  const statusUrl = resolveAgentReportStatusUrl(payload, report);
  const deadline = Date.now() + AGENT_REPORT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    await sleep(AGENT_REPORT_POLL_INTERVAL_MS, signal);
    const response = await fetch(statusUrl, { headers: { Accept: "application/json" }, signal });
    const nextPayload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(readApiErrorMessage(response, nextPayload, "Agent report API"));
    }
    report = normalizeAgentAnalysisPayload(nextPayload);
    if (isTerminalAgentReport(report)) {
      return report;
    }
  }

  throw new Error("AI 분석 결과를 제한 시간 안에 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

function waitForAgentAnalysisReportStream(streamUrl: string, signal?: AbortSignal, onDelta?: (text: string) => void): Promise<AgentAnalysisReport> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const source = new EventSource(streamUrl);
    let settled = false;
    const timeout = globalThis.setTimeout(() => {
      finish(() => reject(new Error("Agent report stream timed out.")));
    }, AGENT_REPORT_POLL_TIMEOUT_MS);

    const finish = (complete: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timeout);
      source.close();
      signal?.removeEventListener("abort", handleAbort);
      complete();
    };

    const handleAbort = () => {
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });

    const deltas = createAgentDeltaAccumulator();
    source.addEventListener("delta", (event) => {
      const delta = parseAgentDelta((event as MessageEvent<string>).data);
      const text = delta ? deltas.push(delta) : null;
      if (text !== null) {
        onDelta?.(text);
      }
    });
    source.addEventListener("report", (event) => {
      try {
        const report = normalizeAgentAnalysisPayload(JSON.parse(event.data) as unknown);
        if (isTerminalAgentReport(report)) {
          finish(() => resolve(report));
        }
      } catch (error) {
        finish(() => reject(error instanceof Error ? error : new Error("Agent report stream payload is invalid.")));
      }
    });
    source.addEventListener("timeout", () => {
      finish(() => reject(new Error("Agent report stream timed out.")));
    });
    source.onerror = () => {
      finish(() => reject(new Error("Agent report stream failed.")));
    };
  });
}

function normalizeAgentAnalysisPayload(payload: unknown): AgentAnalysisReport {
  const source = readObject(payload);
  const nestedReport = readObject(source?.report);
  if (nestedReport) {
    try {
      return normalizeAgentAnalysisReport(nestedReport);
    } catch {
      // Fall through to envelope normalization.
    }
  }

  try {
    return normalizeAgentAnalysisReport(payload);
  } catch (error) {
    const fallback = normalizeAgentAnalysisEnvelope(source);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

function normalizeAgentAnalysisEnvelope(source: Record<string, unknown> | null): AgentAnalysisReport | null {
  const analysisId = readString(source?.analysisId) ?? readString(source?.request_id);
  if (!analysisId) {
    return null;
  }
  const status = readString(source?.status) ?? "queued";
  return {
    analysisId,
    status,
    summary: statusSummaryForAgentReport(status),
    symbol: readString(source?.symbol) ?? undefined,
    route: null,
    finalAnswer: null,
    finalResponse: null,
    agentAnswers: [],
    findings: [],
    providerEvidence: [],
    dailySummaries: [],
    notificationDecision: null,
    layoutProposal: null,
    tradeConditionProposals: [],
    timing: null
  };
}

function statusSummaryForAgentReport(status: string): string {
  if (status === "queued") {
    return "AI 분석 요청이 대기열에 들어갔습니다.";
  }
  if (status === "running") {
    return "AI 분석을 진행 중입니다.";
  }
  if (status === "failed") {
    return "AI 분석에 실패했습니다.";
  }
  if (status === "canceled") {
    return "AI 분석을 중단했습니다.";
  }
  return `AI 분석 상태: ${status}`;
}

function isTerminalAgentReport(report: AgentAnalysisReport): boolean {
  return !report.status || AGENT_REPORT_TERMINAL_STATUSES.has(report.status);
}

function resolveAgentReportStatusUrl(payload: unknown, report: AgentAnalysisReport): string {
  const source = readObject(payload);
  const statusUrl = readString(source?.status_url) ?? readString(source?.statusUrl);
  return statusUrl ?? `/api/agents/reports/${encodeURIComponent(report.analysisId)}`;
}

function resolveAgentReportStreamUrl(payload: unknown): string | null {
  const source = readObject(payload);
  return readString(source?.stream_url) ?? readString(source?.streamUrl);
}

function readApiErrorMessage(response: Response, payload: unknown, label: string): string {
  const source = readObject(payload);
  const detail = source?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return `${label} 응답 오류 ${response.status}: ${detail}`;
  }
  return `${label} 응답 오류 ${response.status}`;
}

function makeIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeAgentRequestId(): string {
  return `agent-request-${makeIdempotencyKey().replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

function payloadWithRequestId(payload: unknown, requestId: string): unknown {
  const source = readObject(payload);
  if (!source) {
    return payload;
  }
  return {
    ...source,
    requestId,
    analysisId: readString(source.analysisId) ?? requestId
  };
}

function normalizeAgentAccepted(payload: unknown): AgentAnalysisAccepted | null {
  const report = normalizeAgentAnalysisPayload(payload);
  const source = readObject(payload);
  const statusUrl = readString(source?.status_url) ?? readString(source?.statusUrl) ?? `/api/agents/reports/${encodeURIComponent(report.analysisId)}`;
  return {
    analysisId: report.analysisId,
    status: report.status ?? "unknown",
    statusUrl,
    streamUrl: readString(source?.stream_url) ?? readString(source?.streamUrl) ?? undefined
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
