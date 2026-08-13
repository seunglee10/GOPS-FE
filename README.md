# GOPS Frontend

GOPS 트레이딩 워크스페이스의 React 프론트엔드입니다. 백엔드·플랫폼·인프라는
별도 저장소(**gops-backend**)에 있습니다.

## 저장소 구조

```text
src/                          React 앱 (도메인별 폴더)
  agent/                      AI 에이전트 패널·코치
  chart/                      차트 패널·드로잉·분석 레이어
  layout/                     패널 워크스페이스·프리셋
  orders/  alerts/  news/  portfolio/  ontology/  recommendations/
packages/chart-engine/        차트 문서·런타임·캔버스 엔진 (@gops/chart-engine)
shared/chart-contract/        백엔드와 공유하는 차트 계약 JSON 스키마 (사본)
fixtures/replay-candles/      AI 코치 리플레이용 캔들 fixture (빌드 타임 주입)
tests/                        node:test 기반 테스트
scripts/                      테스트 러너·번들 예산 검사
docker/                       Dockerfile, nginx 설정
DESIGN.md                     디자인 시스템 (색·타이포·패널·차트 토큰)
```

`@gops/chart-engine`은 `vite.config.ts`의 alias와 `tsconfig.json`의 `paths`로
`packages/chart-engine/src`에 연결됩니다. npm 워크스페이스가 아니므로 별도 설치는
필요 없습니다.

## 시작하기

```sh
cp .env.example .env      # VITE_BACKEND_TARGET 등을 채웁니다
npm ci
npm run dev               # http://localhost:5173
```

`/api`, `/ws` 요청은 vite dev server가 `VITE_BACKEND_TARGET`(기본
`http://127.0.0.1:8000`)으로 프록시합니다. gops-backend 저장소에서
`docker compose up`으로 백엔드를 먼저 띄우세요.

## 검사

```sh
npm run build             # tsc -b 타입체크 + vite 프로덕션 빌드
npm run test:chart        # 차트 런타임·드로잉·분석 자산
npm run test:simulator
npm run test:layout
npm run test:ai-coach     # AI 코치 UI 계약
npm run test:alerts
npm run test:bundle-size  # 번들 예산
npm run test:chart-visual # playwright 스크린샷 (로컬 Chrome 필요)
```

CI(`.github/workflows/ci.yml`)가 `build` 외 전 스위트를 실행합니다.

## 컨테이너

```sh
docker build -f docker/Dockerfile -t gops-frontend .
```

빌드 컨텍스트는 이 저장소 루트입니다. nginx가 정적 파일을 5173 포트로 서빙하고
`/api`, `/ws`는 `gops-backend:8000` 서비스로 프록시합니다.

gops-backend 저장소의 `docker-compose.yml`은 `gops-frontend` 서비스를
`${GOPS_FRONTEND_PATH:-../gops-frontend}` 경로에서 빌드합니다. 두 저장소를 나란히
클론했다면 추가 설정 없이 동작합니다.

## 백엔드와의 계약

`shared/chart-contract/`는 gops-backend가 **원본(SSOT)** 을 소유하고 이 저장소는
사본을 둡니다. 백엔드에서 스키마가 바뀌면 이 폴더로 복사해 주세요.

```sh
cp -R ../gops-backend/shared/chart-contract/. shared/chart-contract/
npm run test:chart
```
