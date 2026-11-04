# 3D 교과서

책상 위의 3D 책을 펼치면 페이지의 그림이 잉크로 그린 입체 모형으로 일어서는 웹 교과서입니다.
학생은 단원마다 **2D 교과서 그림을 보고 결과를 예측 → 그림을 3D 실험으로 펼쳐 확인 → 다시 문서로 돌아와 종이 덮개를 들춰 정답과 해설 확인** 순서로 공부하고,
맞히면 그 자리에 "참 잘했어요" 도장이 찍힙니다. 로그인 없이 브라우저에서 바로 동작합니다.

![진자 단원. 왼쪽: 2D 문서(예측 문항과 교과서 그림). 오른쪽: 그림을 3D 실험으로 펼쳐 카메라가 장치에 초점을 맞춘 모습](docs/images/lesson.jpg)

## 들어 있는 책: 움직임의 법칙 (중고등 물리 · 역학)

| 차례 | 단원         | 제목                    | 3D 실험                                       | 예측 문항                                 |
| ---- | ------------ | ----------------------- | --------------------------------------------- | ----------------------------------------- |
| 1    | 1단원 중력   | 모든 것은 함께 떨어진다 | 진공 유리관 속 깃털과 쇠구슬, 연속 사진       | 공기를 빼면 무엇이 먼저 떨어질까?         |
| 2    | 1단원 중력   | 떨어지면서 도는 달      | 뉴턴의 대포: 산꼭대기에서 속력을 바꿔 쏘기    | 초속 7.9 km로 수평으로 쏘면 어떻게 될까?  |
| 3    | 2단원 에너지 | 높이에 저장된 에너지    | 도르래로 상자 올리기, 위치 에너지 막대        | 높이가 2배면 위치 에너지는 몇 배?         |
| 4    | 2단원 에너지 | 움직임에 담긴 에너지    | 수레가 나무토막을 밀어내는 거리               | 속력이 2배면 밀려나는 거리는 몇 배?       |
| 5    | 2단원 에너지 | 사라지지 않는 에너지    | 갈릴레이의 진자(중간 못), 에너지 막대         | 줄이 못에 걸리면 추는 어디까지 올라갈까?  |
| 6    | 3단원 운동량 | 부딪혀도 지켜지는 양    | 충돌 레일: 붙는 충돌·튕기는 충돌, 질량 바꾸기 | 붙어서 함께 움직이면 속력은 처음의 몇 배? |

표지 → 이 책을 읽는 법 → 차례 → 3개 단원의 실험 6개(펼침면마다 왼쪽 글 + 오른쪽 3D 실험) → 한눈에 정리(공식 표) → 메모 → 뒤표지, 모두 18쪽입니다.
장면의 움직임은 단원 폴더의 `physics.ts`(순수 함수, 테스트 있음)로 계산합니다.

## 기술 스택

| 영역 | 사용 기술                                                                            |
| ---- | ------------------------------------------------------------------------------------ |
| 웹   | React 19, Vite 8, Three.js + React Three Fiber, drei, Tailwind CSS 4, zustand        |
| API  | Node.js 24 (TypeScript를 빌드 없이 바로 실행), Express 5, Prisma 7, zod              |
| DB   | PostgreSQL 18 (로컬은 Docker Compose)                                                |
| 공통 | TypeScript 7, npm workspaces 모노레포, Vitest, Oxlint(타입 기반 규칙 포함), Prettier |
| CI   | GitHub Actions: 포맷·린트·타입 검사·마이그레이션·테스트(실제 PostgreSQL 포함)·빌드   |

## 시작하기

필요한 것: Node.js 24 (22.22 이상), Docker

```bash
npm install
```

```bash
npm run db:up
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
npm run db:deploy
```

```bash
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. API는 http://localhost:4000/api/health 에서 확인할 수 있습니다.

- DB 없이 화면만 볼 때는 `npm run dev:web` 만 실행해도 됩니다. 이때는 예측 기록과 "다른 학생 정답률" 알림만 빠집니다.
- 5432 포트가 이미 쓰이고 있으면 `POSTGRES_PORT=5433 npm run db:up` 으로 띄우고 `.env`의 주소도 맞춰 주세요.

## 자주 쓰는 명령

| 명령                                  | 하는 일                                                |
| ------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                         | API(4000)와 웹(5173)을 함께 실행                       |
| `npm run check`                       | 포맷 검사 → 린트 → 타입 검사 → 테스트 (커밋 전에 실행) |
| `npm test`                            | 모든 워크스페이스 테스트                               |
| `npm run build`                       | 웹 정적 파일 빌드 (`apps/web/dist`)                    |
| `npm run format`                      | Prettier로 전체 정리                                   |
| `npm run db:migrate -- --name <이름>` | `schema.prisma`를 고친 뒤 마이그레이션 만들기·적용     |
| `npm run db:studio`                   | Prisma Studio로 DB 들여다보기                          |
| `npm run db:down`                     | 로컬 DB 끄기 (데이터는 볼륨에 남음)                    |

API의 PostgreSQL 통합 테스트는 `TEST_DATABASE_URL`이 있을 때만 돕니다(CI에서는 항상 실행).

```bash
TEST_DATABASE_URL="postgresql://textbook:textbook@localhost:5432/textbook" npm test -w @3d-textbook/api
```

## 폴더 구조

```
apps/
  web/                     웹 앱
    src/book/              책 엔진: 책장 넘김·끌기, 페이지 조판, 덮개·도장, 카메라, 책상
    src/content/           책 내용: book.ts(페이지 순서), lessons/<단원>/
    src/scene/             장면 부품: PopUp(일어서기), SceneButton, Bars(에너지 막대), Label, PushArrow
    src/figure/            2D 교과서 그림 도구(선, 화살표, 이름표, 치수선, 물음표, 수레·깃털 모양)
    src/ink/               잉크 펜 그림 재질(빗금 음영 + 물감 번짐 + 윤곽선)
    src/lib/               소리(audio.ts, sound.ts 효과음, music.ts 배경음악), 영상 녹화 모드(capture.ts)
    src/state/             zustand 상태(펼친 면, 학생의 답, 음악·효과음 켜기)
    public/audio/          ElevenLabs로 만든 배경음악(music/)과 효과음(sfx/)
    src/ui/                3D 화면 위의 HTML(조작 막대, 알림)
  api/                     학습 기록 API
    prisma/                schema.prisma, 마이그레이션
    src/routes/            /api/health, /api/predictions
packages/
  shared/                  웹과 API가 함께 쓰는 요청·응답 스키마(zod)와 타입
compose.yaml               로컬 PostgreSQL
```

## 단원 추가하기

단원 하나는 **왼쪽 글 페이지 + 오른쪽 3D 장면 페이지**입니다.

1. `apps/web/src/content/lessons/<단원>/` 폴더를 만듭니다. 예시는 `lessons/free-fall/` 입니다.
   - `ids.ts`: 단원 ID와 문항 ID. `lesson.ts`: 글 페이지 블록(`heading`, `paragraph`, `formula`, `question` 등)과 장면 페이지 블록(`eyebrow`, `subheading`, 그림, 아래 `caption`).
   - `figure.ts`: 장면 페이지의 2D 그림(`figure` 블록). `figure/kit.ts`의 도구로 820 × 940 설계 좌표에 그리고 `fitFigure`로 맞춥니다. 3D로 펼치기 전에도 그림만으로 실험을 알 수 있게 장치·이름표·알고 있는 사실을 그리고, 예측할 부분은 물음표로 남깁니다(정답은 그리지 않습니다).
   - `physics.ts` + `physics.test.ts`: 장면의 움직임 계산. 화면 없이 테스트할 수 있게 순수 함수로 둡니다.
2. 같은 폴더에 3D 장면 컴포넌트를 만듭니다. 장면은 오른쪽 페이지 한가운데(원점)에 서고, 페이지 가로가 1입니다.
   - 재질은 `inkMaterial(색)`, 선은 메시 자식으로 `<InkLines />` 를 넣으면 잉크 그림처럼 보입니다. 유리처럼 투명한 것은 `glassMaterial`에 윤곽선을 끄고(`outline={false}`) 테두리를 따로 긋습니다.
   - 부품을 `<PopUp at={0.2}>`로 감싸면 등장 시간(0→1)의 그 시점에 페이지에서 솟아오릅니다(`mode`: `rise`·`grow`·`hinge`).
   - 조작 단추는 `<SceneButton id label position onPress />`. 처리기 첫 줄에서 `if (!allow()) return;`(`useLessonGate(문항ID)`)으로 "예측 먼저" 규칙을 지킵니다.
   - 실험 속 순간(출발, 충돌, 착지)에는 `playSound('whoosh')`, `playSound('knock')`처럼 효과음을 낼 수 있습니다.
   - 장치가 크거나 높으면 단원의 `focus`(카메라가 바라볼 곳과 담을 크기)를 정해 3D 실험 때 장치 전체가 화면에 들어오게 합니다.
3. `apps/web/src/content/book.ts`의 `lessons` 배열에 새 단원을 넣으면 차례와 펼침면이 함께 만들어집니다.
   단원의 `music`에 곡 이름(`public/audio/music/<이름>.mp3`)을 적으면 그 단원을 펼쳤을 때 그 곡이 흐릅니다.
   글 페이지는 홀수 번째(왼쪽)에 와야 합니다. 어긋나면 개발 서버 콘솔과 `npm test`가 알려 줍니다.
4. 페이지 내용이 길어 아래 여백을 넘으면 개발 서버 콘솔에 경고가 나옵니다. 내용을 줄이거나 페이지를 나누세요.

문항·보기 ID는 소문자·숫자·하이픈만 씁니다. API에 그대로 기록되므로 공개한 뒤에는 바꾸지 마세요.

## 동작 방식

- **책장**: 종이 한 장(앞뒤 두 페이지)을 뼈대(bone) 30개가 든 메시로 만들고, 뼈를 돌려 휘면서 넘깁니다(`book/leafRig.ts`, `book/Book.tsx`). 휘는 자리가 바깥 끝에서 책등 쪽으로 굴러가고(`curlWeights`), 여러 장을 건너뛸 때는 시간 차를 두고 넘어갑니다.
- **책장 끌기**: 페이지 바깥쪽 30%에 마우스를 올리면 모서리가 살짝 들리고, 잡아끌면 손을 따라 넘어갑니다. 1/3쯤 넘기고 놓으면 끝까지, 덜 넘기면 제자리로 돌아갑니다.
- **페이지 내용**: 블록을 canvas에 조판해 텍스처로 붙입니다(`book/typeset.ts`, `book/paint.ts`). 한글 글꼴은 Pretendard를 번들합니다. 지금 펼친 면 근처의 장만 텍스처를 만들어 GPU 메모리를 아낍니다.
- **2D 문서 ↔ 3D 실험**: 실험 페이지는 평소에 교과서 그림(장치, 이름표, 화살표, 식, 물음표)으로 보이고, 카메라는 펼친 책 전체를 내려다봅니다. "3D로 실험하기"를 누르거나 그림을 누르면(예측을 먼저 골라야 합니다) ① 그림 칸이 빈 모눈으로 덮이고 ② 장치가 부분마다 차례로 솟아오르며(`PopUp`) ③ 물감이 아래부터 번지듯 색이 차오르고(잉크 재질의 `uFillY`) ④ 카메라가 실험 장치로 다가가 초점을 맞춥니다(`focus`). "2D 문서로 돌아가기"(Esc)를 누르면 거꾸로 접혀 다시 인쇄된 그림이 되고, 실험 중에 다음 장으로 넘기면 먼저 접혀 문서로 돌아간 뒤 넘어갑니다(`book/experiment.ts`, `bookStore`의 `experiment`·`pendingSpread`).
- **배경음악**: 표지·차례·정리에서는 주제곡, 중력·에너지·운동량 단원에서는 단원마다 다른 곡이 흐릅니다. 단원이 바뀌면 두 곡이 천천히 엇갈려 바뀌고, 곡이 끝나면 잠깐 쉬었다 처음부터 다시 흐릅니다(`lib/music.ts`, `ui/Soundtrack.tsx`).
- **효과음**: 책장 넘김(3가지를 번갈아), 그림이 일어설 때 종이 펼침 + 반짝임, 단추, 보기를 고를 때 연필, 덮개를 들 때 종이, 도장, 정답·오답 소리, 실험의 출발(바람)·충돌(톡) 소리를 냅니다(`lib/sound.ts`).
- **소리 설정**: 조작 막대에서 배경음악과 효과음을 따로 끕니다(브라우저에 저장). 브라우저 정책 때문에 처음 누르거나 키를 친 뒤부터 소리가 나고, 탭을 가리면 멈춥니다.
- **예측 기록**: 덮개를 열면 `POST /api/predictions`로 첫 예측을 남기고 `GET /api/predictions/stats`로 전체 정답률을 받아 알림에 보여 줍니다. 학습자 ID는 브라우저에 만든 익명 UUID입니다. 답과 도장은 브라우저(localStorage)에도 저장됩니다.

## 영상 녹화

주소에 `?capture`를 붙이면 화면이 스스로 그려지지 않고 `window.__book.advance(초)`로 프레임마다 시간을 정해 그립니다.
느린 컴퓨터(헤드리스 Chromium의 소프트웨어 WebGL)에서도 끊김 없는 영상을 만들 수 있습니다.

- `window.__book.actions()`: 누를 수 있는 동작 목록(장면 단추 `<단원>:<id>`, 3D 실험 켜기 `<단원>:experiment`, 보기, 덮개, 차례 링크). `run(id)`로 누르고 `screen(id)`로 화면 위치를 얻습니다.
- 프레임마다 `advance(t)` 후 Playwright로 화면을 찍고 ffmpeg로 묶으면 됩니다. `advance`는 화소 하나를 읽어 GPU가 그 프레임을 다 그릴 때까지 기다립니다.
- 녹화 중에는 소리를 내지 않고 기록만 합니다. `window.__book.sounds()`가 언제 어떤 효과음(파일, 음량, 재생 속도)과 배경음악 바뀜이 있었는지 돌려주므로, 그대로 섞어 영상에 입히면 됩니다.

## 배포 메모

- 웹: `npm run build` 결과(`apps/web/dist`)를 정적 파일로 올립니다.
- API: `npm ci && npm run db:deploy -w @3d-textbook/api && npm start -w @3d-textbook/api` (Node.js 22.22 이상, 빌드 단계 없음).
- 웹은 같은 주소의 `/api`로 요청하므로, 리버스 프록시에서 `/api`를 API 서버로 넘겨 주세요.

## 알아 둘 점

- **Prisma는 7.10으로 고정**했습니다. npm의 `latest` 태그가 8.0 RC를 가리키고 있어 `npm install prisma`를 그냥 하면 RC가 들어옵니다.
- TypeScript 7(네이티브 컴파일러)을 씁니다. typescript-eslint가 아직 TS 7을 지원하지 않아 린터는 Oxlint입니다.
- npm 11은 의존성의 설치 스크립트를 허용 목록(`package.json`의 `allowScripts`)에 있는 것만 실행합니다. Prisma 엔진 때문에 `prisma`, `@prisma/engines`를 허용해 두었습니다.
- 교재에 외부 이미지·3D 모델·글꼴을 넣을 때는 라이선스를 확인하세요(Pretendard는 OFL-1.1).
- `public/audio`의 배경음악과 효과음은 ElevenLabs(Music, Sound Effects)로 만들었습니다. 상업적으로 쓰기 전에 만든 계정 요금제의 이용 약관을 확인하세요.
- 운영체제의 "동작 줄이기" 설정이 켜져 있으면 책장 넘김·장면 등장·카메라 이동이 짧고 단순해집니다.
