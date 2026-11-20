# AGENTS.md

이 파일은 코드만 읽어서는 알기 어려운 외부 서비스 동작, 경험적으로 확인된 제약, 회귀 테스트 절차를 기록한다. 저장소 전체에 적용된다.

## 작업 원칙

- 사용자가 코드 수정을 요청하기 전에는 코드를 수정하지 않는다.
- 사용자가 커밋을 요청하기 전에는 커밋하지 않는다.
- 기존 사용자 변경사항을 보존하고 관련 없는 파일은 수정하지 않는다.
- 문서와 회귀 사례에는 실제 스트리머 ID를 기록하지 않고 `id1`, `id2` 같은 예시 ID를 사용한다.
- 작업 중 새로운 비자명한 제약, SOOP 서비스 동작, 회귀 사례, 재사용 가능한 테스트 방법을 확인했다면 같은 작업에서 이 파일도 업데이트한다.
- 오래되거나 더 이상 사실이 아닌 내용은 그대로 누적하지 말고 수정하거나 삭제한다. 외부 서비스 상태처럼 변할 수 있는 사실에는 확인 날짜를 남긴다.

## SOOP 플레이어 연동 불변식

SOOP 연동 동작 확인 기준일은 2026-07-27이며, 이후 변경된 외부 서비스 동작은 항목별 확인 날짜를 따른다.

- `Pload`의 `showChat`은 항상 `true`여야 한다. `false`로 로드하면 채팅 연결 자체가 만들어지지 않는 사례가 확인되었다. 축소 또는 채팅 숨김 상태라도 이 값을 변경하지 않는다.
- 채팅 표시 여부는 부모 앱의 CSS와 레이아웃으로만 제어한다. 숨길 때 iframe을 `PLAYER_CHAT_WIDTH`만큼 넓히고 부모의 `overflow: hidden`으로 오른쪽 채팅 영역을 자른다.
- `PtoggleChat`은 성공 응답이나 상태 조회 방법이 없다. 자동재생 차단 시 명령 적용 완료를 확인할 신뢰 가능한 postMessage 신호도 없으므로 화면 상태의 기준으로 다시 사용하지 않는다.
- `PonReady`는 postMessage 명령 수신기가 생겼다는 신호일 뿐, 채팅 UI 초기화 완료나 이후 상태 덮어쓰기 방지를 보장하지 않는다.
- 브라우저 검증에서 정상 자동재생은 `PupdateMediaEvent`와 SOOP 내부 video의 재생 상태로 확인한다. 자동재생이 차단되면 이 이벤트가 오지 않을 수 있고, SOOP iframe 콘솔의 `Uncaught (in promise) Error: auto play block`은 재현 조건에서 예상되는 오류다.
- iframe은 처음부터 실제 타일 크기로 표시하며 자동재생 차단 시에도 SOOP 재생 컨트롤을 바로 조작할 수 있어야 한다.
- 현재 SOOP 내부 채팅 폭은 296px이며 `PLAYER_CHAT_WIDTH`와 일치한다. SOOP 레이아웃이 변경되면 이 값을 실제 iframe 치수로 다시 검증한다.
- iframe은 cross-origin이므로 앱 코드에서 SOOP 내부 DOM이나 `#chatting_area` 상태를 읽을 수 없다. 내부 DOM 검사는 Playwright 같은 브라우저 자동화 검증에서만 가능하다.

## 일반·외부 삽입 플레이어의 로드와 기능 차이

2026-11-19에 SOOP의 PC용 공개 HTML·JavaScript·CSS를 비교했다.

- `/{id1}`은 `landing` 모드, `/{id1}/direct`는 `direct` 모드, `/{id1}/embed`는 `embed` 모드다. 뒤의 두 경로는 쿼리 유무와 관계없이 `body.embeded_mode`를 사용한다. 공식 방송 시청 문서가 안내하는 임베디드 주소는 `/{id1}/{broadNo}/embed`다. [SOOP 방송 시청 문서](https://developers.sooplive.com/docs/api/broad-watch#broad-list)
- 일반·삽입 HTML 모두 `LiveView.isLoaded()` 후 `location.search.indexOf('fromApi=') === -1`일 때 자체 `loadBroad()`를 호출한다. `?fromApi=0`, `?fromApi=1`, `?fromApi=2`, `?fromApi=true`는 모두 이 호출을 건너뛴다. `/direct`의 외부 로드는 `PonReady` → `Pload`로 이어진다. `Pload.fromApi`는 방송 정보 요청의 `from_api`에 전달되며 로그의 `is_iframeapi`는 `1`과 비교한다. [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900)
- `.embeded_mode`의 CSS는 화면 크기와 관계없이 화질 선택(`.quality_box`), 스크린 모드, PIP 버튼, 편집각 버튼과 방송 리스트 버튼을 `display: none !important`로 숨긴다. `showQualityBox: true`는 뷰의 화질 분기에 전달되지만 CSS가 계속 적용되며 설정 메뉴에도 화질 항목은 없다. 전체화면 버튼은 유지된다. [player.css](https://res.sooplive.com/css/global/player/player.css), [LiveView.js](https://static.sooplive.com/asset/app/liveplayer/view/dist/LiveView.js?_=202402201100)
- 임베디드 HTML은 상단 내비게이션, 영상 아래의 구독·즐겨찾기·UP 영역, 방송 리스트 패널과 연관상품 영역을 생략한다. JS는 타임시프트, 시차 단축, 스크롤 미니모드, 빠른 채팅 및 매니저 채팅 출력을 임베디드 모드에서 제외한다. [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900), [LiveView.js](https://static.sooplive.com/asset/app/liveplayer/view/dist/LiveView.js?_=202402201100)
- PIP의 클릭과 `P` 키는 같은 핸들러를 사용하며, 버튼이 보일 때 진입한다. 복구 시 `showPIPButton`의 브라우저 지원·방송 종료에 따른 숨김을 유지한다. 2026-11-19 멀티뷰와 SOOP iframe의 공개 응답에 PIP를 막는 `Permissions-Policy` 헤더는 없었다. [LiveView.js](https://static.sooplive.com/asset/app/liveplayer/view/dist/LiveView.js?_=202402201100), [PIP 사양](https://w3c.github.io/picture-in-picture/#permissions-policy)
- 선명한 모드는 `isSupportClearMode()`를 통과해야 `#livePlayer`에 SVG `feConvolveMatrix` 필터를 적용한다. 임베디드에서 SOOP e스포츠 출처의 `direct` 모드에만 예외가 있으며 브라우저·카테고리 조건도 적용한다. 타임시프트의 `setTimeShiftInfo()`와 `_checkInfo()`는 각각 삽입 모드를 제외한다. 실제 탐색에는 방송의 재생목록과 이용 권한이 필요하다. 시차 단축은 `isSupportLowLatencyMode()` 외에 ALS 재생 경로와 고화질 스트리머 사용 여부를 확인한다. [LiveView.js](https://static.sooplive.com/asset/app/liveplayer/view/dist/LiveView.js?_=202402201100), [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900)
- 2026-11-19 공개 소스에서 타임시프트 UI가 진행바와 함께 기존 `#time_shift_play` 버튼을 표시하는 것을 확인했다. 권한이 있을 때 일시정지·재생은 타임시프트의 위치를 유지하고, 라이브에서 일시정지하면 타임시프트로 전환한다. 별도 `#play`의 정지는 `STOP_SELF`로 시청을 닫고 다시 재생할 때 방송을 로드한다. [LiveView.js](https://static.sooplive.com/asset/app/liveplayer/view/dist/LiveView.js?_=202402201100), [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900)
- 2026-11-20 일반 플레이어의 `isTimeShiftShow()`는 이용 권한과 별도로 UI 노출을 판정했다. 쉬는 시간에는 숨긴다. 권한이 없으면 숨김·비밀번호 방송과 녹화 가능 카테고리 정보가 없거나 녹화 불가인 방송에서도 숨긴다. 플러스 구독형 타임시프트에서 미구독자는 진행바를 볼 수 있고 탐색 시 구독 안내가 뜬다. 이미 구독 중(`nFollow === 1`)이고 플러스 등급(`mySubscriptionTier === 2`)이 아니면 진행바를 숨긴다. [일반 LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202610201100), [SOOP 타임머신 안내](https://sotong.sooplive.com/?b_no=8425&board_type=servicenotice&work=view)
- 2026-11-19 확인한 타임시프트 진단 순서는 SOOP iframe의 `getPlayerInfo().szTimeShiftUrl` 존재 여부, `livePlayer.timeShift.isEnable`, `canUserUseTimeShift`, `private_auth.php`와 해당 `.m3u8`의 응답이다. 초기화는 방송 시작 후 첫 60초와 광고 완료를 기다릴 수 있다. 동일 계정·방송의 일반 페이지와 비교할 때 상태값·HTTP 코드·쿠키 차단 사유만 기록한다. [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900)
- 2026-11-19 사용자 환경에서 임베디드의 초기화와 이용 권한은 모두 참이었다. `private_auth.php`는 HTTP 200, `result: 1`과 `signed_cookie`를 반환했으나 재생목록은 401이었다. `CloudFront-Signature`, `CloudFront-Key-Pair-Id`, `CloudFront-Policy`는 일반 플레이어 요청에 포함됐고 임베디드 요청에서는 모두 빠졌다. 임베디드 인증 응답에 `Set-Cookie`가 있었지만 `SameSite` 미지정에 따른 기본 `Lax` 제한으로 차단됐다. SOOP 번들은 응답 JSON의 `signed_cookie`를 브라우저 쿠키로 저장하지 않으며 재생목록은 `credentials: 'include'`로 요청한다. v2 유저스크립트가 임베디드의 타임시프트 서명 쿠키를 보정한다. [LivePlayer.js](https://static.sooplive.com/asset/app/liveplayer/player/dist/LivePlayer.js?_=202411151900), [SameSite 기본값](https://web.dev/articles/samesite-cookies-explained#samesitelax_by_default)
- 부모 앱 CSS는 cross-origin iframe 내부의 이 규칙을 덮어쓸 수 없다.
- 숨김 원인은 Playwright의 `browserContext.newCDPSession(frame)`으로 `DOM.querySelector`와 `CSS.getMatchedStylesForNode`를 호출해 확인할 수 있다. 외부 스타일시트의 `cssRules`는 동일 출처 정책 때문에 iframe 안의 JavaScript에서도 읽히지 않을 수 있다.

## 브라우저 테스트 ID 찾기

- [SOOP 홈](https://www.sooplive.com/)의 `인기 LIVE` 또는 현재 라이브 목록을 연다.
- 방송 링크가 `https://play.sooplive.com/{soopId}/{broadNo}`라면 첫 번째 경로가 테스트에 사용할 SOOP ID다.
- 로컬 멀티뷰는 `http://localhost:3000/{id1}/{id2}/...` 형식으로 연다.
- 방송은 언제든 종료될 수 있으므로 특정 ID를 영구 fixture처럼 간주하지 않는다. 테스트 직전에 실제 방송 중인지 확인한다.
- 고화질 스트리머 설치 안내가 나오면 실제 재생 성공 경로를 확인하기 위해 `저화질 참여`를 선택할 수 있다.

## 브라우저 회귀 테스트

Firefox만으로 검증하지 않는다. 자동재생 정책 문제가 발생하는 Chrome 또는 Edge의 새 브라우저 컨텍스트에서도 확인한다.

### 자동재생 차단 + 축소 로딩

1. 방송 중인 ID의 상태를 `minimized`로 만든 뒤 새 Chromium 컨텍스트에서 페이지를 연다.
2. SOOP 준비·재생 신호가 오기 전부터 iframe이 실제 타일 크기로 보이는지 확인한다. 자동재생이 차단되어도 컨트롤을 바로 조작할 수 있어야 한다.
3. 플레이어의 `data-chat-visible`이 `false`인지 확인한다.
4. 외부 타일 너비를 `W`라고 할 때 iframe 너비가 `W + PLAYER_CHAT_WIDTH`인지 확인한다.
5. SOOP 내부 채팅은 연결되고 `chat_open` 상태여도 부모 화면에 보이는 채팅 폭은 0px여야 한다.
6. 재생 버튼이 영상 영역 안에서 보이고 조작 가능한지 확인한다. 화질 선택 UI는 위의 2026-10-16 SOOP CSS 숨김 제약과 구분해 확인한다.

### 재생 성공 + 상태 전환

1. SOOP 재생 버튼을 누르고 필요하면 `저화질 참여`를 선택한다.
2. `PupdateMediaEvent`와 SOOP 내부 video의 재생 상태를 확인한다.
3. 재생 중 축소했을 때 영상 재생이 계속되고 채팅 노출 폭이 0px인지 확인한다.
4. 다시 확대하면 채팅이 보이고 iframe 너비가 외부 플레이어 너비와 같아지는지 확인한다.
5. 최대화 상태에서 앱의 채팅 토글을 두 번 눌러 숨김과 복원이 모두 CSS 자르기로 동작하는지 확인한다. SOOP 내부 채팅 연결은 유지되어야 한다.

### 다중 플레이어 스트레스 테스트

- 이전 회귀는 축소 상태로 동시에 로딩한 7번째 플레이어에서 채팅이 남는 형태로 발생했다.
- 방송 중인 서로 다른 ID 7개를 모두 `minimized`로 설정하고 동시에 로드한다.
- 1번부터 7번까지 각각 `data-chat-visible=false`, iframe과 타일의 너비 차이 296px, 화면에 보이는 채팅 폭 0px인지 확인한다.
- 로딩 속도와 무관하게 같은 결과가 나와야 하며 자동재생이 차단된 플레이어와 재생 중인 플레이어가 섞여 있어도 통과해야 한다.

브라우저 테스트용으로 상태를 한 번에 설정할 때는 개발자 도구에서 다음 형태를 사용할 수 있다.

```js
const ids = ['id1', 'id2'];
localStorage.setItem(
  'state',
  JSON.stringify(
    Object.fromEntries(ids.map((id) => [id, { display: 'minimized' }])),
  ),
);
```

## 로컬 검증 명령

```bash
pnpm exec biome check src/App.tsx src/Player.tsx
node tests/ids.test.mjs
node tests/playerGrid.test.mjs
node tests/userscript.test.mjs
pnpm run build
pnpm run dev --host 127.0.0.1
```

- `pnpm run check`는 `--write`가 포함되어 파일을 수정한다. 읽기 전용 확인이 필요하면 `pnpm exec biome check ...`를 사용한다.
- 브라우저 자동화 산출물은 `output/playwright/` 아래에 만들고 검증이 끝나면 제거한다.
- 광고 차단 확장 프로그램에서 발생하는 `broadcast_information` timeout 같은 오류는 앱 오류와 구분한다.

## Solid 2 마이그레이션 회귀

2026-11-19에 Solid 2.0.0 설치본의 시그널과 DOM 속성 처리를 확인했다.

- 시그널 변경 직후에는 직전 값이 읽힌다. `/`에서 저장 목록을 복원할 때 정규화한 ID를 저장과 이동에 함께 사용하고, 빈 목록은 `/`에서 유지한다. Chromium에서 저장 목록 복원, `/id1/id2` 직접 접속, ID 추가·삭제, 같은 탭과 다른 탭의 저장 상태 동기화를 확인한다. [Solid 2 마이그레이션 가이드](https://github.com/solidjs/solid/blob/main/documentation/solid-2.0/MIGRATION.md#batch--default-microtask-batching--flush)
- 한 이벤트에서 여러 표시 상태를 바꿀 때는 함수형 스토리지 setter가 현재 저장소 값을 읽어 변경을 누적한다. `온라인 플레이어 모두 확대`로 두 플레이어를 변경하고 화면과 저장소에 두 변경이 모두 반영되는지 확인한다.
- Solid 2의 `ref` 콜백에는 반응성 소유자가 없다. `ref`로 플레이어 영역을 받고 `onSettled`에서 초기 크기 측정과 `ResizeObserver` 등록을 수행한 뒤 정리 함수를 반환한다. 배치 변경이 스크롤바에 영향을 줄 수 있으므로 이후 측정은 다음 애니메이션 프레임에 예약한다. 안내 표시·닫기와 창 크기 변경 후 기존 iframe의 위치와 크기가 갱신되는지 확인한다. [Solid 2 ref 마이그레이션](https://github.com/solidjs/solid/blob/main/documentation/solid-2.0/MIGRATION.md#ref-callbacks-no-longer-owned)
- Solid 2의 DOM 속성 처리에서 불리언 `true`는 빈 속성을 만들고 `false`는 속성을 제거한다. 플레이어의 `data-chat-visible`에는 문자열 `"true"`·`"false"`를 사용하고 채팅 토글 후 속성값과 iframe 너비를 함께 확인한다.
- TanStack Solid Query v6에서 첫 응답 전의 `.data` 읽기는 렌더링을 대기시킬 수 있다. 방송·닉네임 테스트 응답을 지연하거나 실패시켜 메뉴와 iframe이 곧바로 표시되고, 성공한 응답이 나중에 메뉴에 반영되는지 확인한다. [TanStack Query v6 비동기 동작](https://github.com/TanStack/query/pull/11308)
- 2026-11-19 Edge 157에서 개발 서버와 프로덕션 빌드의 SOOP 메타데이터·iframe을 테스트 응답으로 대체했다. 저장 목록 복원과 마지막 ID 삭제, 응답 지연 중 `PonReady` → `Pload`와 채팅 자르기, 안내 표시·닫기와 창 크기 변경에 따른 배치, 일괄 확대·탭 간 동기화와 기존 iframe 유지를 확인했다. 개발 모드에서는 Query Devtools 초기화의 `STRICT_READ_UNTRACKED`와 연속 URL 변경의 `EFFECT_RELAY_TEAR`가 표시됐다.

## 채팅 상태별 확대 배치 회귀

2026-10-01에 추가한 계산 검증은 `node tests/playerGrid.test.mjs`로 실행한다. Node의 기본 TypeScript 실행 기능을 사용하며 별도 테스트 라이브러리는 필요 없다.

- 1920x1080에서 확대 플레이어 4개가 `ON, ON, OFF, OFF` 순서이면 각 행에 ON 1개씩 배치하고 영상 너비가 812px이어야 한다.
- 배치 계산의 기준 순서는 현재 화면 좌표가 아니라 URL·메뉴의 원래 ID 순서다. 채팅을 다시 모두 ON 또는 모두 OFF로 바꾸면 원래 순서로 복원해야 한다. 원래 순서로도 최적 크기를 낼 수 있으면 순서를 바꾸지 않는다.
- 2026-10-29부터 재배치가 필요할 때도 각 행 안에서는 원래 URL 순서를 유지한다. 채팅 ON을 무조건 먼저 놓지 않는다. 1912x901에서 `id1, id2, id3, id4`의 채팅이 `OFF, OFF, ON, ON`이면 첫 행은 `id1, id3`, 다음 행은 `id2, id4`이며 영상 너비는 800.88px다. 전체 배열의 교환 횟수 최소화를 보장하는 규칙은 아니다.
- 2026-10-01 Edge에서 외부 요청을 테스트 응답으로 대체해 `모두 ON → ON, ON, OFF, OFF → 모두 ON`을 두 번 반복하고 모두 OFF로 전환했다. 원래 순서 복원, 최적화 시 영상 너비 812px, 기존 iframe·URL 유지가 통과했다.
- 같은 조건에서 높이를 720px로 줄이면 높이가 크기를 제한하므로 기존 순서를 유지해야 한다.
- 마지막 행의 플레이어 수가 적으면 ON 개수를 단순 균등 분배하지 않는다. 3000x1080, 플레이어 5개, ON 3개에서는 첫 행에 ON 1개와 OFF 2개, 마지막 행에 ON 2개가 최적이다.
- 2026-10-29에 1~12개 플레이어의 모든 채팅 ON/OFF 조합과 모바일·가로·세로·소수점 크기 등 7가지 화면 크기로 계산 검증을 확장했다. 57,330건을 모든 행별 채팅 개수 분배의 전수 탐색 결과와 비교하고, 각 행의 URL 순서·중복·누락·영역 초과·입력 불변·반복 계산 시 배치 유지를 검사한다.
- 같은 날짜 Edge 156의 새 컨텍스트에서 로컬 빌드와 SOOP 테스트 응답만 사용해 `모두 ON → OFF, OFF, ON, ON → 높이 720px → 원래 높이 → 모두 ON`을 두 번 반복했다. 모두 OFF·ON 전환, 축소·확대, 숨김·복원, 영상 너비 800.88px와 CSS 채팅 자르기, URL·메뉴 순서와 기존 iframe 유지가 통과했다. 자동화 클릭은 `force`로 위치 안정성 검사를 생략하지 말고 토글 후 `data-chat-visible` 변경을 확인한다.
- 실제 브라우저에서는 채팅 토글 후 영상이 커지는지, 화면 크기와 축소·숨김 상태 변경 후에도 배치가 맞는지 확인한다. 배치는 좌표로만 변경하며 URL과 메뉴 순서, 기존 iframe 요소는 유지한다.

## SOOP ID 입력 보안 점검

2026-10-01에 입력 검증 문제를 수정하고 격리된 Edge 컨텍스트에서 회귀를 확인했다. 외부 요청은 테스트 응답으로 대체했으며 SOOP 서버의 응답이나 리다이렉트 동작은 검증하지 않았다.

- 같은 날짜 [SOOP 회원가입 안내](https://member.sooplive.com/app/join.php)는 ID를 영문·숫자 6~12자로 제한한다. 앱에서는 기존의 짧은 방송 ID도 허용하도록 영문·숫자 1~12자를 사용하며 대소문자는 보존한다.
- `normalizeId`와 `normalizeIds`를 입력창, URL 파싱, 경로 생성, 저장 목록 복원에 적용한다. 복원할 JSON이 배열이 아니거나 배열 안에 비문자열·잘못된 ID가 있으면 제외하고 유효한 ID는 순서와 함께 보존한다.
- `.`과 `..`는 `encodeURIComponent`로 이스케이프되지 않으므로 인코딩만으로 차단하지 않는다. 수정 전 `/alpha/beta`에서 `..`를 추가하면 `beta`가 저장 목록에서도 삭제되는 회귀가 있었다. 이제 잘못된 입력은 기존 URL·목록·iframe 요소를 유지하고 브라우저의 입력 오류 안내를 표시한다.
- iframe과 API URL에 넣는 ID는 별도로 `encodeURIComponent`를 적용한다. 수정 전 `../..`로 API 경로를 바꾸거나 `user/direct?fromApi=0#`로 iframe의 `fromApi` 값을 바꿀 수 있었다.
- `/alpha/user%2Fdirect%3FfromApi%3D0%23`처럼 인코딩된 공유 URL과 기존 저장 목록에서도 악성 ID를 제외하며 해당 ID의 SOOP 요청을 만들지 않아야 한다.
- `node tests/ids.test.mjs`는 문자·길이 제한, 경로 이동 문자, URL·HTML·제어문자, 잘못된 퍼센트 인코딩, 저장 목록의 타입과 중복을 확인한다. Edge에서는 악성 입력 13종 거부, 정상 추가·중복·삭제, 공유 URL 필터링, 저장 목록 복원과 기존 iframe 유지를 확인했다.
- 브라우저 회귀는 새 컨텍스트에서 외부 요청을 가로채 요청 URL과 저장 목록을 확인한다. 잘못된 퍼센트 인코딩은 Vite 개발 서버가 직접 URL 요청을 거부할 수 있으므로 앱의 `parseIds` 동작은 함수 호출 또는 History API 이동으로 분리해 확인한다.

## 외부 iframe 로그인 진단

2026-10-15에 배포 페이지에서 사용자가 직접 로그인한 뒤 Edge 155의 실제 로그인 응답과 쿠키 차단 사유를 확인했다. Firefox 155에서는 실제 계정 대신 같은 쿠키 속성을 가진 가짜 응답으로 비교했다.

- 멀티뷰의 최상위 사이트는 `soop-multi-view.netlify.app`이고 플레이어는 `play.sooplive.com`이므로 SOOP 인증은 타사 컨텍스트에서 동작한다.
- 채팅 입력으로 여는 일반 ID·비밀번호 로그인창은 SOOP iframe 내부의 `#layerLogin` 레이어다. SOOP의 로그인 요청은 `https://login.sooplive.com/app/LoginAction.php`에 POST하며 이미 `xhrFields: { withCredentials: true }`를 사용한다. 부모 앱의 요청 옵션을 바꾸는 것으로 이 요청의 쿠키 정책을 변경할 수 없다.
- 확인한 SOOP `LiveView.js`의 `isLogin()`은 티켓 쿠키 존재 여부를 읽으며 SOOP의 `TICKET_COOKIE_NAME`은 `AuthTicket`이다. 로그인 응답 성공 여부와 iframe에서 인증 쿠키를 사용할 수 있는지는 별도로 확인해야 한다.
- 실제 로그인 응답 두 건은 모두 `RESULT: 1`이었지만, `sooplive.com`용 `AuthTicket`·`BbsTicket`·`UserTicket`에 `SameSite`와 `Secure`가 없었다. Edge의 CDP `Network.responseReceivedExtraInfo`는 해당 쿠키들의 차단 사유를 `SchemefulSameSiteUnspecifiedTreatedAsLax`로 보고했으며 인증 쿠키는 저장되지 않았다.
- 같은 응답의 `_au3rd`는 `SameSite=None; Secure`가 있어 저장됐다. 이 사례는 일반적인 타사 쿠키 허용 여부와 별개인 SameSite 제한이다. 부모 앱의 iframe 속성이나 Netlify 응답 헤더로 SOOP의 인증 쿠키 속성을 변경할 수 없다. 외부 iframe에서 쓰려면 SOOP 측 인증 쿠키에 `SameSite=None; Secure`가 필요하다.
- 실제 서버 요청 없이 서로 다른 `.test` 사이트를 가로채 비교했다. Edge 155는 `SameSite` 미지정 쿠키를 거부하고 Firefox 155는 받아들였으며, `SameSite=None; Secure` 쿠키는 둘 다 받아들였다. 검사에 쓴 Playwright는 Firefox의 `network.cookie.sameSite.laxByDefault`를 `false`로 설정한다. 같은 날짜 [MDN의 Firefox 기능 문서](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#samesitelax_by_default)도 이 기능의 기본값을 비활성으로 안내하지만, 사용자 Firefox 프로필의 실제 설정까지 검사한 것은 아니다.
- 진단할 때는 격리된 브라우저에서 로그인 결과 코드와 쿠키 이름·속성·차단 사유만 추출한다. 비밀번호와 인증 쿠키 값은 조사 산출물에 기록하지 않는다. `document.hasStorageAccess()`는 이번 검사에서 `true`였으므로 이 값만으로 SameSite 제한까지 정상이라고 판단하지 않는다.

## 로그인 보정 유저스크립트

2026-10-15에 `public/soop-login-fix.user.js`를 추가했다. 배포 후 `/soop-login-fix.user.js`로 제공된다. 앱의 설치 안내에서는 Tampermonkey, Violentmonkey 또는 Greasemonkey의 공식 홈페이지를 연결한다. SOOP 및 이미 열려 있는 멀티뷰 페이지를 새로고침해야 적용된다.

- 같은 날짜 실제 AdGuard가 주입한 스크립트로 익명 인증 요청을 검사했다. `GM_xmlhttpRequest`의 `finalUrl`은 SOOP 대신 `https://local.adguard.org`였고 `responseHeaders`에는 `Set-Cookie`가 없었다. 서버 원본 응답에는 쿠키 헤더가 있었으므로, AdGuard에서는 GM 응답 헤더를 읽어 인증 쿠키를 복원하는 방식에 의존하지 않는다.
- 스크립트는 SOOP 도메인과 그 iframe, 멀티뷰 배포 주소에서 실행한다. 멀티뷰 페이지에서는 설치 확인 메시지에만 응답하며 인증 요청·쿠키·화질 스타일은 건드리지 않는다. `@noframes`를 추가하지 않는다. 관리자 권한은 `unsafeWindow`만 사용하며 `GM_xmlhttpRequest`와 `GM_cookie`에는 의존하지 않는다.
- `play.sooplive.com`에서는 외부 삽입 모드의 `.quality_box`를 표시한다. v2부터는 SOOP가 표시하도록 설정한 PIP 버튼도 노출한다. DOM 생성 전 실행되면 `DOMContentLoaded`에 스타일을 삽입하며 jQuery나 로그인 성공 여부에 의존하지 않는다.
- 추가 재생 처리는 `/direct`와 `/embed`의 `livePlayer`·`liveView` 할당에 연결한다. 시차 단축은 원래 지원 검사에서 임베디드 조건만 제외한다. 타임시프트는 재생목록이 있을 때 `setTimeShiftInfo()`의 동기 검사 동안만 `isEmbed`를 바꾼 뒤 복원한다. SOOP의 이용 권한과 서명 쿠키 처리는 기존 경로를 사용한다. SOOP 번들에서 이 초기화 순서가 바뀌면 재검증한다.
- 임베디드에서 타임시프트 진행바와 일시정지 버튼은 `canUserUseTimeShift`가 참이고 SOOP의 기존 `isTimeShiftShow()`도 참일 때 표시한다. 권한 없는 시청자에게 원본이 제공하는 구독 안내용 진행바는 숨긴다.
- v2의 선명한 모드는 SOOP의 `VideoContainer.change_info`와 스위치의 jQuery 클릭 핸들러를 사용한다. 두 호출 동안만 `LiveViewInfo.bEmbed`를 바꾸고 즉시 복원한다. 지원 검사, 최초 사용 안내, SVG 필터와 `_clearMode.bActiveClearMode` 저장·복원은 SOOP 코드에서 수행한다. 2026-11-19 Edge 157의 교차 출처 iframe에서 켜짐과 꺼짐이 각각 새로고침 후에도 복원되는지 확인했다.
- v2는 iframe의 타임시프트 인증 객체를 연결해 `private_auth.php`의 기존 요청과 갱신을 사용한다. 성공 응답의 서명 쿠키 세 개를 확인하고, 이용 권한과 현재 방송이 일치할 때 `SameSite=None; Secure; Partitioned`로 저장한 뒤 재생목록 로드를 진행한다. 쿠키는 `sooplive.com`의 `/{broadNo}/` 경로로 한정하고 만료 시각은 서명 정책을 따른다. 확인한 정책 형태는 `https://live-tm-*.sooplive.com/{broadNo}/*`의 실제 CDN 호스트가 명시된 단일 정책이다. SOOP가 응답 형식이나 CDN 경로를 바꾸면 재검증한다. [CloudFront 서명 정책](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html)
- 2026-11-19 Edge 157에서 서로 다른 사이트의 iframe 및 로컬 HTTPS 테스트 서버로 타임시프트 인증을 재현했다. 동일한 성공 응답에서 보정 전 세 쿠키 누락과 재생목록 401, 보정 후 세 쿠키 전송과 재생목록 200을 확인했다. 두 경우 모두 인증 요청은 한 번이었고 실계정 되감기는 미확인이다.
- 2026-11-19 Edge 157의 교차 출처 iframe에서 익명 라이브를 재생했다. 화질 메뉴 표시, PIP 진입·종료와 네이티브 숨김, 선명한 모드 필터 적용·해제를 확인했다. 임베디드에 타임시프트 재생목록이 전달되었고 해당 세션은 이용 권한이 없었다. 이용 권한이 있는 세션의 실제 되감기와 고화질 스트리머 연결 시 지연 감소는 검증하지 않았다.
- 설치 확인은 멀티뷰 페이지의 자기 창에 `postMessage`로 요청하며 3초 뒤 한 번 재시도한다. 동일 origin·자기 창·임의 nonce·버전을 검증하고 v2 이상이면 즉시 감지됨(`active`)으로 판단한다. 두 번째 대기 시간이 끝났을 때 v1 응답만 받았으면 업데이트 필요(`outdated`), 유효한 응답이 없으면 미감지(`missing`)로 표시한다. 미감지 판정 뒤에 도착한 유효한 v1·v2 응답도 상태에 반영한다. 플레이어의 준비 신호나 생성·삭제와 독립적으로 동작하므로 플레이어가 없어도 감지한다. 실제 로그인 성공 여부까지 진단하지는 않으며 응답 없음은 미설치·비활성·응답 기능 없는 스크립트를 구분하지 못한다.
- 스크립트의 설치 확인 응답은 `https://soop-multi-view.netlify.app`에서 동일 origin의 자기 창 요청에만 보낸다. SOOP에서는 설치 확인 메시지에 응답하지 않는다. 배포 주소가 바뀌면 `appOrigin`과 `@match`도 갱신한다. 응답에는 버전과 요청 nonce만 포함하며 계정·쿠키 정보는 전달하지 않는다. 로컬 개발 주소에서는 스크립트 설치 여부를 감지할 수 없다.
- 플레이어가 없으면 `UserscriptNotice`는 브라우저 종류·안내 닫기 기록과 무관하게 감지 상태와 설치 절차를 항상 표시한다. 플레이어가 있으면 브라우저 종류와 관계없이 미감지(`missing`) 또는 업데이트 필요(`outdated`) 상태에서 자동 안내를 표시한다. 브라우저 계열은 로그인 오류의 확정 근거로 사용하지 않는다. X로 닫으면 `localStorage`의 `userscript-notice-dismissed`에 기록하여 새로고침·다음 방문·다른 탭에서도 자동 안내를 숨긴다. 미감지·업데이트 필요 상태에서는 메뉴의 `유저 스크립트 안내` 버튼으로 안내를 다시 열 수 있다. 확인 중·감지됨 상태에서는 이 버튼을 표시하지 않는다.
- 플레이어가 없는 화면의 안내는 화면 중앙에 배치한다. 플레이어가 있으면 상단 안내가 플레이어 영역 밖에서 공간을 차지한다. 설치 절차는 항상 메시지 오른쪽에 표시하며 좁은 화면에서는 아래에 배치한다. 기존 `ResizeObserver`와 배치 계산이 남은 높이에 맞춰 동작하므로 안내 표시·닫기 때 iframe을 다시 만들지 않는다.
- SOOP 직접 로그인과 내부 로그인은 현재 전역 jQuery 3.7.1을 공유한다. `ajaxTransport`로 `https://login.sooplive.com/app/LoginAction.php`와 `/app/LogOut.php`만 처리하고, 쿠키 보정 후 SOOP의 기존 JSON/JSONP 변환과 성공·실패 처리를 호출한다. SOOP의 jQuery 구현이 바뀌면 연결을 재검증한다.
- 최상위 SOOP 창에서는 표준 XHR을 사용한다. 멀티뷰 iframe에서는 `https://login.sooplive.com/afreeca/login.php`를 별도 창으로 열고 그 창에서 같은 요청을 한 번 전송한다. SOOP를 최상위 사이트로 만든 뒤 브라우저가 받은 쿠키를 보정하고 원래 iframe에 응답을 돌려준다. 처리 창은 응답·취소·타임아웃 시 닫는다. 멀티뷰에서 팝업과 타사 쿠키를 허용해야 한다.
- 창 간 메시지는 양쪽에서 발신 창·정확한 SOOP origin·임의 nonce를 확인한다. 인증 정보는 URL·창 이름·로컬 저장소·로그에 추가하지 않고, 원래 SOOP iframe과 인증 처리 창 사이에서만 전달한다. 별도 창에서 받은 JSONP는 실행하지 않고 원래 jQuery converter에 반환한다.
- 보정 대상은 `AuthTicket`, `BbsTicket`, `UserTicket`, `isBbs`, `RDB` 중 `sooplive.com` 도메인 쿠키다. 표준 Cookie Store API의 `cookieStore.set({ ...cookie, sameSite: 'none' })`가 Secure를 적용하면서 값·도메인·경로·세션 여부·만료일을 보존한다. Edge 155에서 확인했으며 HttpOnly를 제거해 우회하지 않는다. Cookie Store API가 없는 구형 브라우저는 지원하지 않는다. 로그아웃의 쿠키 만료는 브라우저에 맡긴다.
- `node tests/soopLoginFix.test.mjs`는 쿠키 보존, 직접·iframe 로그인, JSON/JSONP, 추가 인증 결과 전달, 실패·취소·타임아웃·로그아웃, 팝업 차단, 메시지 출처 검증과 중복 설치, 재생 CSS의 실행 범위·DOM 생성 대기, 선명한 모드 초기화와 클릭 위임, 타임시프트 권한·모드 복원·서명 범위와 만료·갱신, 시차 단축의 기존 지원 조건을 검사한다. Edge 155에서는 실제 SOOP 로그인 HTML을 처리 창으로 열고 인증 응답만 가짜로 대체해 티켓의 `SameSite=None; Secure`, iframe 사용 가능 여부, 중복 요청 없음과 처리 창 종료를 확인했다.
- `node tests/userscript.test.mjs`는 브라우저 계열, 자기 창 감지, 재시도·타임아웃, 출처·창·nonce·버전 검증, v1의 업데이트 필요 판정과 v2의 감지 성공, 중복·지연 응답, 재시작과 타이머 정리를 검사한다. 스크립트 쪽 요청 출처와 응답 내용, SOOP에서 감지 응답 미전송, 멀티뷰에서 인증 처리 미실행은 `node tests/soopLoginFix.test.mjs`에서 함께 검사한다. 브라우저 회귀에서는 빈 화면과 플레이어가 있는 화면에서 응답 없음·v1·v2를 각각 확인한다. 자동 안내, 설치 절차, 닫기 기록의 새로고침·새 탭·탭 간 동기화, 미감지·업데이트 필요 상태에서 메뉴 버튼 표시와 안내 재열기, 모바일, 안내 높이 반영과 기존 iframe 유지도 확인한다.
- 배포 주소 전용 감지를 로컬에서 검증할 때는 Playwright의 요청 가로채기로 `https://soop-multi-view.netlify.app`의 HTML·자산을 빌드된 `dist/` 파일로 응답한다. SOOP iframe은 `PonReady`·`Pload`를 처리하는 테스트 HTML로 대체한다. SOOP iframe에 감지 요청이 전송되지 않는지, 플레이어 추가·삭제가 자기 창의 감지 결과를 바꾸지 않는지 확인한다.
- 수정본을 문서 시작에 주입한 별도 Edge에서 사용자가 직접 실계정으로 로그인했고 성공했다고 확인했다. Tampermonkey 설치본의 실계정 로그인과 추가 인증은 아직 확인하지 않았다.
