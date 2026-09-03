/*
  홈 화면(index.html) 진입 인트로 — QR 스캔 연출 + 브랜드 페이드

  - QR 조준선 위로 스캔 라인이 한 번 훑고 지나간 뒤, 브랜드명·제목이 떠오르고
    시안 밑줄이 그어지면서 화면이 걷힙니다. 전체 약 1.7초.
  - 암호 게이트(gate.js)를 통과한 뒤에 시작합니다. 게이트가 아직 떠 있는 동안에는
    같은 네이비 화면이 그 뒤에 깔려 있을 뿐이라 이음새가 보이지 않습니다.
  - sessionStorage에 기록해 **한 세션에 한 번만** 재생합니다 (암호 인증과 같은 수명 —
    탭을 닫으면 초기화). 현장에서 하루에 여러 번 스캔해도 매번 보지 않습니다.
  - 화면을 탭하면 즉시 건너뜁니다.
  - 시스템 설정이 "동작 줄이기"면 아예 재생하지 않습니다.
  - 외부 이미지·폰트를 쓰지 않고 CSS 도형만 사용하므로 로딩 용량이 늘지 않습니다.
    인덱스 콘텐츠는 인트로가 도는 동안 이미 뒤에서 다 그려져 있습니다.

  이 파일은 index.html 에서만 로드됩니다 (설비 페이지 10개는 제외 — 매번 나오면 방해됨).
*/
(function () {
  "use strict";

  var KEY = "dnk_intro_shown_v1";

  function alreadyShown() {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch (e) {
      return true;
    }
  }

  function mark() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch (e) {}
  }

  if (alreadyShown()) return;

  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      mark();
      return;
    }
  } catch (e) {}

  var style = document.createElement("style");
  style.textContent =
    "#dnk-intro{position:fixed;inset:0;z-index:99998;background:#0a2540;visibility:visible;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;" +
    "transition:opacity .32s ease;}" +
    "#dnk-intro.out{opacity:0;pointer-events:none;}" +
    "#dnk-intro .ret{position:relative;width:88px;height:88px;opacity:0;margin-bottom:26px;}" +
    "#dnk-intro .ret i{position:absolute;width:20px;height:20px;border:2px solid #37c6e0;}" +
    "#dnk-intro .ret i:nth-child(1){top:0;left:0;border-right:0;border-bottom:0;}" +
    "#dnk-intro .ret i:nth-child(2){top:0;right:0;border-left:0;border-bottom:0;}" +
    "#dnk-intro .ret i:nth-child(3){bottom:0;left:0;border-right:0;border-top:0;}" +
    "#dnk-intro .ret i:nth-child(4){bottom:0;right:0;border-left:0;border-top:0;}" +
    "#dnk-intro .scan{position:absolute;left:-7px;right:-7px;top:0;height:2px;opacity:0;" +
    "background:linear-gradient(90deg,rgba(55,198,224,0),#37c6e0,rgba(55,198,224,0));" +
    "box-shadow:0 0 12px rgba(55,198,224,.65);}" +
    "#dnk-intro .brand{font-size:11px;letter-spacing:.16em;color:#8fb3d6;opacity:0;}" +
    "#dnk-intro .title{margin-top:7px;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;opacity:0;}" +
    "#dnk-intro .rule{margin-top:13px;width:0;height:2px;background:#37c6e0;}" +
    "#dnk-intro.run .ret{animation:dnkRet .3s ease forwards;}" +
    "#dnk-intro.run .scan{animation:dnkScan .8s cubic-bezier(.4,0,.2,1) .18s forwards;}" +
    "#dnk-intro.run .brand{animation:dnkUp .42s ease .58s forwards;}" +
    "#dnk-intro.run .title{animation:dnkUp .42s ease .72s forwards;}" +
    "#dnk-intro.run .rule{animation:dnkRule .4s cubic-bezier(.4,0,.2,1) .92s forwards;}" +
    "@keyframes dnkRet{to{opacity:1;}}" +
    "@keyframes dnkScan{0%{top:0;opacity:0;}14%{opacity:1;}86%{opacity:1;}100%{top:100%;opacity:0;}}" +
    "@keyframes dnkUp{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}" +
    "@keyframes dnkRule{to{width:92px;}}";
  document.documentElement.appendChild(style);

  var ov = document.createElement("div");
  ov.id = "dnk-intro";
  ov.innerHTML =
    '<div class="ret"><i></i><i></i><i></i><i></i><span class="scan"></span></div>' +
    '<div class="brand">DnK MOBILITY</div>' +
    '<div class="title">공정 설비 정보관리</div>' +
    '<div class="rule"></div>';
  document.documentElement.appendChild(ov);

  var closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    mark();
    ov.classList.add("out");
    setTimeout(function () {
      ov.remove();
      style.remove();
    }, 340);
  }

  function start() {
    ov.classList.add("run");
    ov.addEventListener("click", finish);
    setTimeout(finish, 1400);
  }

  // 암호 게이트 통과 후 시작 (게이트가 없거나 실패해도 화면이 잠기지 않도록 양쪽 모두 start)
  Promise.resolve(window.dnkGate && window.dnkGate.ready).then(start, start);
})();
