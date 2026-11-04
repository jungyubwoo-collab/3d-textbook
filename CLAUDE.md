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
  - `Book.tsx` 넘김 애니메이션(뼈 회전, `stack.ts`의 `curlWeights`), 가장자리 끌기·들림, 책등, 팝업 슬롯(등장 시간 `reveal`과 잉크 번짐 높이). `PageOverlays.tsx` 보기·차례 클릭 영역, 덮개, 도장 효과.
  - `CameraRig.tsx` 시점: 넘기는 중에는 위에서(평면), 장면 면에 멈추면 비스듬히(입체).
  - `leafRig.ts` 뼈대가 든 종이 메시. `usePageAsset.ts` 페이지 텍스처(가까운 장만 생성).
- `apps/web/src/content/` — 책 내용 "움직임의 법칙". `book.ts`의 `lessons` 배열이 단원 순서, `lessons/<id>/`가 단원 하나: `ids.ts`(단원·문항 ID), `lesson.ts`(글 블록 + 장면 페이지 블록), `physics.ts`(+테스트), 장면 컴포넌트.
- `apps/web/src/scene/` — 장면 부품. `PopUp`(등장 시간 `at`에 솟아오름, `rise`/`grow`/`hinge`), `SceneButton`, `Bars`, `Label`, `PushArrow`, `useLessonGate`(예측 전 조작 잠금).
- `apps/web/src/ink/` — 잉크 재질(`inkMaterial(color)`, 툰 + 화면 좌표 빗금 + 아래부터 차오르는 물감 `inkUniforms.uFillY`)과 `<InkLines />`, 투명 `glassMaterial`.
- `apps/web/src/lib/` — `sound.ts`(Web Audio로 만든 효과음), `capture.ts`(`?capture` 영상 녹화 모드와 동작 등록).
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
- 테스트는 대상 파일 옆 `*.test.ts(x)`. 3D(WebGL)는 jsdom에서 못 돌리므로 계산은 순수 함수로 빼서 테스트한다(단원별 `physics.ts`, `typeset.ts`, `structure.ts`, `stack.ts`).
- 장면 조작 처리기는 첫 줄에서 `if (!allow()) return;`(`useLessonGate(문항ID)`). 장면 단추는 `SceneButton`을 쓰면 녹화용 동작(`<단원>:<id>`)으로도 등록된다.
- Oxlint의 React Compiler 규칙(`react/immutability`)은 훅이 돌려준 값을 고치는 것을 막는다. 매 프레임 고치는 버퍼는 메서드를 가진 객체(예: 진자의 `createTrail()`)나 ref로 감싼다.

## 주의할 점

- Prisma는 `~7.10.1`로 고정. npm `latest` 태그가 8.0 RC라서 버전 없이 설치하면 안 된다. `schema.prisma`를 고치면 `npm run db:migrate -- --name <이름>`(클라이언트도 다시 생성됨). 생성 코드 `apps/api/src/generated/`는 커밋하지 않는다(`npm install` 때 `postinstall`이 만든다).
- Prisma 7은 `.env`를 자동으로 읽지 않는다. `prisma.config.ts`가 `apps/api/.env`를 읽는다.
- drei 10의 `<Outlines>`는 `screenspace`를 끈 기본값에서 thickness가 픽셀, 켜면 월드 단위다(이름과 반대). `InkLines`를 거쳐서만 쓴다. drei를 올린 뒤에는 장면이 검은 덩어리로 덮이지 않는지 화면으로 확인한다.
- 오른쪽 페이지(짝수 번째)에만 `scene`을 둘 수 있다. `validateBook`이 검사하고 `content/book.test.ts`가 실패한다.
- 페이지 내용이 넘치면 개발 서버 콘솔에 경고가 나온다. 페이지를 나누거나 글을 줄인다.
- 3D 화면을 고친 뒤에는 실제로 띄워서 확인한다. 헤드리스 Chromium에서는 `--use-angle=swiftshader`로 WebGL을 켤 수 있다. 느리므로 애니메이션 중간은 `?capture`로 열고 `window.__book.advance(초)`로 시간을 정해 찍는다(`advance`가 GPU를 `finish()`까지 기다린다).
- 투명 재질(`glassMaterial`, 반투명 막대)에 `<InkLines />`의 윤곽선을 켜면 껍질이 비쳐 검게 칠해진다. `outline={false}`로 끄고 테두리를 직접 긋는다.
- 팝업이 일어서기 전·책장 넘김 중처럼 물체가 납작하게 눌리면 윤곽선 껍질이 물체를 검게 덮는다. `InkLines`가 월드 행렬의 눌림(`ink/flatness.ts`)을 보고 그동안 껍질을 숨기므로, 장면에서 drei `<Outlines>`를 직접 쓰지 않는다.
- 잉크 물감 높이 `inkUniforms.uFillY`는 모든 잉크 재질이 함께 쓰는 값이다. 팝업 슬롯이 장면마다 정하므로 장면 안에서 바꾸지 않는다.
- TypeScript 7을 쓰므로 typescript-eslint는 쓰지 않는다. 린트는 Oxlint(`.oxlintrc.json`, 타입 기반 규칙 포함).
