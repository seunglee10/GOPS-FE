---
version: alpha-current
name: GOPS workspace design system
description: "A dense market-analysis workspace built around a full-screen heatmap or chart canvas, compact flat panels, and a bottom agent command bar. Ships light (default) and dark themes off one primitive token pair. The visual priority is repeat trading/research work: scan fast, compare panels, keep chrome quiet, and reserve accent color for action, focus, and live market state."
source:
  app: gops-frontend
  styles: src/styles.css
  entry: index.html
updatedFor:
  font: Asta Sans
  typeScale: unified semantic typography roles
  chrome: side rail removed
  build: split production chunks
---

# GOPS Design

This file describes the current GOPS frontend, not the older Framer-inspired
marketing reference. Use it when changing 이 저장소 UI, layout,
or visual tokens.

## Product Shape

GOPS is a full-screen financial workspace. The first screen is the product
itself: a market treemap or a tiled chart workspace with an always-available
agent command input. It is not a landing page, documentation page, or marketing
site.

Primary modes:

- `treemap`: S&P 500 market map as the central canvas.
- `chart`: resizable panel workspace containing charts, news, order flow,
  comparisons, company data, ontology, recommendations, and portfolio panels.
- `agent`: bottom command input plus optional chat log, layered over the
  workspace without becoming a side panel.

The side rail and side overlay menu have been removed. Do not reintroduce
side buttons, side panels, or hidden edge rails unless the product direction
explicitly changes.

## Design Principles

- Keep the canvas first. Panels and chrome should feel attached to the data,
  not like a separate dashboard frame.
- Favor dense but calm information surfaces. This is an operational tool for
  repeated scanning and comparison.
- Use the locked three-surface hierarchy, neutral ink, and one blue action color
  for selection and focus. Dark separates the three surfaces by fill; light
  makes all three white and separates them by hairline.
- Avoid marketing composition: no hero sections, no oversized editorial copy,
  no decorative blobs, no promo cards.
- Use icon controls for tools and compact commands. Text buttons are reserved
  for explicit labels such as `Leave`.
- Do not add a side rail. Navigation belongs in the top preset dock, the panel
  workspace, or the bottom agent command bar.

## Tokens

The active tokens live in `src/styles.css`.

색은 두 테마를 가진다. **라이트가 기본값**이고 맨몸 `:root`에 산다. 다크는
`:root[data-theme="dark"]`에서 원시 토큰만 되돌린다 — 파생 토큰
(`--coinbase-*`, `--gops-*`, `--color-*`)은 손대지 않아도 따라온다. 새 색을
추가할 때도 이 규칙을 지킨다: 원시 토큰 한 쌍만 정의하고 파생은 건드리지 않는다.

```yaml
colors:
  # 라이트 (기본) / 다크
  header: "#ffffff / #1b1b1b"
  canvas: "#ffffff / #232323"
  chart-canvas: "#ffffff / #232323"
  panel: "#ffffff / #272727"
  panel-strong: "#ffffff / #272727"
  control: "#ffffff / #272727"
  ink: "#16181c / #ffffff"
  ink-muted: "#5f6570 / #999999"
  muted-soft: "#8a9099 / #6f6f6f"
  hairline: "#e4e4e7 / #262626"
  hairline-strong: "#d0d0d5 / #333333"
  accent-blue: "#0b6bcb / #0099ff"
  accent-blue-active: "#0952a5 / #33adff"
  point-yellow: "#a16207 / #fff436"
  point-orange: "#c2410c / #ff490a"
  point-purple: "#7c22ce / #9c3dff"
  up: "#22c55e"          # 테마 공통
  down: "#ff5577"        # 테마 공통
  caution: "#b45309 / #ff7a3d"
  # 소셜 로그인 제공자가 브랜드 가이드로 고정한 값. 우리 팔레트가 아니라서
  # 테마별 변형을 만들지 않는다 — 라이트/다크에서 같은 색이 정상이다.
  brand-google-surface: "#ffffff"
  brand-google-surface-hover: "#f8f9fa"
  brand-google-border: "#dadce0"
  brand-google-ink: "#1f1f1f"
  brand-kakao: "#fee500"
  brand-kakao-hover: "#fdd835"
  brand-kakao-ink: "#000000"

layout:
  top-nav-height: 48px
  bottom-nav-height: 64px
  control-size: 36px
  app-ui-scale: 0.96
  grid-gutter: "clamped 6px to 10px, based on viewport width"

radius:
  app-glass: 8px
  panel: 8px

panel:
  padding: 8px
  gap: 12px
  border: "transparent"
  shadow: "none"
  filter: "none"
  note: "Core panels are flat solid surfaces; legacy glass variable names do not authorize glass effects."

typography:
  display-xl: "48px / 500 / 1.1 / 0"
  display-lg: "40px / 400 / 1.2 / 0"
  display-md: "32px / 400 / 1.2 / 0"
  title-lg: "24px / 400 / 1.35 / 0.12px"
  instrument-name: "24px / 700 / 1.2 / 0"
  title-md: "20px / 400 / 1.5 / 0"
  title-sm: "18px / 500 / 1.4 / 0"
  label-md: "16px / 500 / 1.4 / 0"
  button: "16px / 500 / 1.4 / 0"
  body-md: "14px / 400 / 1.25 / 0"
  caption: "14px / 500 / 1.35 / 0.16px"
  legal: "13.12px / 600 / 1.2 / 0"
  pricing-display: "44.8px / 475 / 1.1 / 0"
  pricing-section: "28px / 475 / 1.2 / 0"
  pricing-card-title: "20px / 475 / 1.3 / 0"
```

### 테마 전환

`<html>`의 `data-theme` 속성으로 고른다. 속성이 없으면 라이트다.

라이트에서 액센트 색은 다크 값을 그대로 쓰지 않는다. 다크 팔레트를 흰 배경에
그대로 올리면 accent-blue `#0099ff`가 3.00:1, point-yellow `#fff436`이 1.15:1로
WCAG AA에 미달한다. 위 표의 라이트 값은 흰 배경 기준 4.5:1 이상을 만족하도록
다시 잡은 값이다. 라이트 색을 새로 고를 때도 이 기준을 지킨다.

**단, 상승/하락(`up`/`down`)은 예외로 테마 공통이다.** 증시지도 타일이 이 색을
투명도 48~92%로 캔버스에 합성하는데, 낮은 투명도가 다크에서는 "더 짙게"인 반면
흰 캔버스에서는 "더 옅게"로 방향이 뒤집힌다. 여기에 AA를 맞추려 어둡게 잡은 값을
넣으면 넓은 면에서 채도가 죽어 회색빛이 된다(`#0b7a42`를 흰 배경에 48%로 올리면
`#8abfa4`). 시장 색은 식별이 대비보다 우선하므로 두 테마 모두 같은 값을 쓴다.

짙게 칠해진 타일 위 라벨은 `--color-tile-text-inverse`로 뒤집힌다. 그 뿌리인
`--coinbase-on-dark`는 "어두운 면 위의 잉크"라는 고정된 맥락이라 테마를 따라가지
않는다 — 두 테마 모두 `#ffffff`다. 원시 잉크 토큰(`--framer-ink`)에 연결하면
라이트에서 검정이 되어 뒤집기 장치가 무너진다.

### 서피스 계층

다크는 면 색 차이로 계층을 만든다 — header `#1b1b1b` < canvas `#232323` <
panel `#272727`. 테두리는 쓰지 않는다.

라이트는 셋 다 `#ffffff`라 면 색으로 계층을 만들 수 없다. 대신 hairline
(`#e4e4e7`)이 패널 경계를 지는 유일한 수단이다. 이건 장식용 테두리 금지 규칙의
예외가 아니라, 라이트에서 테두리가 구조적 역할을 넘겨받는다는 뜻이다.

패널 규칙은 전부 `border: 0`이고 `box-sizing: border-box`가 전역이 아니라서,
테두리를 실제 `border`로 걸면 레이아웃이 밀린다. 대신
`--app-panel-glass-shadow`가 `inset 0 0 0 1px var(--app-panel-glass-border)`를
들고 있고, 패널은 `box-shadow: var(--app-panel-glass-shadow)`로 이 링을 받는다.
다크에서는 `--app-panel-glass-border`가 `transparent`라 같은 링이 무효화된다.

새 패널 표면을 만들 때 `box-shadow: none`을 직접 쓰지 말고 이 토큰을 쓴다.
쓰지 않으면 라이트에서 그 패널만 경계가 사라진다.

### 토큰이 아닌 관용값

다음 값은 CSS 변수가 아니라 각 규칙에 직접 적는다. 디자인 결정이 아니라
고정된 표기이므로 토큰으로 승격하지 않는다.

| 값 | 의미 | 사용처 |
| --- | --- | --- |
| `border-radius: 999px` | 완전히 둥근 모서리(pill). 실질적으로 변하지 않는 관용값 | 141곳 |
| `border-radius: 6px` | 작은 오버레이·칩 모서리 | 75곳 |
| `border-radius: 14px` | 챗 말풍선 모서리 | 3곳 |

패널과 앱 셸의 모서리는 이와 별개로 `--app-glass-radius`(8px)와
`--surface-radius`를 쓴다. 새 패널 표면에는 관용값 대신 이 토큰을 쓴다.

### `header` 색

`colors.header`는 `--framer-header`(원색) → `--coinbase-header`(의미) 두 단계
토큰이다. 이 톤은 두 가지 역할을 겸한다.

- 앱 크롬: `.workspace-top-nav`, `.workspace-bottom-nav .agent-box`,
  `.compare-cockpit-tabs`, AI 코치 셸 footer
- 캔버스와 구분되는 오버레이: tooltip, 비교 사이드바 backdrop,
  점수 분해 패널

두 역할 모두 같은 값을 쓰므로 토큰 하나로 다룬다. 한쪽만 바꿔야 하는 상황이
생기면 그때 역할을 분리하고 이 문서를 함께 고친다.

다크에서는 이 톤이 캔버스보다 **어두워서** 오버레이 역할을 겸했다. 라이트에서는
헤더도 캔버스도 `#ffffff`라 그 대비가 사라진다. 오버레이 쪽 역할은 hairline이나
`surface-dark` 믹스로 넘겨야 하며, 이건 두 역할을 분리해야 하는 첫 사례다.

## Typography

The app loads Asta Sans from Google Fonts in `index.html`.
All primary font variables resolve to Asta Sans:

```css
--font-ui-serif: "Asta Sans", Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-ui-sans: "Asta Sans", Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-data-sans: "Asta Sans", Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

The font family remains Asta Sans. The semantic roles below are the only
approved typography contract for the product. Each role is a complete,
indivisible style: size, weight, line height, letter spacing, and text transform
must travel together.

| Role | Size | Weight | Line height | Letter spacing | Transform | Reference example |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `display-xl` | 48px | 500 | 1.1 | 0 | none | Article h2: `Build the workspace` |
| `display-lg` | 40px | 400 | 1.2 | 0 | none | Homepage h1 hero: `All your teams, all their workflows` |
| `display-md` | 32px | 400 | 1.2 | 0 | none | Platform feature head: `Conversational app building` |
| `title-lg` | 24px | 400 | 1.35 | 0.12px | Section title: `Sophisticated workflows` |
| `instrument-name` | 24px | 700 | 1.2 | 0 | none | File-tab ticker or company name: `LLY` |
| `title-md` | 20px | 400 | 1.5 | 0 | none | Sub-section title: `Don't just talk. Deploy it.` |
| `title-sm` | 18px | 500 | 1.4 | 0 | none | Article-card title: `10 best AI app builders for 2026` |
| `label-md` | 16px | 500 | 1.4 | 0 | none | Demo-card title: `Production apps in prototype speed` |
| `button` | 16px | 500 | 1.4 | 0 | none | CTA label: `Get started for free` |
| `body-md` | 14px | 400 | 1.25 | 0 | none | `From scrappy startups to enterprise teams, Airtable adapts to whatever you need next without forcing a rebuild.` |
| `caption` | 14px | 500 | 1.35 | 0.16px | Meta label: `AI PROJECT PLANNING` |
| `legal` | 13.12px | 600 | 1.2 | 0 | none | Legal action: `Cookies Preferences` |
| `pricing-display` | 44.8px | 475 | 1.1 | 0 | none | Pricing h1: `A plan for every organization's needs` |
| `pricing-section` | 28px | 475 | 1.2 | 0 | none | Pricing section head: `Compare plans` |
| `pricing-card-title` | 20px | 475 | 1.3 | 0 | none | Tier name: `Business` |

GOPS component mapping:

| Component content | Required role |
| --- | --- |
| Article or editorial h2 | `display-xl` |
| Homepage hero h1 | `display-lg` |
| Platform feature head or dominant workspace value | `display-md` |
| Section title or featured instrument | `title-lg` |
| File-tab ticker or company name | `instrument-name` |
| Sub-section or major panel title | `title-md` |
| Article-card or prominent result title | `title-sm` |
| Demo-card, compact card, row, and utility title | `label-md` |
| CTA, tab, and text-action label | `button` |
| Body, footer, top navigation, input, and descriptive copy | `body-md` |
| Captions, chart axes, timestamps, metadata, status, and category text | `caption` |
| Cookie, attribution, and legal actions only | `legal` |
| Pricing-page h1 only | `pricing-display` |
| Pricing section heading only | `pricing-section` |
| Pricing tier name only | `pricing-card-title` |

Workspace panel sizing policy:

- Panel content and shared application chrome use the same compact local role
  scale. New panel content maps its role names onto those existing tokens rather
  than promoting every role globally.
- Headlines in flip-style news cards use the local `title-lg` role and wrap
  naturally up to three lines when the title exceeds the card width. Padding keeps
  the text clear of both the chart line and the bottom flip-progress strip;
  the chart is subdued beneath the headline region.
- The bottom Agent composer retains the existing compact control dimensions.

Enforcement rules:

- Asta Sans is mandatory for every role. Do not replace it or introduce a
  secondary display, body, data, or monospace family.
- Use the semantic role name through shared typography tokens, classes, or
  mixins. Do not declare local `font-size`, `font-weight`, `line-height`,
  `letter-spacing`, or `text-transform` values in a component.
- Do not mix the metrics from different roles. A `title-md` must always be
  `20px / 400 / 1.5 / 0`, for example.
- Do not add aliases, one-off roles, fluid type with `clamp()`, or intermediate
  values. A new role requires an explicit update to this document and the
  shared typography implementation in the same change.
- Canvas and SVG text must use matching shared numeric constants; renderer
  constraints are not an exception to the scale.
- Choose roles by meaning, not by the available size. Resolve hierarchy with
  the component mapping before using color or spacing as secondary cues.
- Keep the three `pricing-*` roles exclusive to pricing surfaces. Financial
  market values are not pricing-page content.
- `legal` is not a generic small-text role. Use it only for legal or attribution
  content; compact operational text remains `body-md` or `caption`.
- Preserve uppercase in source copy when the content requires it. No role
  forces capitalization.
- Prefer tabular numerals for market-data rows and chart readouts without
  changing the role's prescribed metrics.

## Layout

### App Shell

The app is a fixed full-viewport shell:

- `body`, `html`, and `#root` are `100vw`/`100vh` and `overflow: hidden`.
- `canvas-workspace` fills the viewport.
- The shell renders at `0.96` scale with an inverse-sized logical viewport,
  matching the previous `0.8` runtime viewed at 120% browser zoom. Keep the runtime
  constant, CSS fallback, and this document synchronized.
- A heatmap background layer can sit behind the active workspace.
- Top and bottom nav are fixed overlays with pointer events only on controls.

### Workspace Grid

Chart mode uses a tiled panel workspace:

- 4 logical grid columns.
- grid gutter: `round(min(10, max(6, viewportWidth * 0.006)))`.
- top inset: 52px.
- bottom inset: 64px.
- panels can be resized, moved, replaced, or removed in layout edit mode.

On narrow screens, the layout locks at or below 760px.

### Removed Side Surface

The old `index-side-rail` and `bottom-menu-panel.side-overlay` surfaces are no
longer part of the product. The current design has:

- no left side rail,
- no side menu buttons,
- no side overlay menu,
- no side watchlist/settings/portfolio drawer.

If a feature needs a home, use one of these surfaces instead:

- a workspace panel,
- the top preset dock,
- the bottom agent command,
- an in-panel popover,
- an alert toast.

## Surfaces

### Flat Panels

Most app panels share the same flat surface language:

```css
border: 0;
border-radius: var(--app-glass-radius);
background: var(--app-panel-glass-background);
box-shadow: none;
backdrop-filter: none;
```

`--app-panel-glass-background` is a compatibility name whose active value is
the solid panel color — `#ffffff` in light, `#272727` in dark. It does not
authorize transparency, gradients, blur, glow, or shadow. Structural surfaces
use only the locked hierarchy: header and bottom command pill, app/chart canvas,
and panels/controls. In dark those are `#1b1b1b` / `#232323` / `#272727`; in
light all three are `#ffffff` and the hairline carries the separation. Do not
invent nearby black, white, or gray surface colors — always reference the token.

비교 코크핏(`.compare-cockpit*`)은 예외적으로 다크 팔레트 전체를 하드코딩으로
복제해 갖고 있었다(표면 6종·잉크 5종·액센트 5종, 156곳). 이제 전부 공용 토큰을
쓴다. 이 과정에서 `#303030`·`#3a3a3a`·`#3b3b3b`·`#202020`·`#484848` 같은
"근처 회색 변종"이 잠금된 계층으로 흡수되어 다크 톤이 미세하게 움직였다 —
아래 Do Not의 금지 조항을 뒤늦게 적용한 결과이지 새 결정이 아니다.

`--panel-black`은 네 곳에서 `#272727`로 지역 재선언되던 별칭이었다. 이제 값이
`var(--app-panel-glass-background)`라 사용처 13곳이 테마를 따라간다. 새 패널에
이런 지역 색 별칭을 다시 만들지 않는다.

Applies to:

- workspace panels,
- chart compare panels,
- news and company panels,
- order ticket,
- ontology panel,
- recommendations,
- alert toast,
- symbol search menu,
- bottom chat panel.

Recommendation selection has one narrow product-directed exception: a selected
row in `recommendationsList` uses a white paper surface with black ink. The
`recommendationExplain` report and surrounding panel chrome remain in the
locked hierarchy. This exception does not authorize white cards or
alternate structural surfaces in other panels; blue remains the focus/action
color and market status keeps its semantic green, red, and caution colors.
Recommendation scores use plain blue text without a fill; selected
score-profile presets retain the white fill with black ink. Score hover details
stay on the header surface with a `hairline-strong` edge. Recommendation weight segments use
only the approved blue, yellow, orange, purple, green, and red point accents.

### Panel Chrome

Panel chrome is intentionally hidden by default:

- panel title appears as a small overlay only on hover or in layout edit mode;
- body content fills the panel;
- scrollbars are thin, neutral/white, and edge-aligned;
- chart panel controls stay inside the chart panel, not in global chrome.

### Treemap

The treemap is a full visual surface, not a card gallery:

- panel radius: 8px;
- background: the solid panel surface `#272727` without a decorative edge treatment;
- hover metadata appears top-left, compact and non-interactive;
- cell/tile radius is currently `0px` for heatmap cell geometry;
- up/down color uses semantic green/red, not decorative palette variants.
- sector and industry header bands reserve at least the assigned role's line
  box; labels are hidden when that height is unavailable;
- Korean and Latin labels are clipped to their own band or symbol cell and use
  a single Unicode ellipsis when width is constrained. Never shrink them below
  the approved typography roles or let them overlap adjacent tiles.

### Chart Workspace

Charts sit inside flat panel frames:

- chart canvas background is the solid app canvas color `#232323`;
- current price, comparison legends, drawing tools, and add-layer tools are
  overlays inside the chart panel;
- chart toolbar controls use icons and compact separators;
- chart drawing and add docks float just above the bottom command band.

### Index Panel

The `지수` panel follows the quiet flat-panel system:

- no backdrop blur on `market-indices-panel` or `index-widget-panel`;
- no decorative border or shell shadow;
- rotating index cards override `surface-raised` with a flat dark fill;
- sparkline area fill stays low opacity so the chart does not glow.

The index panel should read like quiet market data, not a highlighted
promotional tile.

## Navigation And Commands

### Top Nav

The top nav is quiet:

- fixed at top, 48px tall;
- solid header-token background with ink-token content;
- active preset uses an ink-filled pill with inverted text;
- center slot is reserved for the preset dock in chart mode;
- right side carries the simulator control, notifications, theme toggle, and
  login/logout state.

There is no top alert/settings drawer trigger after the side-panel removal.

### 로그인 페이지

로그인은 워크스페이스 위의 오버레이가 아니라 **자체 URL을 가진 화면**(`/login`)
이다. 뒤로 가기와 북마크가 동작하고, 인증이 필요해 튕겨낼 때 돌려보낼 주소가
생기기 때문이다. 상단 로그인 컨트롤은 `/login?returnTo=<현재경로>`로 이동한다.

라우팅 라이브러리는 쓰지 않는다. 경로가 이 하나뿐이라 `src/main.tsx`가
`window.location.pathname`을 보고 `<LoginPage />`와 워크스페이스 트리 중
하나만 마운트한다. nginx의 `try_files ... /index.html` 폴백이 새로고침을
받아준다. 경로가 더 늘어나면 그때 라우터를 도입한다.

- 로그인 페이지에는 워크스페이스 프로바이더(모의계좌·AI 코치·알림 설정)를
  태우지 않는다. 로그인 화면에서 워크스페이스 API를 호출할 이유가 없다.
- 이미 로그인한 사용자가 `/login`을 열면 `returnTo`로 즉시 되돌린다.
- `returnTo`는 `/`로 시작하고 `//`가 아닌 같은 출처 경로만 통과시킨다.
  서버도 같은 검사를 하지만 클라이언트에서도 막는다.
- 제공자 버튼은 **예외적으로 각 제공자의 브랜드 가이드를 따른다** — 48px 높이,
  좌측 16px에 절대 배치한 18px 마크, 중앙 라벨. 구글은 흰 배경에 `#dadce0`
  테두리, 카카오는 노란 배경에 검은 라벨.
- 이 예외는 로그인 페이지에만 적용된다. 이걸 근거로 상단 내비나 다른 명령
  버튼에 브랜드 색을 칠하지 않는다 — quiet 내비 규칙은 그대로다.
- 브랜드 버튼은 워크스페이스 토큰(`--color-surface` 등)을 쓰지 않는다.
  제공자가 정한 색이라 테마를 따라 변하면 가이드 위반이다.
- `.btn-social` 같은 일반적인 클래스명은 반드시 `.login-page` 아래로
  스코프한다. 전역에 풀어두면 다른 컴포넌트와 충돌한다.
- 제공자를 추가할 때는 `--color-brand-<provider>-*` 토큰을 더하고
  `.login-page .btn-<provider>` 규칙만 붙인다.

제공자 동의 화면 자체도 팝업 창이 아니라 **전체 페이지 리다이렉트**로 간다.
팝업은 차단기와 모바일 브라우저에서 깨지고 `postMessage` 배선을 요구한다.

`.workspace-theme-toggle`은 아이콘 전용 컨트롤로, 클릭할 때마다
Light → Dark → System을 순환한다. 선택은 `gops:theme` 키로 저장되고,
`index.html`의 인라인 부트스트랩이 첫 페인트 전에 `data-theme`를 세팅해
새로고침 시 깜빡임을 막는다.

### 선택된 프리셋

"지금 어느 화면인가"를 나타내는 유일한 신호다. 알약은 버튼 배경이 아니라 뒤에서
슬라이드하는 `.layout-preset-active-indicator`가 그린다 — 버튼은 `transparent`로
두어 알약이 비쳐 보이게 하고, 활성 라벨만 `--color-background`로 뒤집어 알약 위에서
읽히게 한다.

| | 알약 | 라벨 |
| --- | --- | --- |
| 라이트 | `--color-text` → `#16181c` | `--color-background` → `#ffffff` |
| 다크 | `--color-text` → `#ffffff` | `--color-background` → `#232323` |

선택 상태는 hover·focus·press보다 우선한다. 마우스를 얹었다고 현재 화면 표시가
사라지면 안 되므로, 프리셋 독의 `.is-active` 규칙이 이 세 상태를 모두 잠근다.
`.is-active`를 눌림 상태(`:active`) 규칙과 같은 선택자 묶음에 넣지 않는다 —
선택은 상태이지 동작이 아니라서 `translateY` 같은 눌림 피드백을 받으면 안 된다.

캔버스 렌더러(차트·트리맵·오더플로우)는 CSS 변수를 매 draw마다 다시 읽으므로,
테마 전환에는 리드로우만 걸면 된다. 훅이 가능한 자리는 `useThemeVersion()`을
deps에 넣고, 명령형 루프는 `subscribeThemeChange()`를 구독한다. 새 캔버스 표면을
추가하면 둘 중 하나를 반드시 배선한다 — 빠뜨리면 그 캔버스만 옛 테마로 남는다.

### Bottom Agent Command

The bottom command bar is the primary global command surface:

- fixed at bottom, 64px tall;
- transparent nav wrapper;
- centered `agent-box` spans the available width;
- pill radius (`999px`);
- solid `#1b1b1b` fill with a subtle white stroke and no blur or shadow;
- contains reference chips, input, send/stop button, and chat toggle.

The agent input placeholder changes by mode:

- chart mode: `Agent에게 물어보기`
- treemap mode: `기업명/티커로 차트 열기`
- unauthenticated when auth is required: `로그인 후 Agent를 사용할 수 있습니다`

### Chat Panel

The chat panel opens above the agent box:

- same solid `#272727` family as other panels;
- assistant/system messages sit in 14px rounded translucent message boxes;
- confidence is shown as a small tone dot when available;
- details/citations are collapsible to keep the command surface compact.

## Interaction States

Use color, not size, for most interaction feedback:

- hover/focus action color: `#0099ff`;
- active action color: `#0099ff`;
- chart/graph point accents: yellow `#fff436`, orange `#ff490a`, purple
  `#9c3dff`, green `#22c55e`, red `#ff5577`, and blue `#0099ff`;
- stop/destructive color: `#ff5577`;
- positive market state: `#22c55e`;
- warning/caution/reference highlight: `#ff7a3d`;
- disabled opacity: about `0.5` to `0.58`.

Avoid layout shift on hover. Controls should not resize when hovered, focused,
or active.

Point accents distinguish series, markers, annotations, or graph points. Green,
red, and blue may be used as point accents when they do not create ambiguity
with bullish, bearish, or primary-action meaning. Point accents are never
structural surface colors.

## Component Rules

### Buttons

- Prefer icon buttons for chart tools, agent send/chat, drawing tools, and
  panel edit controls.
- Keep command buttons visually transparent by default.
- Use text only when the action is clearer as text, for example `Leave`.
- Minimum target should remain practical even when the visual icon is compact.

### Panels

- Use panels for working content, not for marketing copy.
- Do not put cards inside decorative cards.
- Use `--panel-padding: 8px` and `--panel-gap: 12px` unless a dense data view
  has an established local exception.
- Panel hover chrome should reveal controls without occluding essential data.

### Search And Inputs

- Inputs are borderless inside a pill or flat container.
- Symbol search menus use the solid panel surface and stay local to the invoking
  panel/control.
- Do not introduce a global search drawer.

### Alerts

- Alert toasts may appear globally.
- The removed side alert menu should not be restored as a side overlay.
- Toast actions may open a chart directly when a symbol is present.

## Responsive Behavior

Mobile and narrow layouts:

- bottom nav becomes a single-column command strip;
- agent box fills available width;
- agent input remains `body-md` and text actions remain `button`;
- side rail remains absent on all breakpoints;
- panel text must stay inside its bounds.

Do not scale fonts continuously with viewport or container width and do not
override a role's metrics at a breakpoint. Responsive components may switch to
a different approved role only when their semantic hierarchy also changes.
Prefer layout constraints and wrapping before changing roles.

## Build And Performance

Production build uses Rollup manual chunks in
`vite.config.ts`:

- `vendor-react`
- `vendor-d3`
- `vendor-icons`
- `chart-engine`
- `chart-core`
- `layout-core`
- `market-ui`
- `workspace-ui`
- `panel-ui`
- `vendor`

Do not fix chunk warnings by only raising `chunkSizeWarningLimit`. Prefer
stable chunk boundaries that match actual app domains.

## Do And Do Not

Do:

- keep the app full-screen and data-first;
- keep Asta Sans as the shared UI/data font;
- keep the locked three-surface hierarchy — dark `#1b1b1b` / `#232323` / `#272727`,
  light all-`#ffffff` separated by hairline;
- define a new color as a light/dark primitive pair and let derived tokens follow;
- verify a new light color clears 4.5:1 on `#ffffff` before adopting it;
- use blue for action, focus, selection, and current-price emphasis;
- use flat panels with 8px radius, no blur, and no shadow. Borders are structural
  in light (they carry the panel edge) and absent in dark;
- use the bottom agent command as the primary global command surface;
- keep chart and layout tools close to the panel they affect;
- verify `npm run build` after UI structure changes.

Do not:

- reintroduce the side rail or side overlay panels;
- add marketing hero sections or decorative card-heavy pages;
- introduce arbitrary structural black/white/gray variants or translucent-black surfaces;
- hardcode a hex in a rule when a token exists, or assume one theme's ink color
  (`#ffffff` text, `rgb(255 255 255 / a)` overlays) in shared styles;
- add structural gradients, blur, glow, or shadows to create surface hierarchy;
- use gradient orbs or decorative bokeh backgrounds;
- repurpose `legal` or any `pricing-*` role as a generic small or financial-value style;
- introduce typography outside the approved semantic roles;
- add visible instructions explaining how to use normal controls;
- hide build-size issues by raising thresholds without a reason.
