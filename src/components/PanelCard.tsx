import { ExternalLink, Pin, Star, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ChartPanel } from "./ChartPanel";
import { OrderTicket } from "./OrderTicket";
import { getCandlesForDocument, getChartDocumentForPanel, type ChartRuntimeAction, type ChartRuntimeState } from "@gops/chart-engine/runtime";
import { getSymbolMeta, normalizeSupportedSymbol, type SupportedSymbol, type WatchlistSymbol } from "@gops/chart-engine/symbols";
import type { ChartDocument } from "@gops/chart-engine/types";
import { makeCommand } from "../layout/commands";
import { workspaceColumnCount, workspaceColumnStarts, workspaceRowCount, workspaceRowStarts } from "../layout/gridGeometry";
import { applyPanelMoveWithPacking } from "../layout/reflow";
import type { LayoutCommand, LayoutPreviewItem, PanelInstance, WorkspaceLayout } from "../layout/types";

type PanelCardProps = {
  layout: WorkspaceLayout;
  panel: PanelInstance;
  selected: boolean;
  style: CSSProperties;
  onCommand: (command: LayoutCommand) => void;
  onPreviewChange: (preview: LayoutPreviewItem[]) => void;
  chartRuntime: ChartRuntimeState;
  chartAutoApplyEnabled: boolean;
  activeSymbol: SupportedSymbol;
  backfillEligibleSymbols: readonly SupportedSymbol[];
  knownSymbols: readonly WatchlistSymbol[];
  watchlistSymbols: readonly WatchlistSymbol[];
  onChartAction: (action: ChartRuntimeAction) => void;
  onAskAgentFromChart: (panelId: string, chartDocumentId: string) => void;
  onToggleWatchlistSymbol: (symbol: string) => void;
  onSelectSymbol: (symbol: string) => boolean;
};

const SYMBOL_DRAG_MIME = "application/x-gops-symbol";

type PanelHeaderPresentation = {
  title: string;
  description: string;
  market?: string;
  kind?: "chart" | "panel";
  marketMetrics?: PanelMarketMetrics;
};

type PanelMarketMetrics = {
  price: string;
  change: string;
  direction: "up" | "down" | "flat" | "offline";
};

function PanelBody({
  panel,
  chartRuntime,
  chartAutoApplyEnabled,
  activeSymbol,
  backfillEligibleSymbols,
  watchlistSymbols,
  onChartAction,
  onAskAgentFromChart,
  onSelectSymbol
}: {
  panel: PanelInstance;
  chartRuntime: ChartRuntimeState;
  chartAutoApplyEnabled: boolean;
  activeSymbol: SupportedSymbol;
  backfillEligibleSymbols: readonly SupportedSymbol[];
  watchlistSymbols: readonly WatchlistSymbol[];
  onChartAction: (action: ChartRuntimeAction) => void;
  onAskAgentFromChart: (panelId: string, chartDocumentId: string) => void;
  onSelectSymbol: (symbol: string) => boolean;
}) {
  if (panel.type === "chart") {
    return (
      <ChartPanel
        panel={panel}
        runtime={chartRuntime}
        autoApplyEnabled={chartAutoApplyEnabled}
        backfillEligibleSymbols={backfillEligibleSymbols}
        onChartAction={onChartAction}
        onAskAgent={onAskAgentFromChart}
      />
    );
  }

  if (panel.type === "orderTicket") {
    return <OrderTicket activeSymbol={activeSymbol} />;
  }

  if (panel.type === "watchlist") {
    return <EmbeddedWatchlist activeSymbol={activeSymbol} watchlistSymbols={watchlistSymbols} onSelectSymbol={onSelectSymbol} />;
  }

  if (panel.type === "newsFeed") {
    return <EmbeddedNewsFeed panel={panel} activeSymbol={activeSymbol} />;
  }

  return (
    <div className="panel-placeholder">
      <small>준비 중인 패널입니다</small>
    </div>
  );
}

type NewsPanelItem = {
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  symbol?: string;
  symbols: string[];
  eventType?: string;
  impactDirection?: string;
  relevanceScore?: number;
  importanceScore?: number;
};

function EmbeddedNewsFeed({
  panel,
  activeSymbol
}: {
  panel: PanelInstance;
  activeSymbol: SupportedSymbol;
}) {
  const [mode, setMode] = useState<"latest" | "major">("latest");
  const latestNews = readNewsItems(panel.props.latestNews);
  const majorNews = readNewsItems(panel.props.majorNews);
  const items = mode === "latest" ? latestNews : majorNews;
  const panelSymbol = readString(panel.props.symbol) ?? activeSymbol;

  if (!latestNews.length && !majorNews.length) {
    return (
      <div className="panel-placeholder panel-placeholder-muted">
        <small>{panelSymbol} 뉴스 분석을 실행하면 주요 뉴스가 표시됩니다</small>
      </div>
    );
  }

  return (
    <div className="panel-news-feed" aria-label={`${panelSymbol} 뉴스`}>
      <div className="panel-news-toolbar" role="tablist" aria-label="뉴스 보기">
        <button className={mode === "latest" ? "active" : ""} type="button" onClick={() => setMode("latest")}>
          최신뉴스
        </button>
        <button className={mode === "major" ? "active" : ""} type="button" onClick={() => setMode("major")}>
          주요뉴스
        </button>
      </div>
      <div className="panel-news-list">
        {items.map((item, index) => (
          <article key={`${item.url ?? item.title}-${index}`} className="panel-news-row">
            <div className="panel-news-row-main">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" title={item.title}>
                  {item.title}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              ) : (
                <strong>{item.title}</strong>
              )}
              {item.summary && <p>{item.summary}</p>}
            </div>
            <div className="panel-news-meta">
              <span>{item.symbol ?? panelSymbol}</span>
              <span className={`news-impact ${item.impactDirection ?? "unknown"}`}>{impactDirectionText(item.impactDirection)}</span>
              <span>{item.source ?? "news"}</span>
              {item.publishedAt && <span>{relativeTimeText(item.publishedAt)}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EmbeddedWatchlist({
  activeSymbol,
  watchlistSymbols,
  onSelectSymbol
}: {
  activeSymbol: SupportedSymbol;
  watchlistSymbols: readonly WatchlistSymbol[];
  onSelectSymbol: (symbol: string) => boolean;
}) {
  if (watchlistSymbols.length === 0) {
    return (
      <div className="panel-placeholder panel-placeholder-muted">
        <small>관심 종목을 불러오면 여기서 차트로 바로 가져올 수 있습니다</small>
      </div>
    );
  }

  return (
    <div className="panel-watchlist-list" aria-label="관심 종목 차트 불러오기">
      {watchlistSymbols.map((item) => (
        <button
          key={item.symbol}
          className={item.symbol === activeSymbol ? "panel-watchlist-row active" : "panel-watchlist-row"}
          type="button"
          draggable
          title={`${item.symbol} 차트로 가져오기`}
          aria-label={`${item.symbol} 차트로 가져오기`}
          onClick={() => onSelectSymbol(item.symbol)}
          onDragStart={(event) => {
            event.dataTransfer.setData(SYMBOL_DRAG_MIME, item.symbol);
            event.dataTransfer.setData("text/plain", item.symbol);
            event.dataTransfer.effectAllowed = "copy";
          }}
        >
          <span className="watchlist-symbol-cell">
            <strong>{item.symbol}</strong>
            <em>{item.name}</em>
          </span>
          <span className="watchlist-quote-cell">
            <strong className={typeof item.changePercent === "number" ? (item.changePercent < 0 ? "market-down" : "market-up") : "watchlist-change-empty"}>
              {typeof item.changePercent === "number" ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%` : "-"}
            </strong>
            <em>{typeof item.lastPrice === "number" ? item.lastPrice.toFixed(2) : "차트"}</em>
          </span>
        </button>
      ))}
    </div>
  );
}

function readNewsItems(value: unknown): NewsPanelItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: NewsPanelItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const source = item as Record<string, unknown>;
    const title = readString(source.title);
    if (!title) {
      continue;
    }
    items.push({
      title,
      summary: readString(source.summary) ?? undefined,
      url: readString(source.url) ?? undefined,
      source: readString(source.source) ?? undefined,
      publishedAt: readString(source.publishedAt) ?? undefined,
      symbol: readString(source.symbol) ?? undefined,
      symbols: Array.isArray(source.symbols) ? source.symbols.map(readString).filter((symbol): symbol is string => Boolean(symbol)) : [],
      eventType: readString(source.eventType) ?? undefined,
      impactDirection: readString(source.impactDirection) ?? undefined,
      relevanceScore: readNumber(source.relevanceScore) ?? undefined,
      importanceScore: readNumber(source.importanceScore) ?? undefined
    });
  }
  return items;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function impactDirectionText(value?: string): string {
  switch (value) {
    case "positive":
      return "긍정";
    case "negative":
      return "부정";
    case "mixed":
      return "혼재";
    default:
      return "보류";
  }
}

function relativeTimeText(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value.slice(0, 10);
  }
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }
  return `${Math.floor(diffHours / 24)}일 전`;
}

function getGridMetrics(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  const frame = element?.closest(".layout-frame");
  if (!frame) {
    return null;
  }

  const rect = frame.getBoundingClientRect();
  return {
    columnStarts: workspaceColumnStarts(rect.width),
    rowStarts: workspaceRowStarts(rect.height)
  };
}

function nearestStartIndex(starts: number[], value: number, maxIndex: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= maxIndex; index += 1) {
    const distance = Math.abs(starts[index] - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function resolvePanelHeaderPresentation(
  panel: PanelInstance,
  chartRuntime: ChartRuntimeState,
  knownSymbols: readonly WatchlistSymbol[]
): PanelHeaderPresentation {
  if (panel.type === "chart") {
    const chartDocument = getChartDocumentForPanel(chartRuntime, panel);
    const normalizedSymbol = normalizeSupportedSymbol(chartDocument.symbol);
    const symbolMeta = knownSymbols.find((item) => item.symbol === normalizedSymbol) ?? getSymbolMeta(chartDocument.symbol);
    return {
      title: symbolMeta.symbol,
      description: symbolMeta.name,
      market: symbolMeta.market,
      kind: "chart",
      marketMetrics: resolveChartHeaderMetrics(chartRuntime, chartDocument)
    };
  }

  return {
    title: panel.title ?? panel.type,
    description: panelHeaderSubtitle(panel.type)
  };
}

function panelHeaderSubtitle(panelType: PanelInstance["type"]): string {
  switch (panelType) {
    case "watchlist":
      return "관심 종목";
    case "newsFeed":
      return "시장 뉴스";
    case "proposalReview":
      return "AI 제안";
    case "symbolSummary":
      return "종목 요약";
    case "indicatorCompare":
      return "지표 비교";
    case "orderTicket":
      return "주문 입력";
    case "aiSummary":
      return "AI 요약";
    case "notifications":
      return "알림";
    case "agentStatus":
      return "AI 상태";
    case "agentChat":
      return "AI 채팅";
    default:
      return "작업 패널";
  }
}

function resolveChartHeaderMetrics(chartRuntime: ChartRuntimeState, chartDocument: ChartDocument): PanelMarketMetrics | undefined {
  const candles = getCandlesForDocument(chartRuntime, chartDocument);
  const visibleEnd = Math.max(0, candles.length - Math.max(0, chartDocument.viewport.rightOffset));
  const visibleStart = Math.max(0, visibleEnd - Math.max(1, chartDocument.viewport.visibleCount));
  const visibleCandles = candles.slice(visibleStart, visibleEnd);
  const first = visibleCandles[0];
  const last = visibleCandles[visibleCandles.length - 1];
  if (!first || !last) {
    return undefined;
  }

  const changePercent = ((last.close - first.open) / Math.max(0.0001, first.open)) * 100;
  return {
    price: last.close.toFixed(2),
    change: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
    direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat"
  };
}

export function PanelCard({
  layout,
  panel,
  selected,
  style,
  onCommand,
  onPreviewChange,
  chartRuntime,
  chartAutoApplyEnabled,
  activeSymbol,
  backfillEligibleSymbols,
  knownSymbols,
  watchlistSymbols,
  onChartAction,
  onAskAgentFromChart,
  onToggleWatchlistSymbol,
  onSelectSymbol
}: PanelCardProps) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLElement | null>(null);
  const previousRectRef = useRef<DOMRect | null>(null);
  const movementAnimationRef = useRef<Animation | null>(null);
  const commandTarget = { panelId: panel.id, group: panel.placement.group, zone: panel.placement.zone };
  const panelHeader = resolvePanelHeaderPresentation(panel, chartRuntime, knownSymbols);
  const chartDocument = panel.type === "chart" ? getChartDocumentForPanel(chartRuntime, panel) : null;
  const chartSymbol = chartDocument ? normalizeSupportedSymbol(chartDocument.symbol) : null;
  const chartIsInWatchlist = Boolean(chartSymbol && watchlistSymbols.some((item) => item.symbol === chartSymbol));

  const runPanelCommand = (type: LayoutCommand["type"], payload: Record<string, unknown> = {}) => {
    onCommand(makeCommand(type, "user", { panelId: panel.id, ...payload }, commandTarget));
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || panel.layoutPinned || panel.placement.group !== "workspace") {
      return;
    }

    const metrics = getGridMetrics(event.currentTarget);
    if (!metrics) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const interactionTarget = event.currentTarget;
    interactionTarget.setPointerCapture?.(event.pointerId);
    setDragOffset({ x: 0, y: 0 });
    setDragging(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = panel.placement;
    let latestX = startX;
    let latestY = startY;
    let finished = false;

    const resolveTargetCell = (clientX: number, clientY: number) => {
      const startColPx = metrics.columnStarts[startPlacement.col - 1];
      const startRowPx = metrics.rowStarts[startPlacement.row - 1];
      const nextCol = nearestStartIndex(
        metrics.columnStarts,
        startColPx + clientX - startX,
        workspaceColumnCount - startPlacement.colSpan
      ) + 1;
      const nextRow = nearestStartIndex(
        metrics.rowStarts,
        startRowPx + clientY - startY,
        workspaceRowCount - startPlacement.rowSpan
      ) + 1;

      if (nextCol === startPlacement.col && nextRow === startPlacement.row) {
        return { col: nextCol, row: nextRow };
      }

      const result = applyPanelMoveWithPacking(layout, panel.id, {
        ...startPlacement,
        col: nextCol,
        row: nextRow
      });
      return result.ok ? { col: nextCol, row: nextRow } : { col: startPlacement.col, row: startPlacement.row };
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      latestX = moveEvent.clientX;
      latestY = moveEvent.clientY;
      setDragOffset({ x: latestX - startX, y: latestY - startY });
    };

    const handlePointerUp = () => {
      if (finished) {
        return;
      }
      finished = true;

      try {
        interactionTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        // Capture may already be released by the browser.
      }

      interactionTarget.removeEventListener("pointermove", handlePointerMove);
      interactionTarget.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setDragging(false);
      setDragOffset({ x: 0, y: 0 });
      onPreviewChange([]);

      const { col: nextCol, row: nextRow } = resolveTargetCell(latestX, latestY);

      if (nextCol === startPlacement.col && nextRow === startPlacement.row) {
        return;
      }

      runPanelCommand("layout.panel.move", {
        placement: {
          ...startPlacement,
          col: nextCol,
          row: nextRow
        }
      });
    };

    interactionTarget.addEventListener("pointermove", handlePointerMove);
    interactionTarget.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element) {
      return;
    }

    const nextRect = element.getBoundingClientRect();
    const previousRect = previousRectRef.current;
    previousRectRef.current = nextRect;

    const frameIsResizing = element.closest(".layout-frame")?.classList.contains("resizing-grid") ?? false;
    if (dragging || frameIsResizing || !previousRect) {
      return;
    }

    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;
    const deltaWidth = previousRect.width - nextRect.width;
    const deltaHeight = previousRect.height - nextRect.height;
    const shouldAnimate =
      Math.abs(deltaX) > 0.5 ||
      Math.abs(deltaY) > 0.5 ||
      Math.abs(deltaWidth) > 0.5 ||
      Math.abs(deltaHeight) > 0.5;

    if (!shouldAnimate) {
      return;
    }

    const clipRight = Math.max(0, nextRect.width - previousRect.width);
    const clipBottom = Math.max(0, nextRect.height - previousRect.height);
    const hasResize = Math.abs(deltaWidth) > 0.5 || Math.abs(deltaHeight) > 0.5;
    const startClip = hasResize ? `inset(0 ${clipRight}px ${clipBottom}px 0 round 18px)` : "inset(0 0 0 0 round 18px)";

    movementAnimationRef.current?.cancel();
    movementAnimationRef.current = element.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`,
          clipPath: startClip,
          opacity: 0.98
        },
        {
          transformOrigin: "top left",
          transform: "translate3d(0, 0, 0)",
          clipPath: "inset(0 0 0 0 round 18px)",
          opacity: 1
        }
      ],
      {
        duration: 540,
        easing: "cubic-bezier(0.18, 0.82, 0.18, 1)",
        fill: "both"
      }
    );
  });

  useLayoutEffect(() => {
    return () => movementAnimationRef.current?.cancel();
  }, []);

  const panelStyle: CSSProperties = dragging
    ? {
        ...style,
        zIndex: 40,
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`
      }
    : style;

  return (
    <article
      ref={panelRef}
      className={`panel-card ${selected ? "selected" : ""} ${dragging ? "dragging" : ""} ${panel.layoutPinned ? "pinned" : ""}`}
      data-panel-id={panel.id}
      data-panel-type={panel.type}
      data-panel-row={panel.placement.row}
      data-panel-end-row={panel.placement.row + panel.placement.rowSpan - 1}
      style={panelStyle}
      onClick={() => runPanelCommand("layout.panel.select")}
    >
      <header className="panel-header" onPointerDown={beginDrag}>
        <div className={panelHeader.kind === "chart" ? "panel-title-block chart-title-block" : "panel-title-block"}>
          {panelHeader.kind === "chart" ? (
            <>
              <strong>{panelHeader.title}</strong>
              <div className="panel-chart-meta">
                <span>{panelHeader.description}</span>
                <em>{panelHeader.market}</em>
              </div>
            </>
          ) : (
            <span>{panelHeader.description}</span>
          )}
        </div>
        <div className="panel-actions" onPointerDown={(event) => event.stopPropagation()}>
          {panelHeader.marketMetrics && (
            <div className={`panel-market-metrics ${panelHeader.marketMetrics.direction}`}>
              <strong>{panelHeader.marketMetrics.price}</strong>
              <span>{panelHeader.marketMetrics.change}</span>
            </div>
          )}
          {chartSymbol && (
            <button
              className={chartIsInWatchlist ? "panel-watchlist-star active" : "panel-watchlist-star"}
              title={chartIsInWatchlist ? `${chartSymbol} 관심 종목 제거` : `${chartSymbol} 관심 종목 추가`}
              aria-pressed={chartIsInWatchlist}
              aria-label={chartIsInWatchlist ? `${chartSymbol} 관심 종목 제거` : `${chartSymbol} 관심 종목 추가`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleWatchlistSymbol(chartSymbol);
              }}
            >
              <Star size={15} fill={chartIsInWatchlist ? "currentColor" : "none"} />
            </button>
          )}
          <button
            title={panel.layoutPinned ? "고정 해제" : "패널 고정"}
            aria-pressed={Boolean(panel.layoutPinned)}
            onClick={(event) => {
              event.stopPropagation();
              runPanelCommand(panel.layoutPinned ? "layout.panel.unpin" : "layout.panel.pin");
            }}
          >
            <Pin size={14} fill={panel.layoutPinned ? "currentColor" : "none"} />
          </button>
          <button
            title="패널 제거"
            onClick={(event) => {
              event.stopPropagation();
              runPanelCommand("layout.panel.remove");
            }}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <PanelBody
        panel={panel}
        chartRuntime={chartRuntime}
        chartAutoApplyEnabled={chartAutoApplyEnabled}
        activeSymbol={activeSymbol}
        backfillEligibleSymbols={backfillEligibleSymbols}
        watchlistSymbols={watchlistSymbols}
        onChartAction={onChartAction}
        onAskAgentFromChart={onAskAgentFromChart}
        onSelectSymbol={onSelectSymbol}
      />
    </article>
  );
}
