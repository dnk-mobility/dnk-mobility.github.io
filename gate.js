/*
  2단계 접속 암호 게이트 (새 서비스 가입 없이, GitHub Pages 그대로 사용)
  - 실제 보안 장치가 아니라 "우연히/장난으로 계속 들여다보는 것"을 막는 수준의 간단한 장치입니다.

  [1차 — 페이지 진입 암호]
  - 페이지에 들어가는 즉시 전체 화면을 가리고 암호를 묻습니다 (요약정보 포함, 예외 없음).
    설비 페이지·홈(index.html)·PDF 뷰어 모두 동일하게 동작합니다.
  - 단, 홈(index.html)은 앞에서 intro.js가 진입 인트로를 재생하므로 그것이 끝난 뒤에
    암호창이 뜹니다 (window.dnkIntro.done 을 기다림). 인트로가 없는 페이지는 즉시 뜹니다.

  [2차 — 기술문서 등 민감 항목 암호]
  - <details class="section" data-lock="2"> 로 표시한 항목은 1차 암호를 통과해도 바로 열리지
    않고, 펼칠 때 2차 암호를 한 번 더 묻습니다. (현재 대상: 기술문서 / 마스터 샘플·보정 이력)
  - 한 번 맞으면 같은 탭 안의 모든 2차 항목이 함께 풀립니다.
  - 기술문서 PDF(`*-circuit.pdf`, `*-drawing.pdf`)는 뷰어 주소로 직접 열어도 2차 암호를 묻습니다.

  [인증 유지 범위]
  - 같은 탭(브라우저 창)에서 다른 설비 페이지로 이동하는 동안에는 다시 묻지 않지만,
    브라우저/탭을 닫거나 QR을 다시 스캔해 새 탭으로 열면 다시 암호를 묻습니다.

  [암호 변경 방법]
  - 새 암호의 SHA-256 해시값을 구해서 아래 HASH_1 / HASH_2 를 교체하세요.
    (터미널 예시: node -e "console.log(require('crypto').createHash('sha256').update('새암호','utf8').digest('hex'))")
*/
(function () {
  "use strict";

  var KEY_1 = "dnk_gate_ok_v1";
  var KEY_2 = "dnk_gate2_ok_v1";
  var HASH_1 = "6712da30aaaa05bee4d101db4fd64542e8ac7176769bab88f87e826456678fa9";
  var HASH_2 = "7f48af2476760863ede4e293e55f32fd304695e6f9e35b6b2888264a002ad6bf";

  // 2차 암호가 필요한 PDF 파일명 규칙 (기술문서 = 전기회로도·기계도면)
  var TECH_PDF_RE = /-(circuit|drawing)\.pdf$/i;

  function isOk(key) {
    try {
      return sessionStorage.getItem(key) === "1";
    } catch (e) {
      return false;
    }
  }

  function markOk(key) {
    try {
      sessionStorage.setItem(key, "1");
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

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // 페이지 전체를 즉시 가림 (스크립트가 <body> 맨 앞에서 동기 실행되므로 콘텐츠가
  // 그려지기 전에 숨길 수 있음)
  document.documentElement.style.visibility = "hidden";

  var styleAdded = false;
  function addStyle() {
    if (styleAdded) return;
    styleAdded = true;
    var style = document.createElement("style");
    style.textContent =
      ".dnk-gate{position:fixed;inset:0;background:#0a2540;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;visibility:visible;}" +
      ".dnk-gate.dim{background:rgba(10,37,64,.72);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}" +
      ".dnk-gate.dim .dnk-gate-card{background:#0a2540;border-radius:12px;padding:24px 20px;max-width:300px;}" +
      ".dnk-gate-card{width:100%;max-width:300px;padding:0 24px;text-align:center;}" +
      ".dnk-gate-brand{color:#8fb3d6;font-size:11px;letter-spacing:.06em;margin-bottom:10px;}" +
      ".dnk-gate-title{color:#fff;font-size:17px;font-weight:800;margin-bottom:6px;}" +
      ".dnk-gate-sub{color:#8fb3d6;font-size:12px;line-height:1.5;margin-bottom:18px;}" +
      ".dnk-gate-input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:8px;border:1px solid #1a4971;background:#0f3255;color:#fff;font-size:15px;text-align:center;outline:none;}" +
      ".dnk-gate-input::placeholder{color:#7a92ab;}" +
      ".dnk-gate-err{color:#f3a6a1;font-size:12px;min-height:16px;margin-top:8px;}" +
      ".dnk-gate-btn{margin-top:6px;width:100%;padding:12px;border:none;border-radius:8px;background:#0f6cb0;color:#fff;font-size:14px;font-weight:700;cursor:pointer;}" +
      ".dnk-gate-btn:active{opacity:.85;}" +
      ".dnk-gate-cancel{margin-top:10px;width:100%;padding:4px;border:none;background:none;color:#8fb3d6;font-size:12px;cursor:pointer;}";
    document.documentElement.appendChild(style);
  }

  /*
    암호 입력창을 띄우고, 맞을 때까지(또는 취소할 때까지) 기다립니다.
    opts = { hash, key, title, sub, dim, cancelable }
    - dim:        true면 페이지 위에 반투명 모달로 표시 (2차 암호용)
    - cancelable: true면 "취소" 버튼 제공 → 취소 시 false로 resolve
  */
  function ask(opts) {
    addStyle();
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "dnk-gate" + (opts.dim ? " dim" : "");
      wrap.innerHTML =
        '<div class="dnk-gate-card">' +
        '<div class="dnk-gate-brand">DnK MOBILITY · 후공정 생산기술팀</div>' +
        '<div class="dnk-gate-title">' + opts.title + "</div>" +
        (opts.sub ? '<div class="dnk-gate-sub">' + opts.sub + "</div>" : "") +
        '<input class="dnk-gate-input" type="password" placeholder="접속 암호" autocomplete="off" />' +
        '<div class="dnk-gate-err"></div>' +
        '<button class="dnk-gate-btn">확인</button>' +
        (opts.cancelable ? '<button class="dnk-gate-cancel">취소</button>' : "") +
        "</div>";
      document.documentElement.appendChild(wrap);

      var input = wrap.querySelector(".dnk-gate-input");
      var err = wrap.querySelector(".dnk-gate-err");
      var btn = wrap.querySelector(".dnk-gate-btn");
      var cancel = wrap.querySelector(".dnk-gate-cancel");

      function close(result) {
        wrap.remove();
        resolve(result);
      }

      function tryUnlock() {
        sha256Hex(input.value).then(function (hex) {
          if (hex === opts.hash) {
            markOk(opts.key);
            close(true);
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
      if (cancel) {
        cancel.addEventListener("click", function () {
          close(false);
        });
      }
      setTimeout(function () {
        input.focus();
      }, 50);
    });
  }

  // ===== 2차 잠금 항목 처리 =====

  function markUnlocked(el) {
    el.classList.add("unlocked");
    var badge = el.querySelector("summary .lock");
    if (badge) badge.textContent = "해제";
  }

  function unlockAllSections() {
    var list = document.querySelectorAll('details.section[data-lock="2"]');
    for (var i = 0; i < list.length; i++) markUnlocked(list[i]);
  }

  function wireSections() {
    var list = document.querySelectorAll('details.section[data-lock="2"]');
    if (!list.length) return;

    if (isOk(KEY_2)) {
      unlockAllSections();
      return;
    }

    for (var i = 0; i < list.length; i++) {
      (function (el) {
        var summary = el.querySelector("summary");
        if (!summary) return;
        summary.addEventListener("click", function (e) {
          if (isOk(KEY_2)) return; // 이미 해제됨 — 평소대로 펼침
          e.preventDefault();
          ask({
            hash: HASH_2,
            key: KEY_2,
            title: "기술자료 열람 암호",
            sub: "이 항목은 별도 암호가 필요합니다.<br>후공정 생산기술팀에 문의하세요.",
            dim: true,
            cancelable: true
          }).then(function (ok) {
            if (!ok) return;
            unlockAllSections();
            el.open = true;
          });
        });
      })(list[i]);
    }
  }

  // ===== 진입 절차 =====

  var file = "";
  try {
    file = new URLSearchParams(location.search).get("file") || "";
  } catch (e) {}
  var needsTech = TECH_PDF_RE.test(decodeURIComponent(file));

  // index.html은 gate.js 앞에서 intro.js가 진입 인트로를 재생한다. 인트로가 끝난 뒤에
  // 암호창을 띄우기 위해 기다린다 (다른 페이지에는 window.dnkIntro가 없어 즉시 통과).
  var afterIntro = Promise.resolve(window.dnkIntro && window.dnkIntro.done);

  var chain = afterIntro.then(function () {
    if (isOk(KEY_1)) return true;
    return ask({ hash: HASH_1, key: KEY_1, title: "사내 전용 페이지입니다" });
  });

  if (needsTech) {
    chain = chain.then(function () {
      if (isOk(KEY_2)) return true;
      return ask({
        hash: HASH_2,
        key: KEY_2,
        title: "기술자료 열람 암호",
        sub: "설비 전기회로도·기계도면은 별도 암호가 필요합니다."
      });
    });
  }

  chain = chain.then(function () {
    document.documentElement.style.visibility = "visible";
    onReady(wireSections);
  });

  // PDF 뷰어처럼 게이트 통과 후에 실행돼야 하는 스크립트가 기다릴 수 있도록 노출
  window.dnkGate = { ready: chain };
})();
