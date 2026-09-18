/*
  맨 위로 이동 버튼 (2026-09-18 추가)
  - gate.js·intro.js·assistant.js와 동일한 패턴: 자기 완결형 단일 파일(자체 <style> 주입).
  - 우측 하단 챗봇 버튼(assistant.js, right:16px/bottom:16px/54px)과 겹치지 않도록
    같은 우측 열에서 그 버튼 바로 위(16+54+12=82px)에 쌓았다. z-index도 챗봇(9000)보다
    한 단계 낮게(8990) 두어, 챗봇 패널이 펼쳐졌을 때는 자연스럽게 그 아래로 가려진다.
  - 게이트(`gate.js`) 통과 전에는 body가 visibility:hidden 상태라 어차피 안 보이지만,
    다른 위젯과 동일하게 `window.dnkGate.ready`를 기다렸다가 초기화한다.
*/
(function () {
  "use strict";

  var SHOW_AT = 480;       // 이 픽셀 이상 스크롤되면 표시
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function injectStyle() {
    var css =
      ".dnk-top-btn{" +
        "position:fixed;right:16px;bottom:calc(82px + env(safe-area-inset-bottom,0px));" +
        "width:40px;height:40px;border-radius:50%;" +
        "background:#fff;color:#0a2540;border:1px solid #d3d8de;" +
        "box-shadow:0 4px 12px rgba(10,37,64,.16);" +
        "display:flex;align-items:center;justify-content:center;cursor:pointer;" +
        "z-index:8990;padding:0;" +
        "opacity:0;transform:translateY(8px);pointer-events:none;" +
        "transition:opacity .18s ease,transform .18s ease,box-shadow .15s ease;" +
      "}" +
      ".dnk-top-btn.show{opacity:1;transform:translateY(0);pointer-events:auto;}" +
      ".dnk-top-btn:hover{box-shadow:0 6px 16px rgba(10,37,64,.24);}" +
      ".dnk-top-btn:active{transform:translateY(0) scale(.94);}" +
      "@media (max-width:380px){.dnk-top-btn{right:12px;}}";
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function init() {
    injectStyle();

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dnk-top-btn";
    btn.setAttribute("aria-label", "맨 위로 이동");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    function updateVisibility() {
      if (window.scrollY > SHOW_AT) btn.classList.add("show");
      else btn.classList.remove("show");
    }
    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  (window.dnkGate ? window.dnkGate.ready : Promise.resolve(true)).then(init);
})();
