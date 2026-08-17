/*
  간단 접속 암호 게이트 (새 서비스 가입 없이, GitHub Pages 그대로 사용)
  - 실제 보안 장치가 아니라 "우연히/장난으로 계속 들여다보는 것"을 막는 수준의 간단한 장치입니다.
  - 암호를 바꾸려면: 새 암호의 SHA-256 해시값을 구해서 아래 PASS_HASH를 교체하세요.
    (터미널에서 예시: node -e "console.log(require('crypto').createHash('sha256').update('새암호','utf8').digest('hex'))")
  - 기본 암호는 별도로 전달드립니다.
*/
(function () {
  "use strict";
  var STORAGE_KEY = "dnk_gate_ok_v1";
  var EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30일간 재입력 없이 열람 허용
  var PASS_HASH = "e1b3f482e9ed97406e19a3f81ed51f2ffc35e5cd8a7d18f22e72a8ff7b980815";

  document.body.style.display = "none";

  function isUnlocked() {
    try {
      var exp = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      return exp > Date.now();
    } catch (e) {
      return false;
    }
  }

  function markUnlocked() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + EXPIRY_MS));
    } catch (e) {}
  }

  function reveal() {
    document.body.style.display = "";
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

  if (isUnlocked()) {
    reveal();
    return;
  }

  function showGate() {
    var style = document.createElement("style");
    style.textContent =
      "#dnk-gate{position:fixed;inset:0;background:#0a2540;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;}" +
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
          reveal();
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

  if (document.body) {
    showGate();
  } else {
    document.addEventListener("DOMContentLoaded", showGate);
  }
})();
