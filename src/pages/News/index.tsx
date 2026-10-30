/* 뉴스 화면. 목업 gops.js pageNews(2222)·newsHub(2187)·relStocks(2164).
   인기 뉴스는 서버가 정한 순서(sort=hot)로만 줄 세우고 조회 수는 보여 주지 않는다. 관련 종목은 이름만 (등락률 없음) */
import { Link } from "react-router-dom";
import type { NewsCategory, NewsItem } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { HAS_LOGO, logoBg, logoUrl } from "../../data/logos";
import { useNews, useArticle, useAccount } from "../../data/hooks";
import { Ptitle } from "../_shared";

type Group = "mine" | NewsCategory;
const NEWS_GROUPS: [Group, string][] = [["mine", "내 보유·관심"], ["market", "시황·전망"], ["corp", "기업·종목"], ["earn", "실적·공시"], ["rate", "금리·환율"], ["etf", "ETF·지수"], ["global", "해외"]];
/* 종목 마스터에 없는 관련 종목의 이름 (목업 2237줄) */
const EXTRA_NAME: Record<string, string> = { AMZN: "아마존", GOOGL: "알파벳" };
const href = (n: NewsItem) => `/news?n=${n.id}`;

/* 뉴스에 엮인 종목 이름. 내 종목(first)을 앞에, 최대 2개 */
function RelStocks({ rel, first }: { rel: NewsItem["relatedSymbols"]; first?: Set<string> }) {
  const syms = useSymbolMap();
  const ks = rel.filter(r => syms[r.symbol]).sort((a, b) => Number(!!first?.has(b.symbol)) - Number(!!first?.has(a.symbol))).slice(0, 2);
  return ks.length ? <div className="nrel">{ks.map(r => <span key={r.symbol}>{r.nameKo ?? syms[r.symbol].nameKo}</span>)}</div> : null;
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

function NewsHub() {
  const act = useActions("news");
  const { summary } = useAccount();
  const all = useNews({ sort: "new" }).data?.items ?? [];
  const hot = useNews({ sort: "hot", limit: 5 }).data?.items ?? [];
  const groups = act.guest ? NEWS_GROUPS.slice(1) : NEWS_GROUPS;
  const c = act.q("c");
  const cat = groups.some(([k]) => k === c) ? (c as Group) : "";
  const mine = new Set([...(act.guest ? [] : summary.data?.holdings.map(h => h.symbol) ?? []), ...act.starSet()]);
  const of = (k: Group) => all.filter(x => k === "mine" ? x.relatedSymbols.some(s => mine.has(s.symbol)) : x.category === k);
  const head = (t: string, k?: Group) => <div className="panel-head"><Ptitle t={t} href={k ? `/news?c=${k}` : null} /></div>;
  const tabs = <div className="seg nh-tabs"><button aria-pressed={!cat} onClick={() => act.set("c", "")}>전체</button>
    {groups.map(([k, t]) => <button key={k} aria-pressed={cat === k} onClick={() => act.set("c", k)}>{t}</button>)}</div>;
  const title = <div className="nh-title"><h2>뉴스</h2><span className="t-caption">출처·제목은 목업용 예시</span></div>;
  if (cat) {
    const idx = of(cat);
    return <div className="newshub">{title}{tabs}
      <section className="panel nh-cat">{head(groups.find(([k]) => k === cat)![1])}
        <div className="panel-body news">{idx.length ? idx.map(x => <Link key={x.id} className="nitem" to={href(x)}><h4>{x.titleKo}</h4><Meta n={x} mine={mine} /></Link>)
          : <div className="state" style={{ minHeight: 120, gridColumn: "1/-1" }}><p>보유·관심 종목과 관련된 뉴스가 아직 없어요.</p></div>}</div></section></div>;
  }
  const thumb = (x: NewsItem) => {
    const s = x.relatedSymbols.map(r => r.symbol).find(k => HAS_LOGO.has(k)), bg = s ? logoBg(s) : undefined;
    return <span className="nh-thumb" style={bg ? { background: bg } : undefined}>{s ? <img src={logoUrl(s)!} alt="" loading="lazy" /> : <Ic name="trend" />}</span>;
  };
  /* 카드마다 맨 위 기사가 겹치지 않게, 앞 카드에서 이미 크게 보여 준 기사는 건너뛴다 */
  const leads = new Set<string>();
  const card = ([k, t]: [Group, string]) => {
    const idx = of(k), lead = idx.find(x => !leads.has(x.id)) ?? idx[0], rest = idx.filter(x => x !== lead); if (lead) leads.add(lead.id);
    return <section key={k} className="panel nh-card">{head(t, k)}{lead == null ? <div className="state" style={{ minHeight: 160 }}><p>관련 뉴스가 아직 없어요.</p></div> : <>
      <Link className="nh-lead" to={href(lead)}><div><h4>{lead.titleKo}</h4><Meta n={lead} mine={mine} /></div>{thumb(lead)}</Link>
      <div className="nh-rows">{rest.slice(0, 4).map(x => <Link key={x.id} to={href(x)}><span>{x.titleKo}</span><small>{x.source}</small></Link>)}</div></>}</section>;
  };
  return <div className="newshub">{title}{tabs}
    <div className="nh-top">
      <section className="panel">{head("인기 뉴스")}<div className="panel-body news nh-rank">{hot.map((x, r) => <Link key={x.id} className="nitem" to={href(x)}><b>{r + 1}</b><div><h4>{x.titleKo}</h4><Meta n={x} mine={mine} /></div></Link>)}</div></section>
      <section className="panel">{head("해외 뉴스", "global")}<div className="panel-body news nh-world">{of("global").slice(0, 5).map(x => <Link key={x.id} className="nitem" to={href(x)}><div><h4>{x.titleKo}</h4><div className="meta"><span>{x.source}</span></div></div><time>{x.relativeKo}</time></Link>)}</div></section>
    </div>
    <h3 className="nh-sec">뉴스 포커스</h3>
    <div className="nh-grid">{groups.filter(([k]) => k !== "global").map(card)}</div>
  </div>;
}

function Article({ id }: { id: string }) {
  const act = useActions("news");
  const syms = useSymbolMap();
  const list = useNews({ sort: "new" }).data?.items ?? [];
  const { data: a, error } = useArticle(id);
  return <div className="newspage">
    <section className="panel news-list"><div className="panel-head"><span className="t-label">최신 뉴스</span><span className="spacer"></span><span className="t-caption">미국 시장</span></div>
      <div className="panel-body news">{list.map(x => <Link key={x.id} className="nitem" to={href(x)} aria-current={a && x.id === a.id ? "true" : undefined}><h4>{x.titleKo}</h4><div className="meta"><span>{x.source}</span><span>{x.relativeKo}</span></div><RelStocks rel={x.relatedSymbols} /></Link>)}</div></section>
    {a ? <article className="panel news-read">
      <div className="meta"><span>{a.source}</span><span>{a.relativeKo}</span></div>
      <h1>{a.titleKo}</h1>
      {a.bodyKo.map((p, i) => <p key={i}>{p}</p>)}
      {a.relatedSymbols.length ? <div className="news-rel"><span className="t-caption">관련 종목</span><div>{a.relatedSymbols.map(r => <Link key={r.symbol} className="news-sym" to={`/stock?s=${r.symbol}`}><Mark symbol={r.symbol} color={syms[r.symbol]?.color} /><b>{r.nameKo || syms[r.symbol]?.nameKo || EXTRA_NAME[r.symbol] || r.symbol}</b></Link>)}</div></div> : null}
      <div className="news-acts"><button className="btn sm outline" onClick={act.openAi}><Ic name="spark" />이 뉴스 AI에게 묻기</button><a className="linkbtn" href={a.url || "#"}>{a.source} 원문 보기</a></div>
    </article> : error ? <article className="panel news-read"><div className="state"><h3>뉴스를 찾지 못했어요</h3><p>목록에서 다른 뉴스를 골라 주세요.</p></div></article> : <article className="panel news-read" />}
  </div>;
}
