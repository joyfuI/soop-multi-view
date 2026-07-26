# AGENTS.md

이 파일은 코드만 읽어서는 알기 어려운 외부 서비스 동작, 경험적으로 확인된 제약, 회귀 테스트 절차를 기록한다. 저장소 전체에 적용된다.

## 작업 원칙

- 사용자가 코드 수정을 요청하기 전에는 코드를 수정하지 않는다.
- 사용자가 커밋을 요청하기 전에는 커밋하지 않는다.
- 기존 사용자 변경사항을 보존하고 관련 없는 파일은 수정하지 않는다.
- 작업 중 새로운 비자명한 제약, SOOP 서비스 동작, 회귀 사례, 재사용 가능한 테스트 방법을 확인했다면 같은 작업에서 이 파일도 업데이트한다.
- 오래되거나 더 이상 사실이 아닌 내용은 그대로 누적하지 말고 수정하거나 삭제한다. 외부 서비스 상태처럼 변할 수 있는 사실에는 확인 날짜를 남긴다.

## SOOP 플레이어 연동 불변식

아래 내용은 2026-07-27에 Chromium 계열 브라우저와 실제 방송으로 확인했다.

- `Pload`의 `showChat`은 항상 `true`여야 한다. `false`로 로드하면 채팅 연결 자체가 만들어지지 않는 사례가 확인되었다. 축소 또는 채팅 숨김 상태라도 이 값을 변경하지 않는다.
- 채팅 표시 여부는 부모 앱의 CSS와 레이아웃으로만 제어한다. 숨길 때 iframe을 `PLAYER_CHAT_WIDTH`만큼 넓히고 부모의 `overflow: hidden`으로 오른쪽 채팅 영역을 자른다.
- `PtoggleChat`은 성공 응답이나 상태 조회 방법이 없다. 자동재생 차단 시 명령 적용 완료를 확인할 신뢰 가능한 postMessage 신호도 없으므로 화면 상태의 기준으로 다시 사용하지 않는다.
- `PonReady`는 postMessage 명령 수신기가 생겼다는 신호일 뿐, 채팅 UI 초기화 완료나 이후 상태 덮어쓰기 방지를 보장하지 않는다.
- 정상 자동재생은 `PupdateMediaEvent`로 확인한다. 자동재생이 차단되면 이 이벤트가 오지 않을 수 있고, SOOP iframe 콘솔의 `Uncaught (in promise) Error: auto play block`은 재현 조건에서 예상되는 오류다.
- 1초 fallback은 자동재생 차단 시 SOOP의 재생 컨트롤을 사용자에게 보여주기 위한 것이다. 채팅 숨김 타이밍과 연결하지 않는다.
- 숨겨진 640x360 bootstrap iframe은 SOOP 플레이어와 QualityBox 초기화를 위한 것이다. 크기나 표시 순서를 바꿀 때는 축소 로딩과 화질 선택 UI를 반드시 다시 확인한다.
- 현재 SOOP 내부 채팅 폭은 296px이며 `PLAYER_CHAT_WIDTH`와 일치한다. SOOP 레이아웃이 변경되면 이 값을 실제 iframe 치수로 다시 검증한다.
- iframe은 cross-origin이므로 앱 코드에서 SOOP 내부 DOM이나 `#chatting_area` 상태를 읽을 수 없다. 내부 DOM 검사는 Playwright 같은 브라우저 자동화 검증에서만 가능하다.

## 실방송 테스트 ID 찾기

- [SOOP 홈](https://www.sooplive.com/)의 `인기 LIVE` 또는 현재 라이브 목록을 연다.
- 방송 링크가 `https://play.sooplive.com/{soopId}/{broadNo}`라면 첫 번째 경로가 테스트에 사용할 SOOP ID다.
- 로컬 멀티뷰는 `http://localhost:3000/{id1}/{id2}/...` 형식으로 연다.
- 방송은 언제든 종료될 수 있으므로 특정 ID를 영구 fixture처럼 간주하지 않는다. 테스트 직전에 실제 방송 중인지 확인한다.
- 2026-07-27에 사용한 예시는 `devil0108`, `tntntn13`, `lovely5959`, `kimdoenmo`, `ansguswns519`, `rkdakstlr911`, `9ambler`다. 이후에는 오프라인일 수 있다.
- 고화질 스트리머 설치 안내가 나오면 실제 재생 성공 경로를 확인하기 위해 `저화질 참여`를 선택할 수 있다.

## 브라우저 회귀 테스트

Firefox만으로 검증하지 않는다. 자동재생 정책 문제가 발생하는 Chrome 또는 Edge의 새 브라우저 컨텍스트에서도 확인한다.

### 자동재생 차단 + 축소 로딩

1. 방송 중인 ID의 상태를 `minimized`로 만든 뒤 새 Chromium 컨텍스트에서 페이지를 연다.
2. 자동재생 차단이 재현되면 플레이어가 `fallback` 단계로 보이는지 확인한다.
3. 플레이어의 `data-chat-visible`이 `false`인지 확인한다.
4. 외부 타일 너비를 `W`라고 할 때 iframe 너비가 `W + PLAYER_CHAT_WIDTH`인지 확인한다.
5. SOOP 내부 채팅은 연결되고 `chat_open` 상태여도 부모 화면에 보이는 채팅 폭은 0px여야 한다.
6. 재생 버튼과 화질 선택 UI가 영상 영역 안에서 보이고 조작 가능한지 확인한다.

### 재생 성공 + 상태 전환

1. SOOP 재생 버튼을 누르고 필요하면 `저화질 참여`를 선택한다.
2. `PupdateMediaEvent` 이후 플레이어 단계가 `playing`인지 확인한다.
3. 재생 중 축소했을 때 영상 재생이 계속되고 채팅 노출 폭이 0px인지 확인한다.
4. 다시 확대하면 채팅이 보이고 iframe 너비가 외부 플레이어 너비와 같아지는지 확인한다.
5. 최대화 상태에서 앱의 채팅 토글을 두 번 눌러 숨김과 복원이 모두 CSS 자르기로 동작하는지 확인한다. SOOP 내부 채팅 연결은 유지되어야 한다.

### 다중 플레이어 스트레스 테스트

- 이전 회귀는 축소 상태로 동시에 로딩한 7번째 플레이어에서 채팅이 남는 형태로 발생했다.
- 방송 중인 서로 다른 ID 7개를 모두 `minimized`로 설정하고 동시에 로드한다.
- 1번부터 7번까지 각각 `data-chat-visible=false`, iframe과 타일의 너비 차이 296px, 화면에 보이는 채팅 폭 0px인지 확인한다.
- 로딩 속도와 무관하게 같은 결과가 나와야 하며 `fallback`과 `playing` 플레이어가 섞여 있어도 통과해야 한다.

브라우저 테스트용으로 상태를 한 번에 설정할 때는 개발자 도구에서 다음 형태를 사용할 수 있다.

```js
const ids = ['id1', 'id2'];
localStorage.setItem(
  'state',
  JSON.stringify(Object.fromEntries(ids.map((id) => [id, { display: 'minimized' }]))),
);
```

## 로컬 검증 명령

```bash
pnpm exec biome check src/App.tsx src/Player.tsx
pnpm run build
pnpm run dev --host 127.0.0.1
```

- `pnpm run check`는 `--write`가 포함되어 파일을 수정한다. 읽기 전용 확인이 필요하면 `pnpm exec biome check ...`를 사용한다.
- 브라우저 자동화 산출물은 `output/playwright/` 아래에 만들고 검증이 끝나면 제거한다.
- 광고 차단 확장 프로그램에서 발생하는 `broadcast_information` timeout 같은 오류는 앱 오류와 구분한다.
