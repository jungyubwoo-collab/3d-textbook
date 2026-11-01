# CLAUDE.md

웹 3D 교과서. 책상 위 3D 책을 펼치면 오른쪽 페이지에서 잉크 그림 같은 3D 장면이 일어서고, 학생은 예측 → 3D 실험 → 덮개를 들춰 정답 확인 → 도장 흐름으로 공부한다. 사용자·문서·UI 문구와 코드 주석은 한국어로 쓴다.

## 명령

- `npm run dev` — API(:4000) + 웹(:5173). 웹만: `npm run dev:web`
- `npm run check` — 포맷 검사, Oxlint, 타입 검사, 테스트. 커밋 전에 반드시 실행
- `npm run format` — Prettier
- `npm test -w @3d-textbook/web` — 워크스페이스 하나만 테스트
- `npm run db:up` / `npm run db:deploy` / `npm run db:migrate -- --name <이름>`
- DB 통합 테스트: `TEST_DATABASE_URL=postgresql://textbook:textbook@localhost:5432/textbook npm test -w @3d-textbook/api`

## 구조

- `apps/web/src/book/` — 책 엔진. 책 내용은 `content/book.ts`의 `book` 하나만 가져다 쓰고, 단원별 코드를 직접 import하지 않는다.
  - `structure.ts` 페이지 → 장(leaf) → 펼침면(spread) 계산. 짝수 번째 페이지 = 오른쪽.
  - `typeset.ts` 블록을 canvas 좌표로 배치(순수 함수, 테스트 있음). `paint.ts` 실제 그리기.
  - `Book.tsx` 넘김 애니메이션(뼈 회전), 책등, 팝업 슬롯. `PageOverlays.tsx` 보기·차례 클릭 영역, 덮개, 도장 효과.
  - `leafRig.ts` 뼈대가 든 종이 메시. `usePageAsset.ts` 페이지 텍스처(가까운 장만 생성).
- `apps/web/src/content/` — 책 내용. `book.ts`가 페이지 순서, `lessons/<id>/`가 단원(글 블록 + 3D 장면).
- `apps/web/src/ink/` — 잉크 재질(`inkMaterial(color)`, 툰 + 화면 좌표 빗금)과 `<InkLines />`.
- `apps/web/src/state/bookStore.ts` — zustand 바닐라 스토어 `bookStore` + 훅 `useBookStore(selector)`.
- `apps/api/` — Express 5 + Prisma 7. Node 24가 `.ts`를 직접 실행한다(빌드 없음). 진입점 `src/index.ts`, 앱 조립 `src/app.ts`.
- `packages/shared/` — zod 스키마와 API 타입. 웹은 `import type`으로만 가져온다.

## 규칙

- TypeScript는 지울 수 있는 문법만 쓴다(`erasableSyntaxOnly`): enum, namespace, 생성자 매개변수 프로퍼티 금지. `as const` 객체를 쓴다.
- 상대 경로 import에는 `.ts`/`.tsx` 확장자를 붙인다(Node가 그대로 실행하기 때문).
- 컴포넌트 밖(이벤트 처리기, `useFrame`)에서는 `bookStore.getState()`, 렌더 중에는 `useBookStore(selector)`.
- 매 프레임 바뀌는 값은 React 상태가 아니라 ref로 다룬다(`runtime.ts`의 `progress`, `openness`). 렌더 중에 `ref.current`를 읽지 않는다(Oxlint `react/refs`).
- Three.js 객체를 만들면 `useEffect` 정리 함수에서 `dispose()` 한다.
- 단원·문항·보기 ID는 소문자-하이픈. API에 저장되므로 공개 후 바꾸지 않는다.
- 테스트는 대상 파일 옆 `*.test.ts(x)`. 3D(WebGL)는 jsdom에서 못 돌리므로 계산은 순수 함수로 빼서 테스트한다(`physics.ts`, `typeset.ts`, `structure.ts`).

## 주의할 점

- Prisma는 `~7.10.1`로 고정. npm `latest` 태그가 8.0 RC라서 버전 없이 설치하면 안 된다. `schema.prisma`를 고치면 `npm run db:migrate -- --name <이름>`(클라이언트도 다시 생성됨). 생성 코드 `apps/api/src/generated/`는 커밋하지 않는다(`npm install` 때 `postinstall`이 만든다).
- Prisma 7은 `.env`를 자동으로 읽지 않는다. `prisma.config.ts`가 `apps/api/.env`를 읽는다.
- drei 10의 `<Outlines>`는 `screenspace`를 끈 기본값에서 thickness가 픽셀, 켜면 월드 단위다(이름과 반대). `InkLines`를 거쳐서만 쓴다. drei를 올린 뒤에는 장면이 검은 덩어리로 덮이지 않는지 화면으로 확인한다.
- 오른쪽 페이지(짝수 번째)에만 `scene`을 둘 수 있다. `validateBook`이 검사하고 `content/book.test.ts`가 실패한다.
- 페이지 내용이 넘치면 개발 서버 콘솔에 경고가 나온다. 페이지를 나누거나 글을 줄인다.
- 3D 화면을 고친 뒤에는 실제로 띄워서 확인한다. 헤드리스 Chromium에서는 `--use-angle=swiftshader`로 WebGL을 켤 수 있다(느리므로 애니메이션 중간은 잘 안 찍힌다).
- TypeScript 7을 쓰므로 typescript-eslint는 쓰지 않는다. 린트는 Oxlint(`.oxlintrc.json`, 타입 기반 규칙 포함).
