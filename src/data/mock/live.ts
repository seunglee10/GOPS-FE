/* 실시간처럼 움직이는 가격. 목업 gops.js 1803~1830줄의 LIVE/liveInit/liveTick 을 구독형 저장소로 옮겼다.
   시작 30틱은 종목별 시드로 고정(목업과 같음), 그 뒤 1.5초마다 움직이는 틱은 Math.random (목업도 그렇다) */
import type { LiveQuote, LiveTick } from "../../api/types";
import { S } from "./symbols";
import { candlesOf, prevClose, r2, rng, symSeed, tickStep, cxLive } from "./candles";

type Listener = (q: LiveQuote) => void;
const stores = new Map<string, LiveStore>();

export class LiveStore {
  readonly s: string;
  p = 0; vol = 0; ticks: LiveTick[] = []; book: number[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(s: string) {
    this.s = s;
    const st = S[s], r = rng(symSeed(s) + 7);
    this.p = st.p; this.vol = Math.round(candlesOf(s).at(-1)!.v * 1e5);
    let p = st.p; const t = new Date(2026, 8, 30, 9, 42, 10);
    for (let i = 0; i < 30; i++) { this.ticks.push({ t: new Date(t), p, q: 1 + Math.floor(r() * 400), up: r() > 0.45 }); p = r2(p - (r() - 0.48) * p * 0.0006); t.setSeconds(t.getSeconds() - 1 - Math.floor(r() * 3)); }
    this.book = Array.from({ length: 16 }, () => 200 + Math.floor(r() * 4800));
  }
  /* 체결강도: 매수 체결량 ÷ 매도 체결량. 최근 체결 몇 건만으로는 크게 튀니 장중 누적분(가짜)을 깔고 계산 */
  strength(): number { const b = this.ticks.filter(x => x.up).reduce((a, x) => a + x.q, 0), sl = this.ticks.filter(x => !x.up).reduce((a, x) => a + x.q, 0); return (b + 20000) / (sl + 20000) * 100; }
  snapshot(): LiveQuote {
    return { symbol: this.s, price: this.p, prevClose: prevClose(this.s), volume: this.vol, ticks: this.ticks.slice(), book: this.book.slice(), bid: null, ask: null, strength: this.strength() };
  }
  tick(): void {
    const up = Math.random() > 0.47, step = tickStep(this.p);
    this.p = r2(Math.max(step, this.p + (up ? 1 : -1) * step * (1 + Math.floor(Math.random() * 3))));
    const qn = 1 + Math.floor(Math.random() * 300);
    this.ticks.unshift({ t: new Date(this.ticks[0].t.getTime() + 1000 + Math.random() * 2000), p: this.p, q: qn, up }); this.ticks.length = Math.min(this.ticks.length, 40);
    this.vol += qn; this.book = this.book.map(v => Math.max(50, v + Math.round((Math.random() - 0.5) * 300)));
    cxLive(this.s, this.p);
    const snap = this.snapshot(); this.listeners.forEach(l => l(snap));
  }
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1500);
    return () => { this.listeners.delete(l); if (!this.listeners.size && this.timer) { clearInterval(this.timer); this.timer = null; } };
  }
}
export function liveStoreOf(s: string): LiveStore {
  let st = stores.get(s); if (!st) { st = new LiveStore(s); stores.set(s, st); } return st;
}
