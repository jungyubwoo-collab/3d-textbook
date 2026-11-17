# CLAUDE.md

웹 3D 교과서. 책상 위 3D 책을 펼치면 오른쪽 페이지에서 잉크 그림 같은 3D 장면이 일어서고, 학생은 예측 → 3D 실험(탐구 과제) → 덮개를 들춰 정답 확인 → 도장 흐름으로 공부한다. 사용자·문서·UI 문구와 코드 주석은 한국어로 쓴다.

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
  - `CameraRig.tsx` 시점: 평소(2D 문서)에는 펼친 책 전체를 위에서, 3D 실험 중에는 실험 장치로 다가가 비스듬히(단원의 `focus`).
  - `Stage.tsx` 실험 무대 조명(3D 실험을 켜면 방이 어두워지고 스탠드가 비춘다. 세기는 `stageState.ts`의 `stage.level`)과 화면 가장자리 어둠. `DeskProps.tsx` 스탠드·머그잔·연필 같은 책상 소품. `RevealFx.tsx` 그림이 3D로 바뀌는 순간의 효과(번지는 금빛 원, 물결, 빛기둥, 반짝이).
  - `leafRig.ts` 뼈대가 든 종이 메시. `usePageAsset.ts` 페이지 텍스처(가까운 장만 생성).
- `apps/web/src/content/` — 책 내용 "움직임의 법칙". `book.ts`의 `chapters`가 대단원과 단원 순서(대단원 번호·차례·그림 번호·배경음악·분위기 색을 여기서 매긴다), `lessons/<id>/`가 단원 하나: `ids.ts`(단원·문항 ID), `lesson.ts`(글 블록 + 장면 페이지 블록), `physics.ts`(+테스트), 장면 컴포넌트. 탐구 실험(`newton-laws`, `pulley`)은 칠판·자 그림을 `board.ts`에 둔다.
- `apps/web/src/content/labs/` — 부록 '나의 실험실'(물리·화학). `labs.ts` 공간 GLB와 스케치 주소, `room.ts`(+테스트) GLB를 바닥·벽 / 가구 / 모델 자리(`ENV_`, `PRP_`, `SLOT_` 이름)로 풀기, `LabScene.tsx` 공간을 잉크 재질로 세우고 허브 모델을 자리에 놓기, `models.ts` 에셋 허브에서 골라 온 모델 목록(`public/models/hub/<id>.glb`), `lessons.ts` 책에 싣는 펼침면. 공간은 힉스필드 3D Jutsu에서 만든다(프로젝트 이름 "나의 물리 실험실 (3D 교과서)", "나의 화학 실험실 (3D 교과서)").
- `apps/web/src/book/experiment.ts` — 펼침면의 3D 실험 찾기(`experimentOfSpread`)와 켜기(`enterExperiment`, 예측을 먼저 골라야 켜진다). 상태는 `bookStore`의 `experiment`(2D 문서 / 3D 실험)와 `pendingSpread`(실험 중에 넘기면 접은 뒤 넘어갈 면).
- `apps/web/src/figure/kit.ts` — 2D 교과서 그림 도구(820 × 940 설계 좌표, `fitFigure`). 단원마다 `lessons/<id>/figure.ts`가 장면 페이지의 `figure` 블록을 만든다.
- `apps/web/src/scene/` — 장면 부품. `PopUp`(등장 시간 `at`에 솟아오름, `rise`/`grow`/`hinge`), `SceneButton`, `Bars`, `Label`(`tag`로 색 딱지), `PushArrow`, `useLessonGate`(예측 전 조작 잠금), `createRope`(매 프레임 모양이 바뀌는 줄), `createDots`(같은 점 여러 개), `useImpact`(충돌 별), `useSparkles`(축하 반짝이), `Glow`(물체 둘레의 빛).
- `apps/web/src/fx/` — 효과 도구. `particles.ts`(한 번에 터지는 입자, 위치는 셰이더가 시간으로 계산), `impact.ts`(만화식 충돌 별), `sprites.ts`(효과용 그림을 canvas로 만들어 나눠 쓴다), `beam.ts`(빛줄기 셰이더), `uniforms.ts`(`setUniform`).
- `apps/web/src/ink/` — 잉크 재질(`inkMaterial(color)`, 툰 + 화면 좌표 빗금 + 아래부터 차오르는 물감 `inkUniforms.uFillY`)과 `<InkLines />`, 투명 `glassMaterial`.
- `apps/web/src/lib/` — 소리: `audio.ts`(AudioContext, 첫 입력 뒤에 열림), `sound.ts`(효과음 `playSound(이름)`), `music.ts`(배경음악 `setMusic(곡)`, 크로스페이드). `capture.ts`(`?capture` 영상 녹화 모드, 동작 등록, 소리 기록).
- `apps/web/public/audio/` — ElevenLabs로 만든 `music/<곡>.mp3`(단원별 배경음악)와 `sfx/<소리>.mp3`. `ui/Soundtrack.tsx`가 펼침면의 곡(`musicOfSpread`: 오른쪽 → 왼쪽 페이지 → 책 기본 곡)을 고른다.
- `apps/web/src/state/bookStore.ts` — zustand 바닐라 스토어 `bookStore` + 훅 `useBookStore(selector)`. `missions`는 장면이 알리는 탐구 과제 진행 상황(`setMissions(단원ID, …)`)이고 `ui/Missions.tsx`가 보여 준다.
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
- 효과음은 `playSound('이름')`으로만 낸다. 새 소리는 `sound.ts`의 `SOUNDS`에 파일·음량을 등록하고 파일은 `public/audio/sfx/`에 둔다. 배경음악은 대단원의 `music`(`content/book.ts`의 `chapters`), 한 단원만 다르게 하려면 `Lesson.music`.
- 장면 페이지는 `figure` 블록(2D 그림)을 둔다. 그림만 보고도 실험을 알 수 있게 장치·이름표·알고 있는 사실을 그리고, 예측할 결과는 물음표로 남긴다(정답을 그리지 않는다). 그림 속 글자는 블록의 `text`에 모아야 글꼴이 미리 받아진다.
- 장면 조작 처리기는 첫 줄에서 `if (!allow()) return;`(`useLessonGate(문항ID)`). 장면 단추는 `SceneButton`을 쓰면 녹화용 동작(`<단원>:<id>`)으로도 등록된다.
- Oxlint의 React Compiler 규칙(`react/immutability`)은 훅이 돌려준 값을 고치는 것을 막는다. 매 프레임 고치는 버퍼는 메서드를 가진 객체(예: `createRope()`, `createParticleBurst()`)나 ref로 감싼다. 셰이더 유니폼과 텍스처는 재질 ref를 거쳐 고친다(`setUniform(material.current, …)`, `material.current.map`).
- 대단원 이름("1단원 · …")과 그림 번호("그림 N.")는 `content/book.ts`가 붙인다. 단원의 `lesson.ts`에는 쓰지 않는다.
- 그림 블록이 이미지 파일을 쓰면 `images`에 주소를 적는다(책을 그리기 전에 `figure/images.ts`가 미리 받는다). 그림을 눌렀을 때 하는 일이 실험이 아니면 `action`에 이름을 적는다(예: '3D로 둘러보기'). 책 밖으로 나가는 링크는 `link` 블록.
- 실험실 공간 GLB를 다시 만들 때는 맨 위 노드 이름을 지킨다: `ENV_`(바닥·벽), `PRP_`(가구 한 묶음), `SLOT_`(모델 자리, 빈 노드). 재질은 색만 쓰고(잉크 재질로 다시 칠한다) 반투명 재질은 유리로 그린다.
- 조건을 바꿔 가며 하는 실험은 탐구 과제를 둔다: 장면이 `bookStore.getState().setMissions(LESSON_ID, { items, conclusion })`으로 알리고, 장면이 사라질 때 `null`로 지운다.
- 충돌·착지에는 `impact.fire(x, y, z, 크기)`, 축하에는 `sparkles.burst(x, y, z)`. 장면에 `<primitive object={impact.group} />`, `<primitive object={sparkles.points} />`를 넣어야 보인다.

## 주의할 점

- Prisma는 `~7.10.1`로 고정. npm `latest` 태그가 8.0 RC라서 버전 없이 설치하면 안 된다. `schema.prisma`를 고치면 `npm run db:migrate -- --name <이름>`(클라이언트도 다시 생성됨). 생성 코드 `apps/api/src/generated/`는 커밋하지 않는다(`npm install` 때 `postinstall`이 만든다).
- Prisma 7은 `.env`를 자동으로 읽지 않는다. `prisma.config.ts`가 `apps/api/.env`를 읽는다.
- drei 10의 `<Outlines>`는 `screenspace`를 끈 기본값에서 thickness가 픽셀, 켜면 월드 단위다(이름과 반대). `InkLines`를 거쳐서만 쓴다. drei를 올린 뒤에는 장면이 검은 덩어리로 덮이지 않는지 화면으로 확인한다.
- 오른쪽 페이지(짝수 번째)에만 `scene`을 둘 수 있다. `validateBook`이 검사하고 `content/book.test.ts`가 실패한다.
- 페이지 내용이 넘치면 개발 서버 콘솔에 경고가 나온다. 페이지를 나누거나 글을 줄인다.
- 3D 화면을 고친 뒤에는 실제로 띄워서 확인한다. 헤드리스 Chromium에서는 `--use-angle=swiftshader`로 WebGL을 켤 수 있다. 느리므로 애니메이션 중간은 `?capture`로 열고 `window.__book.advance(초)`로 시간을 정해 찍는다(`advance`가 화소 하나를 읽어 GPU가 다 그릴 때까지 기다린다. 소프트웨어 렌더러는 `finish()`로는 기다리지 않는다). 녹화 모드에서는 소리를 내지 않고 `window.__book.sounds()`에 기록만 한다.
- 투명 재질(`glassMaterial`, 반투명 막대)에 `<InkLines />`의 윤곽선을 켜면 껍질이 비쳐 검게 칠해진다. `outline={false}`로 끄고 테두리를 직접 긋는다.
- 팝업이 일어서기 전·책장 넘김 중처럼 물체가 납작하게 눌리면 윤곽선 껍질이 물체를 검게 덮는다. `InkLines`가 월드 행렬의 눌림(`ink/flatness.ts`)을 보고 그동안 껍질을 숨기므로, 장면에서 drei `<Outlines>`를 직접 쓰지 않는다.
- 장면은 2D 문서 상태(등장 시간 0)에서는 보이지 않고, 인쇄된 그림을 지우는 빈 모눈 덮개(`RevealFx`)는 3D 실험 중에만 보인다. 장면 셰이더는 문서 상태로 멈춰 있을 때 `gl.compile`로 미리 만들어 둔다(처음 펼칠 때 멈칫하지 않게).
- 잉크 물감 높이 `inkUniforms.uFillY`는 모든 잉크 재질이 함께 쓰는 값이다. 팝업 슬롯이 장면마다 정하므로 장면 안에서 바꾸지 않는다.
- TypeScript 7을 쓰므로 typescript-eslint는 쓰지 않는다. 린트는 Oxlint(`.oxlintrc.json`, 타입 기반 규칙 포함).
- 개발 모드(StrictMode)는 효과의 정리 함수를 한 번 더 부른다. 정리 함수에서 스토어를 바꾸거나 "끝났다"고 알리면 효과가 시작하자마자 끝난다(도장 효과가 그랬다). 도중에 사라질 때의 뒷정리는 스토어 동작에서 한다(`goTo`가 찍히던 도장을 남긴다).
- 효과(충돌 별 등)를 `useFrame` 안에서 터뜨리면 그 프레임의 `update`는 이미 지나갔을 수 있다. 터뜨리는 함수가 처음 모습(크기 0)을 직접 잡아야 첫 프레임에 화면 가득 그려지지 않는다(`fx/impact.ts`의 `pose`).
- 스탠드는 눈에 보이는 갓(`LAMP.head`)과 실제 조명(`LAMP.light`)의 자리가 다르다. 갓은 실험 화면에 들어오게 낮게, 조명은 그림자가 너무 길어지지 않게 높게 둔다.
- 장면 속 칠판·자의 글자는 720p 화면에서도 읽히게 크게 쓴다(칠판 텍스처는 장면 단위당 2000픽셀, 숫자는 50픽셀 이상).
- 녹화 모드(`?capture`)에서는 CSS 애니메이션을 끈다(`index.css`의 `.capture`). 화면 시간과 따로 흘러 프레임마다 어긋나기 때문이다.
