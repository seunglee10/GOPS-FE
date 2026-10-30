/* 뉴스 화면. 목업 gops.js pageNews(2222)·newsHub(2187)·relStocks(2164).
   인기 뉴스는 isHot(관련 종목 거래량 급증) 먼저·최신순으로만 줄 세우고 조회 수는 보여 주지 않는다. 관련 종목은 이름만 (등락률 없음).
   분류 탭은 category, 내 보유·관심은 symbols 로 서버에서 거른다 (D13). 본문은 서버 문단(bodyKo), 원문 링크는 safeExternalUrl 로만 */
import { Link } from "react-router-dom";
import { safeExternalUrl } from "../../app/format";
import type { NewsCategory, NewsItem } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { HAS_LOGO, logoBg, logoUrl } from "../../data/logos";
import { useNews, useArticle, useAccount } from "../../data/hooks";
import { Ptitle } from "../_shared";
import { useDataSource } from "../../data/source";
import { isNotFound } from "../../data/api/http";
import { EmptyState, ErrorState, SkeletonRows } from "../../app/shell/LoadState";

type Group = "mine" | NewsCategory;
const NEWS_GROUPS: [Group, string][] = [["mine", "내 보유·관심"], ["market", "시황·전망"], ["corp", "기업·종목"], ["earn", "실적·공시"], ["rate", "금리·환율"], ["etf", "ETF·지수"], ["global", "해외"]];
/* 종목 마스터에 없는 관련 종목의 이름 (목업 2237줄) */
const EXTRA_NAME: Record<string, string> = { AMZN: "아마존", GOOGL: "알파벳" };
const href = (n: NewsItem) => `/news?n=${n.id}`;

/* 뉴스에 엮인 종목 이름. 내 종목(first)을 앞에, 최대 2개 */
function RelStocks({ rel, first }: { rel: NewsItem["relatedSymbols"]; first?: Set<string> }) {
  const syms = useSymbolMap();
  const ks = rel.filter(r => r.nameKo || syms[r.symbol]?.nameKo).sort((a, b) => Number(!!first?.has(b.symbol)) - Number(!!first?.has(a.symbol))).slice(0, 2);
  return ks.length ? <div className="nrel">{ks.map(r => <span key={r.symbol}>{r.nameKo || syms[r.symbol]?.nameKo}</span>)}</div> : null;
}
function Meta({ n, mine }: { n: NewsItem; mine?: Set<string> }) {
  return <><div className="meta"><span>{n.source}</span><span>{n.relativeKo}</span></div><RelStocks rel={n.relatedSymbols} first={mine} /></>;
}

export default function NewsPage() {
  usePage("news");
  const act = useActions("news");
  const n = act.q("n");
  return n == null ? <NewsHub /> : <Article id={n} />;
}

/* 목록 패널 안의 읽는 중·실패·빈 상태. 실패하면 다시 시도 */
function ListState({ res, empty, minHeight = 160 }: { res: { loading: boolean; error: Error | null; reload: () => void; data: unknown }; empty: string; minHeight?: number }) {
  if (res.error && !res.data) return <div style={{ gridColumn: "1/-1" }}><ErrorState title="뉴스를 불러오지 못했어요" onRetry={res.reload} minHeight={minHeight} /></div>;
  if (res.loading && !res.data) return <div style={{ gridColumn: "1/-1" }}><SkeletonRows n={3} h={36} /></div>;
  return <div className="state" style={{ minHeight, gridColumn: "1/-1" }}><p>{empty}</p></div>;
}

function NewsHub() {
  const act = useActions("news");
  const { summary } = useAccount();
  const mock = useDataSource().kind === "mock";
  const groups = act.guest ? NEWS_GROUPS.slice(1) : NEWS_GROUPS;
  const c = act.q("c");
  const cat = groups.some(([k]) => k === c) ? (c as Group) : "";
  const mine = new Set([...(act.guest ? [] : summary.data?.holdings.map(h => h.symbol) ?? []), ...act.starSet()]);
  const mineKey = [...mine].sort().slice(0, 20);
  const allRes = useNews({ sort: "new" });
  const hotRes = useNews({ sort: "hot", limit: 5 });
  /* 내 보유·관심은 그 종목들로, 분류 탭은 category 로 서버에서 거른다 */
  const mineRes = useNews({ symbols: mineKey, sort: "new" }, !act.guest && mineKey.length > 0);
  const catRes = useNews({ category: cat && cat !== "mine" ? cat : undefined, sort: "new" }, !!cat && cat !== "mine");
  const all = allRes.data?.items ?? [], hot = hotRes.data?.items ?? [];
  const mineItems = mineKey.length ? mineRes.data?.items ?? [] : [];
  const of = (k: Group) => k === "mine" ? mineItems : all.filter(x => x.category === k);
  const head = (t: string, k?: Group) => <div className="panel-head"><Ptitle t={t} href={k ? `/news?c=${k}` : null} /></div>;
  const tabs = <div className="seg nh-tabs"><button aria-pressed={!cat} onClick={() => act.set("c", "")}>전체</button>
    {groups.map(([k, t]) => <button key={k} aria-pressed={cat === k} onClick={() => act.set("c", k)}>{t}</button>)}</div>;
  const title = <div className="nh-title"><h2>뉴스</h2>{mock ? <span className="t-caption">출처·제목은 목업용 예시</span> : null}</div>;
  if (cat) {
    const res = cat === "mine" ? mineRes : catRes;
    const idx = cat === "mine" ? mineItems : catRes.data?.items ?? [];
    const empty = cat === "mine" ? (mineKey.length ? "보유·관심 종목과 관련된 뉴스가 아직 없어요." : "관심 종목을 추가하면 관련 뉴스가 여기 모여요.") : "이 분류의 뉴스가 아직 없어요.";
    return <div className="newshub">{title}{tabs}
      <section className="panel nh-cat">{head(groups.find(([k]) => k === cat)![1])}
        <div className="panel-body news">{idx.length ? idx.map(x => <Link key={x.id} className="nitem" to={href(x)}><h4>{x.titleKo}</h4><Meta n={x} mine={mine} /></Link>)
          : <ListState res={cat === "mine" && !mineKey.length ? { loading: false, error: null, reload: () => undefined, data: null } : res} empty={empty} minHeight={120} />}</div></section></div>;
  }
  if (allRes.error && !allRes.data) return <div className="newshub">{title}{tabs}<section className="panel"><ErrorState title="뉴스를 불러오지 못했어요" onRetry={allRes.reload} /></section></div>;
  if (!allRes.loading && allRes.data && !all.length) return <div className="newshub">{title}{tabs}<section className="panel"><EmptyState icon="trend" title="아직 뉴스가 없어요" body="새 뉴스가 들어오면 여기에 보여요." /></section></div>;
  const thumb = (x: NewsItem) => {
    const s = x.relatedSymbols.map(r => r.symbol).find(k => HAS_LOGO.has(k)), bg = s ? logoBg(s) : undefined;
    return <span className="nh-thumb" style={bg ? { background: bg } : undefined}>{s ? <img src={logoUrl(s)!} alt="" loading="lazy" /> : <Ic name="trend" />}</span>;
  };
  /* 카드마다 맨 위 기사가 겹치지 않게, 앞 카드에서 이미 크게 보여 준 기사는 건너뛴다 */
  const leads = new Set<string>();
  const card = ([k, t]: [Group, string]) => {
    const idx = of(k), lead = idx.find(x => !leads.has(x.id)) ?? idx[0], rest = idx.filter(x => x !== lead); if (lead) leads.add(lead.id);
    const res = k === "mine" ? (mineKey.length ? mineRes : { loading: false, error: null, reload: () => undefined, data: null }) : allRes;
    return <section key={k} className="panel nh-card">{head(t, k)}{lead == null ? <ListState res={res} empty="관련 뉴스가 아직 없어요." /> : <>
      <Link className="nh-lead" to={href(lead)}><div><h4>{lead.titleKo}</h4><Meta n={lead} mine={mine} /></div>{thumb(lead)}</Link>
      <div className="nh-rows">{rest.slice(0, 4).map(x => <Link key={x.id} to={href(x)}><span>{x.titleKo}</span><small>{x.source}</small></Link>)}</div></>}</section>;
  };
  const world = of("global").slice(0, 5);
  return <div className="newshub">{title}{tabs}
    <div className="nh-top">
      <section className="panel">{head("인기 뉴스")}<div className="panel-body news nh-rank">{hot.length ? hot.map((x, r) => <Link key={x.id} className="nitem" to={href(x)}><b>{r + 1}</b><div><h4>{x.titleKo}</h4><Meta n={x} mine={mine} /></div></Link>) : <ListState res={hotRes} empty="인기 뉴스가 아직 없어요." />}</div></section>
      <section className="panel">{head("해외 뉴스", "global")}<div className="panel-body news nh-world">{world.length ? world.map(x => <Link key={x.id} className="nitem" to={href(x)}><div><h4>{x.titleKo}</h4><div className="meta"><span>{x.source}</span></div></div><time>{x.relativeKo}</time></Link>) : <ListState res={allRes} empty="해외 뉴스가 아직 없어요." />}</div></section>
    </div>
    <h3 className="nh-sec">뉴스 포커스</h3>
    <div className="nh-grid">{groups.filter(([k]) => k !== "global").map(card)}</div>
  </div>;
}

/* 없는 기사: api 는 404 news_not_found, 목업은 찾지 못하면 오류를 던진다 */
const articleMissing = (e: Error, mock: boolean) => mock || isNotFound(e) || e.message === "news_not_found";

function Article({ id }: { id: string }) {
  const act = useActions("news");
  const syms = useSymbolMap();
  const mock = useDataSource().kind === "mock";
  const listRes = useNews({ sort: "new" });
  const list = listRes.data?.items ?? [];
  const { data: a, error, loading, reload } = useArticle(id);
  const shown = a && !loading ? a : null;
  const out = shown ? safeExternalUrl(shown.url) : undefined;
  return <div className="newspage">
    <section className="panel news-list"><div className="panel-head"><span className="t-label">최신 뉴스</span><span className="spacer"></span><span className="t-caption">미국 시장</span></div>
      <div className="panel-body news">{list.length ? list.map(x => <Link key={x.id} className="nitem" to={href(x)} aria-current={x.id === id ? "true" : undefined}><h4>{x.titleKo}</h4><div className="meta"><span>{x.source}</span><span>{x.relativeKo}</span></div><RelStocks rel={x.relatedSymbols} /></Link>)
        : <ListState res={listRes} empty="아직 뉴스가 없어요." minHeight={120} />}</div></section>
    {shown ? <article className="panel news-read">
      <div className="meta"><span>{shown.source}</span><span>{shown.relativeKo}</span></div>
      <h1>{shown.titleKo}</h1>
      {shown.bodyKo.length ? shown.bodyKo.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">요약이 아직 없어요. 원문에서 확인해 주세요.</p>}
      {shown.relatedSymbols.length ? <div className="news-rel"><span className="t-caption">관련 종목</span><div>{shown.relatedSymbols.map(r => <Link key={r.symbol} className="news-sym" to={`/stock?s=${r.symbol}`}><Mark symbol={r.symbol} color={syms[r.symbol]?.color} /><b>{r.nameKo || syms[r.symbol]?.nameKo || EXTRA_NAME[r.symbol] || r.symbol}</b></Link>)}</div></div> : null}
      <div className="news-acts"><button className="btn sm outline" onClick={act.openAi}><Ic name="spark" />이 뉴스 AI에게 묻기</button>{out ? <a className="linkbtn" href={out} target="_blank" rel="noopener noreferrer">{shown.source ? `${shown.source} 원문 보기` : "원문 보기"}</a> : null}</div>
    </article>
      : error && !loading ? <article className="panel news-read">{articleMissing(error, mock) ? <div className="state"><h3>뉴스를 찾지 못했어요</h3><p>목록에서 다른 뉴스를 골라 주세요.</p></div> : <ErrorState title="뉴스를 불러오지 못했어요" onRetry={reload} />}</article>
      : <article className="panel news-read" aria-busy="true"><SkeletonRows n={1} h={20} /><SkeletonRows n={1} h={32} /><SkeletonRows n={4} h={18} /></article>}
  </div>;
}
