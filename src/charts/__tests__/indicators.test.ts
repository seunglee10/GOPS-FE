import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregate, atr, heikinAshi, kagi, minuteKey, monthKey, plotBars, renko, rsiParts, rsiRows, rsiWilder, seriesOf, sma, weekKey } from "../indicators";
import { squarify } from "../treemap";
import type { Bar, CourseRow } from "../types";

const bar = (t: Date, o: number, h: number, l: number, c: number, v = 1): Bar => ({ t, o, h, l, c, v });
const closes = (cs: number[], start = new Date(2026, 0, 5)): Bar[] => cs.map((c, i) => { const t = new Date(start); t.setDate(start.getDate() + i); return bar(t, c, c + 1, c - 1, c); });

test("sma: 앞 n-1개는 null, 그 뒤는 평균", () => {
  assert.deepEqual(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
  assert.deepEqual(sma([10, 20], 5), [null, null]);
});

test("rsiParts: 전부 오르면 100, 오르내림이 같으면 50", () => {
  const up = closes(Array.from({ length: 16 }, (_, i) => 100 + i));
  assert.equal(rsiParts(up).v, 100);
  const flat = closes(Array.from({ length: 16 }, (_, i) => 100 + (i % 2)));
  assert.equal(rsiParts(flat).v, 50);
  assert.equal(rsiParts(flat).days.length, 14);
  assert.equal(rsiParts(flat).up, 7);
  assert.equal(rsiParts(flat).down, 7);
});

test("rsiWilder: 처음 14일은 단순 평균과 같고, 그 뒤는 비중을 줄여 평균", () => {
  const flat = closes(Array.from({ length: 15 }, (_, i) => 100 + (i % 2)));
  assert.equal(rsiWilder(flat), 50);
  // 15일째 +10: g = (0.5*13 + 10)/14 = 1.1786, l = (0.5*13)/14 = 0.4643 → 71.74
  const bump = closes([...Array.from({ length: 15 }, (_, i) => 100 + (i % 2)), 110]);
  assert.equal(rsiWilder(bump).toFixed(2), (100 * (6.5 + 10) / (6.5 + 10 + 6.5)).toFixed(2));
});

test("rsiRows: 코스 차트 줄([날짜,o,h,l,c,v])로 14일 RSI", () => {
  const R: CourseRow[] = Array.from({ length: 15 }, (_, i) => [`2020-01-${String(i + 1).padStart(2, "0")}`, 0, 0, 0, 100 + i * 2, 0]);
  assert.deepEqual(rsiRows(R), { up: 28, down: 0, v: 100 });
});

test("atr: 최근 n개 막대의 평균 참범위", () => {
  const B = closes([100, 102, 101, 105]);   // 참범위: max(h-l=2, |h-prevC|, |l-prevC|)
  assert.equal(atr(B, 3), (Math.max(2, 3, 1) + Math.max(2, 0, 2) + Math.max(2, 5, 3)) / 3);
});

test("aggregate: 주·월 단위로 묶으면 시가는 첫 막대, 종가는 마지막, 고가·저가는 최대·최소, 거래량은 합", () => {
  // 2026-01-05(월) ~ 2026-01-16(금): 평일 10개
  const days: Bar[] = []; const d = new Date(2026, 0, 5);
  for (let i = 0; i < 10; i++) { if (d.getDay() % 6 !== 0) days.push({ ...bar(new Date(d), 10 + i, 12 + i, 9 + i, 11 + i, 2), short: 1, inst: 1, foreign: 1, retail: -2 }); d.setDate(d.getDate() + 1); if (d.getDay() === 6) d.setDate(d.getDate() + 2); }
  const W = aggregate(days, weekKey);
  assert.equal(W.length, 2);
  assert.equal(W[0].o, 10); assert.equal(W[0].c, 15); assert.equal(W[0].h, 16); assert.equal(W[0].l, 9); assert.equal(W[0].v, 10);
  assert.equal(W[0].short, 5); assert.equal(W[0].retail, -10);
  assert.equal(W[1].o, 15); assert.equal(W[1].c, 20);
  const M = aggregate(days, monthKey);
  assert.equal(M.length, 1); assert.equal(M[0].v, 20);
  // 분봉 → 5분봉: 09:30~09:39 열 개가 두 개로
  const mins = Array.from({ length: 10 }, (_, k) => { const t = new Date(2026, 0, 5, 9, 30 + k); return bar(t, k, k, k, k, 1); });
  const M5 = aggregate(mins, minuteKey(5));
  assert.equal(M5.length, 2); assert.equal(M5[0].c, 4); assert.equal(M5[1].o, 5); assert.equal(M5[1].v, 5);
  assert.equal(seriesOf("W", days).length, 2);
  assert.equal(seriesOf("5m", [], mins).length, 2);
  assert.equal(seriesOf("D", days), days);
});

test("heikinAshi: 첫 캔들 시가는 (o+c)/2, 종가는 네 값 평균", () => {
  const H = heikinAshi([bar(new Date(), 10, 14, 8, 12), bar(new Date(), 12, 16, 10, 14)]);
  assert.equal(H[0].o, 11); assert.equal(H[0].c, 11);
  assert.equal(H[1].o, 11); assert.equal(H[1].c, 13); assert.equal(H[1].h, 16);
});

test("renko: 종가가 box 만큼 움직일 때마다 한 칸", () => {
  const B = closes([100, 101, 103, 102, 97]);
  const R = renko(B, 2);
  assert.deepEqual(R.map(b => [b.o, b.c]), [[100, 102], [100, 98]]);   // 되돌림 칸은 앞 칸의 아래(bot)에서 시작한다
});

test("kagi: 반대로 box 만큼 움직이면 방향을 바꾼다", () => {
  const B = closes([100, 103, 105, 102, 99, 104]);
  const K = kagi(B, 2);
  assert.deepEqual(K.map(b => [b.o, b.c, b.up]), [[100, 105, true], [105, 99, false], [99, 104, true]]);
  assert.equal(plotBars(B, "kagi").bars.length, 3);
  assert.equal(plotBars(B, "candle").bars, B);
});

test("squarify: 넓이 비례로 네모를 채운다", () => {
  const cells = squarify([{ n: "a", v: 3 }, { n: "b", v: 1 }], 0, 0, 40, 10);
  assert.equal(cells.length, 2);
  const area = (c: { w: number; h: number }) => Math.round(c.w * c.h);
  assert.equal(area(cells.find(c => c.n === "a")!), 300);
  assert.equal(area(cells.find(c => c.n === "b")!), 100);
});

test("renderCourseChart: 서버에서 올 차트 이름·날짜는 이스케이프된다", async () => {
  const { renderCourseChart, EMPTY_COURSE_STATE } = await import("../courseChart");
  const rows: CourseRow[] = Array.from({ length: 6 }, (_, i) => [`2020-01-0${i + 1}`, 10, 12, 9, 11, 100]);
  const svg = renderCourseChart({ q: { id: "x", kind: "tap", fig: { mark: "2020-01-03" }, ans: [1] }, chart: { sym: "X", name: "<script>alert(1)</script>", iv: "일봉\"", rows }, state: EMPTY_COURSE_STATE });
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(svg.includes("일봉&quot;"));
});
