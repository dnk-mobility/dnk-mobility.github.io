/*
  간단 접속 암호 게이트 (새 서비스 가입 없이, GitHub Pages 그대로 사용)
  - 실제 보안 장치가 아니라 "우연히/장난으로 계속 들여다보는 것"을 막는 수준의 간단한 장치입니다.
  - 페이지에 들어가는 즉시 전체 화면을 가리고 암호를 묻습니다 (요약정보 포함, 예외 없음).
    설비 페이지·홈(index.html) 모두 동일하게 동작합니다.
  - 같은 탭(브라우저 창)에서 다른 설비 페이지로 이동하는 동안에는 다시 묻지 않지만,
    브라우저/탭을 닫거나 QR을 다시 스캔해 새 탭으로 열면 다시 암호를 묻습니다.
  - 암호를 바꾸려면: 새 암호의 SHA-256 해시값을 구해서 아래 PASS_HASH를 교체하세요.
    (터미널 예시: node -e "console.log(require('crypto').createHash('sha256').update('새암호','utf8').digest('hex'))")
*/
(function () {
  "use strict";
  var STORAGE_KEY = "dnk_gate_ok_v1";
  var PASS_HASH = "6712da30aaaa05bee4d101db4fd64542e8ac7176769bab88f87e826456678fa9";

  function isUnlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markUnlocked() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
  }

  function sha256Hex(text) {
    var buf = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", buf).then(function (hash) {
      return Array.prototype.map
        .call(new Uint8Array(hash), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        })
        .join("");
    });
  }

  // 페이지 전체를 즉시 가림 (스크립트가 <body> 맨 앞에서 동기 실행되므로 콘텐츠가
  // 그려지기 전에 숨길 수 있음)
  document.documentElement.style.visibility = "hidden";

  if (isUnlocked()) {
    document.documentElement.style.visibility = "visible";
    return;
  }

  function buildOverlay() {
    var style = document.createElement("style");
    style.textContent =
      "#dnk-gate{position:fixed;inset:0;background:#0a2540;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;visibility:visible;}" +
      ".dnk-gate-card{width:100%;max-width:300px;padding:0 24px;text-align:center;}" +
      ".dnk-gate-brand{color:#8fb3d6;font-size:11px;letter-spacing:.06em;margin-bottom:10px;}" +
      ".dnk-gate-title{color:#fff;font-size:17px;font-weight:800;margin-bottom:22px;}" +
      ".dnk-gate-input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:8px;border:1px solid #1a4971;background:#0f3255;color:#fff;font-size:15px;text-align:center;outline:none;}" +
      ".dnk-gate-input::placeholder{color:#7a92ab;}" +
      ".dnk-gate-err{color:#f3a6a1;font-size:12px;min-height:16px;margin-top:8px;}" +
      ".dnk-gate-btn{margin-top:6px;width:100%;padding:12px;border:none;border-radius:8px;background:#0f6cb0;color:#fff;font-size:14px;font-weight:700;cursor:pointer;}" +
      ".dnk-gate-btn:active{opacity:.85;}";
    document.documentElement.appendChild(style);

    var wrap = document.createElement("div");
    wrap.id = "dnk-gate";
    wrap.innerHTML =
      '<div class="dnk-gate-card">' +
      '<div class="dnk-gate-brand">DnK MOBILITY · 후공정 생산기술팀</div>' +
      '<div class="dnk-gate-title">사내 전용 페이지입니다</div>' +
      '<input id="dnk-gate-pw" class="dnk-gate-input" type="password" placeholder="접속 암호" autocomplete="off" />' +
      '<div id="dnk-gate-err" class="dnk-gate-err"></div>' +
      '<button id="dnk-gate-go" class="dnk-gate-btn">확인</button>' +
      "</div>";
    document.documentElement.appendChild(wrap);

    var input = wrap.querySelector("#dnk-gate-pw");
    var err = wrap.querySelector("#dnk-gate-err");
    var btn = wrap.querySelector("#dnk-gate-go");

    function tryUnlock() {
      var val = input.value;
      sha256Hex(val).then(function (hex) {
        if (hex === PASS_HASH) {
          markUnlocked();
          wrap.remove();
          style.remove();
          document.documentElement.style.visibility = "visible";
        } else {
          err.textContent = "암호가 올바르지 않습니다";
          input.value = "";
          input.focus();
        }
      });
    }

    btn.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock();
    });
    setTimeout(function () {
      input.focus();
    }, 50);
  }

  function init() {
    buildOverlay();
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
