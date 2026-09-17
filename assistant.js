/*
  설비 정보 도우미 (규칙 기반 안내 위젯, 2026-09-17 추가)
  - 우측 하단 고정 버튼 → 클릭 시 채팅 패널이 열리는 챗봇형 UI.
  - 서버·API 없이 클라이언트 JS만으로 동작 (이 프로젝트는 빌드/백엔드 없는 정적
    사이트가 핵심 특징이라, 실제 AI 대화 대신 키워드 매칭 규칙으로 구현함).
  - 할 수 있는 것: 설비 페이지로 이동, 페이지 안 섹션까지 자동으로 펼쳐서 안내,
    자주 묻는 질문 답변, 설비·품번 검색, 공정별 이론·상식 안내.
  - 게이트(`gate.js`) 통과 전에는 위젯을 아예 만들지 않음 — `window.dnkGate.ready`를
    기다렸다가 초기화하므로, 암호 화면이 떠 있는 동안에는 다른 콘텐츠와 마찬가지로
    보이지 않는다(문서 루트의 visibility:hidden을 그대로 물려받음).
  - 섹션 자동 펼침은 새 id를 추가하지 않고 각 <summary> 텍스트로 찾는다 — 10개
    설비 페이지의 섹션 제목 문구가 전부 동일하다는 것을 확인하고 설계함.
  - 잠금 섹션(`data-lock="2"`, 기술문서·마스터샘플)은 강제로 펼치지 않고 스크롤만
    한다 — 여기서 직접 열어버리면 gate.js의 2차 암호 확인을 우회하게 되므로 반드시
    지켜야 하는 제약.
  - 다른 페이지의 섹션으로 안내할 때는 `?goto=<토픽키>`를 붙여 이동시키고, 그
    페이지에서 다시 이 스크립트가 파라미터를 읽어 같은 방식으로 펼친 뒤 URL에서
    제거한다.
*/
(function () {
  "use strict";

  // ===================== 데이터 =====================

  var EQUIPMENT = [
    { id: "laser-marking", file: "laser-marking.html", no: 110,
      name: "레이저 마킹기", process: "레이저 마킹", doc: "DnK-250915-001",
      keywords: ["레이저마킹", "레이저", "마킹기", "마킹", "각인", "바코드마킹"],
      theoryKey: "laser" },
    { id: "leak-pre-flow", file: "leak-pre-flow.html", no: 120,
      name: "조립전 유로계 리크검사기", process: "유로계 리크 테스트(조립전)", doc: "DnK-250915-002",
      keywords: ["유로계", "조립전", "리크", "리크검사기", "리크테스트"], hasManual: true, theoryKey: "leak" },
    { id: "leak-pre-full", file: "leak-pre-full.html", no: 130,
      name: "조립전 전체계 리크검사기", process: "전체계 리크 테스트(조립전)", doc: "DnK-250915-003",
      keywords: ["전체계", "조립전", "리크", "리크검사기", "리크테스트"], hasManual: true, theoryKey: "leak" },
    { id: "nipple-oil-press", file: "nipple-oil-press.html", no: 140,
      name: "오일니쁠 압입기 / 테이퍼 플러그 체결기(1개소)", process: "NIPPLE-OIL 압입 & PLUG-TAPER(1개소) 체결", doc: "DnK-250915-004",
      keywords: ["오일니쁠", "오일니플", "니쁠", "니플", "1개소"],
      theoryKey: "nippleOil" },
    { id: "cap-sealing-press", file: "cap-sealing-press.html", no: 150,
      name: "씰캡 압입기", process: "CAP SEALING 압입", doc: "DnK-250915-005",
      keywords: ["씰캡", "실캡", "캡실링", "씰링캡"],
      theoryKey: "capSealing" },
    { id: "taper-plug-fastening", file: "taper-plug-fastening.html", no: 160,
      name: "테이퍼 플러그 체결기(5개소)", process: "PLUG-TAPER 체결", doc: "DnK-250915-006",
      keywords: ["테이퍼플러그체결", "플러그체결", "테이퍼체결", "5개소", "테이퍼", "플러그"],
      theoryKey: "taperFastening" },
    { id: "dowel-pin-press", file: "dowel-pin-press.html", no: 170,
      name: "다월핀 압입기", process: "PIN-DOWEL 압입", doc: "DnK-250915-007",
      keywords: ["다월핀", "도웰핀", "다웰핀", "핀압입"],
      theoryKey: "dowelPin" },
    { id: "leak-post-flow", file: "leak-post-flow.html", no: 180,
      name: "조립후 유로계 리크검사기", process: "유로계 리크 테스트(조립후)", doc: "DnK-250915-008",
      keywords: ["유로계", "조립후", "리크", "리크검사기", "리크테스트"], hasManual: true, theoryKey: "leak" },
    { id: "leak-post-full", file: "leak-post-full.html", no: 190,
      name: "조립후 전체계 리크검사기", process: "전체계 리크 테스트(조립후)", doc: "DnK-250915-009",
      keywords: ["전체계", "조립후", "리크", "리크검사기", "리크테스트"], hasManual: true, theoryKey: "leak" },
    { id: "taper-plug-height", file: "taper-plug-height.html", no: 200,
      name: "테이퍼 플러그 돌출높이 검사기", process: "PLUG-TAPER 높이검사", doc: "DnK-250915-010",
      keywords: ["돌출높이", "높이검사", "테이퍼높이", "테이퍼", "돌출"],
      theoryKey: "taperHeight" }
  ];

  // 페이지 공용 섹션 토픽 맵 — match: 실제 <summary> 텍스트에 포함된 부분 문자열,
  // keywords: 사용자가 자유롭게 입력할 만한 표현
  var SECTION_TOPICS = [
    { key: "overview", label: "설비 개요", match: "설비 개요", keywords: ["개요"] },
    { key: "docs", label: "첨부 문서", match: "첨부 문서", keywords: ["첨부문서", "첨부 문서", "파트리스트", "part list"] },
    { key: "tech", label: "기술문서", match: "기술문서", keywords: ["기술문서", "회로도", "기계도면", "도면"], locked: true },
    { key: "steps", label: "표준 작업 순서", match: "표준 작업 순서", keywords: ["작업순서", "작업 순서", "공정순서"] },
    { key: "spec", label: "검사 규격 및 파라미터", match: "검사 규격", keywords: ["검사규격", "검사 규격", "파라미터", "규격"] },
    { key: "checklist", label: "설비 일상점검표", match: "일상점검표", keywords: ["점검표", "일상점검", "점검"] },
    { key: "manual", label: "조작 매뉴얼 요약", match: "조작 매뉴얼", keywords: ["조작매뉴얼", "조작 매뉴얼", "매뉴얼", "조작법"] },
    { key: "trouble", label: "트러블슈팅 이력", match: "트러블슈팅", keywords: ["트러블슈팅", "고장이력", "불량사례"] },
    { key: "history", label: "마스터 샘플 · 보정 이력", match: "마스터 샘플", keywords: ["마스터샘플", "마스터 샘플", "보정이력", "보정 이력"], locked: true },
    { key: "notice", label: "최근 공지", match: "최근 공지", keywords: ["공지", "공지사항"] }
  ];

  var FAQ = [
    { q: "암호를 잊어버렸어요", keywords: ["암호", "비밀번호", "패스워드", "password", "로그인"],
      a: "암호는 제가 알려드릴 수 없어요. 1차 접속 암호나 기술자료 암호가 기억나지 않으면 후공정 생산기술팀에 문의해주세요." },
    { q: "PDF가 안 열려요", keywords: ["pdf", "안열려", "안 열려", "열리지"],
      a: "PDF가 안 열리면 아직 업로드되지 않은 문서이거나 네트워크 문제일 수 있어요. 새로고침 후에도 안 되면 후공정 생산기술팀에 파일 등록 여부를 확인해주세요." },
    { q: "화면이 하얗게 나와요", keywords: ["하얗", "화면이 안", "안보여요", "안 보여요", "깨져요"],
      a: "브라우저 자바스크립트가 꺼져 있으면 화면이 그렇게 보일 수 있어요. 브라우저 설정에서 자바스크립트를 켠 뒤 새로고침 해보세요." },
    { q: "점검은 언제 하나요", keywords: ["점검주기", "점검 주기", "점검언제", "언제 점검", "점검 언제"],
      a: "기본적으로 1회/shift(주간·야간 각 1회) 기준이에요. 정확한 항목은 각 설비 페이지의 \"⑥ 설비 일상점검표 체크 항목\"에서 확인하세요." },
    { q: "불량(NG)이 나왔어요", keywords: ["불량", "ng", "부적합", "이상발생", "이상 발생"],
      a: "각 설비 페이지의 \"표준 작업 순서\" 중 이상 발생 시 조치 안내와 \"트러블슈팅 이력\"을 먼저 확인해주세요. 필요하면 생산기술팀에 바로 연락하는 게 가장 빠릅니다." },
    { q: "이 시스템은 뭔가요", keywords: ["시스템이 뭐", "시스템 뭐", "뭐하는 시스템", "qr이 뭐", "qr코드가 뭐"],
      a: "설비에 붙은 QR코드를 스캔하면 그 설비의 작업표준·검사규격·점검표·트러블슈팅 이력을 모바일로 바로 볼 수 있는 사내 시스템이에요." },
    { q: "문의는 어디로 하나요", keywords: ["문의", "담당", "연락처", "누구한테"],
      a: "내용 오류나 업데이트 문의는 후공정 생산기술팀으로 연락해주세요." }
  ];

  var THEORY = {
    laser: { label: "레이저 마킹의 원리와 이유",
      text: "레이저 마킹은 고출력 레이저로 부품 표면을 미세하게 산화·각인시켜 지워지지 않는 표식을 남기는 공정이에요. 2D 데이터매트릭스 코드를 새기는 이유는 생산이력추적(트레이서빌리티) 때문 — 나중에 품질 문제가 생기면 이 코드 하나로 생산일자·라인·로트를 역추적할 수 있어요. 마킹 품질(바코드 등급)이 낮으면 후공정 스캐너가 못 읽어서 그 자체로 불량 처리될 수 있습니다." },
    leak: { label: "리크 테스트의 원리와 이유",
      text: "리크 테스트는 부품 내부에 일정 압력의 공기를 채운 뒤 압력(또는 유량)이 얼마나 빠지는지 측정해 미세한 누설을 찾는 검사예요. 모터 하우징처럼 냉각수·오일이 흐르는 부품은 누설이 있으면 냉각 불량·오일 누유로 이어지기 때문에 전수검사가 기본입니다. CHG(충압)→BAL(안정화)→DET(검출) 단계는 압력을 채우고 안정시킨 뒤 실제 새는 양을 재는 과정이고, 판정 기준(mL/min)은 실사용에 문제 없다고 보는 허용 누설량이에요. '유로계'는 냉각수 유로만, '전체계'는 하우징 전체 기밀을 보는 검사라 따로 두며, 조립 전/후로 나누는 이유는 조립 중 새로 생긴 손상을 구분해서 잡기 위해서입니다." },
    nippleOil: { label: "오일니쁠 압입의 원리와 이유",
      text: "압입은 부품을 억지끼워맞춤으로 밀어 넣어 별도 체결 부품 없이 고정하는 방식이에요. 오일니쁠은 오일이 드나드는 통로를 막거나 여는 부품이라, 압입력이 부족하면 나중에 오일이 새고(누유) 과하면 하우징이나 니쁠 자체가 손상될 수 있어 압입력·스트로크 관리가 씰링 성능과 직결됩니다." },
    capSealing: { label: "씰캡 압입의 원리와 이유",
      text: "씰캡은 하우징의 열린 구멍을 막아 이물질·수분 유입을 차단하는 역할을 해요. 압입 깊이나 압입력이 기준을 벗어나면 캡과 하우징 사이 틈으로 미세하게 물이 스며들 수 있어서, 이후 리크 테스트에서 잡히거나 실사용 중 부식·오작동의 원인이 될 수 있습니다." },
    taperFastening: { label: "테이퍼 플러그 체결의 원리와 이유",
      text: "테이퍼 플러그는 원뿔형(테이퍼) 구조가 조여질수록 점점 꽉 끼는 원리를 이용해 별도 개스킷 없이도 스스로 실링 역할을 해요. 그래서 체결 토크 관리가 중요한데, 토크가 부족하면 실링이 완성되지 않아 누설이 생기고 과도하면 플러그·나사산이 손상될 수 있습니다." },
    dowelPin: { label: "다월핀 압입의 원리와 이유",
      text: "다월핀은 하우징과 커버 등 두 부품을 조립할 때 정확한 위치를 잡아주는(위치결정) 역할을 해요. 삐뚤게 압입되거나 압입 깊이가 안 맞으면 다음 조립 단계에서 부품끼리 정렬이 어긋나거나 무리한 힘이 걸리는 원인이 됩니다." },
    taperHeight: { label: "돌출높이 검사의 원리와 이유",
      text: "테이퍼 플러그를 체결한 뒤에는 하우징 표면 위로 얼마나 튀어나왔는지(돌출높이)를 검사해요. 너무 많이 튀어나오면 다음 조립 부품과 간섭(clearance 문제)이 생기고, 너무 안 나오면 체결이 제대로 안 됐다는 신호일 수 있어 후속 조립 불량을 미리 막기 위한 검사입니다." }
  };

  var BUBBLE_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5c0 4.14-4.03 7.5-9 7.5-1.34 0-2.6-.24-3.74-.67L3 20l1.38-3.44A7.35 7.35 0 0 1 3 11.5C3 7.36 7.03 4 12 4s9 3.36 9 7.5z"/></svg>';
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var SEND_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 11.5L20.5 4 13 21.5l-2.2-7.3L3 11.5z"/></svg>';

  // ===================== 유틸 =====================

  function currentFile() {
    var f = location.pathname.split("/").pop();
    return f && f.length ? f : "index.html";
  }

  function findEquipmentByFile(file) {
    for (var i = 0; i < EQUIPMENT.length; i++) {
      if (EQUIPMENT[i].file === file) return EQUIPMENT[i];
    }
    return null;
  }

  function topicByKey(key) {
    for (var i = 0; i < SECTION_TOPICS.length; i++) {
      if (SECTION_TOPICS[i].key === key) return SECTION_TOPICS[i];
    }
    return null;
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  // 쿼리 문자열에 등장한 키워드 개수로 점수를 매겨 가장 근접한 설비(들)를 찾음.
  // 여러 설비가 동점이면 전부 반환해서 사용자에게 직접 고르게 함(잘못 단정하지 않음).
  function findEquipment(q) {
    var noMatch = q.match(/\b(1[1-9]0|200)\b/);
    var scored = [];
    for (var i = 0; i < EQUIPMENT.length; i++) {
      var eq = EQUIPMENT[i];
      var score = 0;
      if (noMatch && Number(noMatch[1]) === eq.no) score += 10;
      if (q.indexOf(eq.name) !== -1) score += 5;
      for (var k = 0; k < eq.keywords.length; k++) {
        if (q.indexOf(eq.keywords[k]) !== -1) score += eq.keywords[k].length >= 3 ? 2 : 1;
      }
      if (score > 0) scored.push({ eq: eq, score: score });
    }
    if (!scored.length) return [];
    var max = 0;
    for (var s = 0; s < scored.length; s++) if (scored[s].score > max) max = scored[s].score;
    return scored.filter(function (s) { return s.score === max; }).map(function (s) { return s.eq; });
  }

  function findTopic(q) {
    for (var i = 0; i < SECTION_TOPICS.length; i++) {
      var t = SECTION_TOPICS[i];
      for (var k = 0; k < t.keywords.length; k++) {
        if (q.indexOf(t.keywords[k]) !== -1) return t;
      }
    }
    return null;
  }

  function findFaq(q) {
    for (var i = 0; i < FAQ.length; i++) {
      var f = FAQ[i];
      for (var k = 0; k < f.keywords.length; k++) {
        if (q.indexOf(f.keywords[k]) !== -1) return f;
      }
    }
    return null;
  }

  // ===================== 섹션 열기/스크롤 (현재 페이지 안) =====================

  function findSectionElement(topicKey) {
    var topic = topicByKey(topicKey);
    if (!topic) return null;
    var sections = document.querySelectorAll("details.section");
    for (var i = 0; i < sections.length; i++) {
      var summary = sections[i].querySelector("summary");
      if (summary && summary.textContent.indexOf(topic.match) !== -1) return sections[i];
    }
    return null;
  }

  function openOrScrollSection(topicKey) {
    var el = findSectionElement(topicKey);
    if (!el) return false;
    var locked = el.getAttribute("data-lock") === "2";
    // 잠금 섹션은 강제로 펼치지 않는다 — gate.js의 2차 암호 확인을 우회하지 않기 위함.
    if (!locked) el.open = true;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    return true;
  }

  function gotoSection(eq, topicKey) {
    if (eq.file === currentFile()) {
      openOrScrollSection(topicKey);
    } else {
      location.href = eq.file + "?goto=" + topicKey;
    }
  }

  function handleGotoParam() {
    var params;
    try {
      params = new URLSearchParams(location.search);
    } catch (e) {
      return;
    }
    var topic = params.get("goto");
    if (!topic) return;
    openOrScrollSection(topic);
    params.delete("goto");
    var qs = params.toString();
    var newUrl = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history.replaceState(null, "", newUrl);
  }

  // ===================== 답변 생성 =====================

  function goToEquipment(eq) {
    if (eq.file === currentFile()) {
      addMessage({ from: "bot", text: "지금 보고 계신 페이지예요." });
      return;
    }
    location.href = eq.file;
  }

  function buildEquipmentActions(eq) {
    var actions = [{ label: eq.name + " 페이지 열기 →", run: function () { goToEquipment(eq); } }];
    actions.push({ label: "일상점검표 보기", run: function () { gotoSection(eq, "checklist"); } });
    if (eq.hasManual) actions.push({ label: "조작 매뉴얼 보기", run: function () { gotoSection(eq, "manual"); } });
    if (eq.theoryKey && THEORY[eq.theoryKey]) {
      actions.push({ label: "공정 상식 보기", run: function () { addMessage({ from: "bot", text: THEORY[eq.theoryKey].text }); } });
    }
    return actions;
  }

  function replyWithSectionJump(eq, topic) {
    var sameFile = eq.file === currentFile();
    var text = eq.name + "의 \"" + topic.label + "\"" + (topic.locked ? " (잠금 항목)" : "") + "로 안내할게요.";
    if (topic.locked) text += " 잠금 항목이라 실제로 보려면 암호 확인이 필요해요.";
    return {
      from: "bot",
      text: text,
      actions: [{ label: (sameFile ? "여기서 바로 보기" : eq.name + " 페이지에서 보기") + " →", run: function () { gotoSection(eq, topic.key); } }]
    };
  }

  function equipmentListActions(filterFn) {
    return EQUIPMENT.filter(filterFn || function () { return true; }).map(function (eq) {
      return { label: eq.no + " · " + eq.name, run: function () { goToEquipment(eq); } };
    });
  }

  function quickChips() {
    return [
      { label: "설비 목록", run: function () {
        addMessage({ from: "bot", text: "설비를 선택하세요.", actions: equipmentListActions() });
      } },
      { label: "점검표 보기", run: function () {
        var cur = findEquipmentByFile(currentFile());
        if (cur) {
          addMessage(replyWithSectionJump(cur, topicByKey("checklist")));
        } else {
          addMessage({
            from: "bot", text: "어떤 설비의 점검표를 볼까요?",
            actions: EQUIPMENT.map(function (eq) { return { label: eq.name, run: function () { gotoSection(eq, "checklist"); } }; })
          });
        }
      } },
      { label: "자주 묻는 질문", run: function () {
        addMessage({
          from: "bot", text: "궁금하신 걸 선택하세요.",
          actions: FAQ.map(function (f) { return { label: f.q, run: function () { addMessage({ from: "bot", text: f.a }); } }; })
        });
      } },
      { label: "공정 상식", run: function () {
        var keys = Object.keys(THEORY);
        addMessage({
          from: "bot", text: "어떤 공정이 궁금하세요?",
          actions: keys.map(function (k) { return { label: THEORY[k].label, run: function () { addMessage({ from: "bot", text: THEORY[k].text }); } }; })
        });
      } }
    ];
  }

  function buildReply(rawQ) {
    var q = rawQ.trim();

    var faq = findFaq(q);
    if (faq) return { from: "bot", text: faq.a };

    var matches = findEquipment(q);
    var hasTheoryWord = /원리|이론|왜\b|상식|무슨\s*원리|어떤\s*원리/.test(q);
    var topic = findTopic(q);

    if (matches.length > 1) {
      return {
        from: "bot",
        text: "\"" + rawQ + "\"에 해당할 수 있는 설비가 여러 개예요. 어떤 설비인가요?",
        actions: matches.map(function (eq) { return { label: eq.name + " (" + eq.no + ")", run: function () { goToEquipment(eq); } }; })
      };
    }

    if (matches.length === 1) {
      var eq = matches[0];
      if (hasTheoryWord && eq.theoryKey && THEORY[eq.theoryKey]) {
        return {
          from: "bot", text: THEORY[eq.theoryKey].text,
          actions: [{ label: eq.name + " 페이지 열기 →", run: function () { goToEquipment(eq); } }]
        };
      }
      if (topic) return replyWithSectionJump(eq, topic);
      return {
        from: "bot",
        text: eq.name + " · 공정No." + eq.no + " (" + eq.doc + ")",
        actions: buildEquipmentActions(eq)
      };
    }

    if (topic) {
      var curEq = findEquipmentByFile(currentFile());
      if (curEq) return replyWithSectionJump(curEq, topic);
      return {
        from: "bot",
        text: "어떤 설비의 \"" + topic.label + "\"를 찾으세요? 설비를 선택해주세요.",
        actions: EQUIPMENT.filter(function (eq) {
          return (topic.key !== "manual" && topic.key !== "history") || eq.hasManual;
        }).map(function (eq) { return { label: eq.name, run: function () { gotoSection(eq, topic.key); } }; })
      };
    }

    if (/4775|47750/.test(q)) {
      return {
        from: "bot",
        text: "품번 47750-0E000(HOUSING ASS'Y-MOTOR)은 아래 10개 설비 공정 전체에서 다룹니다.",
        actions: equipmentListActions()
      };
    }

    return {
      from: "bot",
      text: "이해하지 못했어요. 설비 이름(예: 레이저마킹), 공정No.(예: 120), 점검표·매뉴얼·상식 같은 말로 다시 물어보시거나 아래 버튼을 이용해보세요.",
      actions: quickChips()
    };
  }

  function processQuery(raw) {
    if (!raw.trim()) return;
    addMessage({ from: "user", text: raw });
    addMessage(buildReply(raw));
  }

  // ===================== UI =====================

  var msgBody = null;
  var greeted = false;

  function addMessage(msg) {
    if (!msgBody) return;
    var el = document.createElement("div");
    el.className = "dnk-asst-msg " + (msg.from === "user" ? "user" : "bot");
    var bubble = document.createElement("div");
    bubble.className = "dnk-asst-bubble";
    bubble.textContent = msg.text;
    el.appendChild(bubble);
    if (msg.actions && msg.actions.length) {
      var actionsWrap = document.createElement("div");
      actionsWrap.className = "dnk-asst-actions";
      msg.actions.forEach(function (a) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "dnk-asst-action";
        b.textContent = a.label;
        b.addEventListener("click", a.run);
        actionsWrap.appendChild(b);
      });
      el.appendChild(actionsWrap);
    }
    msgBody.appendChild(el);
    msgBody.scrollTop = msgBody.scrollHeight;
  }

  function addStyle() {
    var style = document.createElement("style");
    style.textContent =
      ".dnk-asst-btn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:50%;background:#0a2540;color:#fff;border:none;box-shadow:0 6px 18px rgba(10,37,64,.28),0 2px 6px rgba(10,37,64,.18);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9000;padding:0;transition:transform .15s ease,box-shadow .15s ease;}" +
      ".dnk-asst-btn:active{transform:scale(.94);}" +
      ".dnk-asst-panel{position:fixed;right:16px;bottom:calc(78px + env(safe-area-inset-bottom,0px));width:min(360px,calc(100vw - 32px));max-height:min(70vh,520px);background:#fff;border-radius:14px;box-shadow:0 12px 32px rgba(10,37,64,.22),0 4px 10px rgba(10,37,64,.12);display:flex;flex-direction:column;overflow:hidden;z-index:9000;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease;}" +
      ".dnk-asst-panel.open{opacity:1;transform:none;pointer-events:auto;}" +
      ".dnk-asst-head{background:#0a2540;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13.5px;font-weight:700;flex-shrink:0;}" +
      ".dnk-asst-close{background:none;border:none;color:#cdd8e3;cursor:pointer;padding:2px;display:flex;}" +
      ".dnk-asst-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f4f6f8;-webkit-overflow-scrolling:touch;}" +
      ".dnk-asst-msg{display:flex;flex-direction:column;gap:6px;max-width:88%;}" +
      ".dnk-asst-msg.user{align-self:flex-end;align-items:flex-end;}" +
      ".dnk-asst-msg.bot{align-self:flex-start;align-items:flex-start;}" +
      ".dnk-asst-bubble{padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.55;white-space:pre-line;word-break:keep-all;}" +
      ".dnk-asst-msg.bot .dnk-asst-bubble{background:#fff;color:#181d22;border:1px solid #d3d8de;border-bottom-left-radius:3px;}" +
      ".dnk-asst-msg.user .dnk-asst-bubble{background:#0f6cb0;color:#fff;border-bottom-right-radius:3px;}" +
      ".dnk-asst-actions{display:flex;flex-direction:column;gap:6px;width:100%;}" +
      ".dnk-asst-action{background:#fff;border:1px solid #0f6cb0;color:#0f6cb0;border-radius:8px;padding:8px 10px;font-size:12.5px;font-weight:700;text-align:left;cursor:pointer;}" +
      ".dnk-asst-action:active{background:#0f6cb0;color:#fff;}" +
      ".dnk-asst-inputrow{display:flex;gap:8px;padding:10px;border-top:1px solid #d3d8de;background:#fff;flex-shrink:0;}" +
      /* 16px 미만이면 iOS가 포커스 시 화면을 강제로 확대함(gate.js와 동일 이슈) */
      ".dnk-asst-input{flex:1;min-width:0;border:1px solid #d3d8de;border-radius:20px;padding:9px 14px;font-size:16px;outline:none;}" +
      ".dnk-asst-input:focus{border-color:#0f6cb0;}" +
      ".dnk-asst-send{width:38px;height:38px;border-radius:50%;background:#0a2540;color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}" +
      "@media (hover:hover) and (pointer:fine){.dnk-asst-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(10,37,64,.32),0 3px 8px rgba(10,37,64,.2);}.dnk-asst-action:hover{background:#0f6cb0;color:#fff;}}" +
      "@media (prefers-reduced-motion:reduce){.dnk-asst-panel,.dnk-asst-btn{transition:none!important;}}";
    document.documentElement.appendChild(style);
  }

  function buildWidget() {
    var wrap = document.createElement("div");
    wrap.className = "dnk-asst";
    wrap.innerHTML =
      '<button type="button" class="dnk-asst-btn" aria-label="설비 정보 도우미 열기" aria-expanded="false">' + BUBBLE_SVG + "</button>" +
      '<div class="dnk-asst-panel" role="dialog" aria-label="설비 정보 도우미">' +
        '<div class="dnk-asst-head"><span>설비 정보 도우미</span><button type="button" class="dnk-asst-close" aria-label="닫기">' + CLOSE_SVG + "</button></div>" +
        '<div class="dnk-asst-body"></div>' +
        '<div class="dnk-asst-inputrow">' +
          '<input type="text" class="dnk-asst-input" placeholder="궁금한 걸 입력해보세요" aria-label="질문 입력" autocomplete="off" />' +
          '<button type="button" class="dnk-asst-send" aria-label="보내기">' + SEND_SVG + "</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);

    var btn = wrap.querySelector(".dnk-asst-btn");
    var panel = wrap.querySelector(".dnk-asst-panel");
    var input = wrap.querySelector(".dnk-asst-input");
    var sendBtn = wrap.querySelector(".dnk-asst-send");
    var closeBtn = wrap.querySelector(".dnk-asst-close");

    msgBody = wrap.querySelector(".dnk-asst-body");

    var opened = false;
    function setOpen(v) {
      opened = v;
      panel.classList.toggle("open", v);
      btn.setAttribute("aria-expanded", String(v));
      if (v && !greeted) {
        greeted = true;
        addMessage({
          from: "bot",
          text: "안녕하세요! 설비 정보 도우미예요. 설비 이름, 공정No., 점검표·매뉴얼·상식 등 궁금한 걸 입력하거나 아래 버튼을 눌러보세요.",
          actions: quickChips()
        });
      }
      if (v) setTimeout(function () { input.focus(); }, 60);
    }

    btn.addEventListener("click", function () { setOpen(!opened); });
    closeBtn.addEventListener("click", function () { setOpen(false); });

    function submit() {
      var v = input.value;
      if (!v.trim()) return;
      input.value = "";
      processQuery(v);
    }
    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function init() {
    addStyle();
    buildWidget();
    handleGotoParam();
  }

  // 이미 인증된 세션에서 다른 페이지로 이동하면 게이트가 마이크로태스크만으로 거의
  // 즉시 풀리는데, 그 경우 <main>의 아코디언들이 아직 파싱되기 전에 이 스크립트가
  // 실행될 수 있다(gate.js가 wireSections()에 onReady를 쓰는 것과 같은 이유).
  (window.dnkGate && window.dnkGate.ready ? window.dnkGate.ready : Promise.resolve(true)).then(function () {
    onReady(init);
  });
})();
