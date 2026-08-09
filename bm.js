/* ─────────────────────────────────────────────────────────────
   송도 배차 북마클릿 본체  (v6 · 2026-08-09 · 히트맵판)
   업로드 위치: https://bada43131-ai.github.io/dispatch/bm.js
   저장소     : github.com/bada43131-ai/dispatch

   ※ 이 파일만 고치면 북마클릿은 다시 등록할 필요가 없습니다.

   v6 변경점
     - 배치존 13곳 → 30곳 (2026-08-09 카카오 개편 반영, 적정 합계 311)
     - last_dropoff_dt / last_dropoff_count 수집 → 「직전 하차 시각」 표시
     - 목적지: dispatch_v4.html → dispatch_heat.html (히트맵)
     - 수리 / 배터리 티켓 수집은 기존 그대로 유지

   존 현재수량: GET /api/v2/operating/bike_zones/{id}
       available_device_count  운영웹 "현재 기기 수"
       required_amount         운영웹 "적정수량"
       last_dropoff_dt         운영웹 "마지막 하차" 일시
       last_dropoff_count      운영웹 "마지막 하차" 대수
   인증: Authorization: Bearer localStorage.token (+ credentials:'include')
   ───────────────────────────────────────────────────────────── */
(function () {
  var TARGET = 'https://bada43131-ai.github.io/dispatch/dispatch_heat.html';

  /* 배치존 30곳 — 북쪽→남쪽 순.
     ⚠ 이 순서는 dispatch_heat.html 의 DEF 배열과 반드시 같아야 한다. */
  var IDS = [
    386,  /* 송도이편한세상 정문 */          6736, /* 달빛축제공원역 버스정류장 */
    4941, /* 송도국제학교 테니스장뒤 */      4947, /* 힐스테이크레이크송도APT */
    6743, /* 송도힐스테이트 5단지 */         6748, /* 해돋이로 3거리 */
    4940, /* 센트럴파크역3번출구 */          365,  /* 센트럴파크 산책정원 */
    388,  /* 캠퍼스타운역1번출구 */          366,  /* 센트럴파크 테라스정원 */
    363,  /* 캠퍼스타운역2번출구 */          375,  /* 송도시외버스환승센터 */
    377,  /* 캠퍼스타운롯데캐슬 */           373,  /* 해돋이도서관 */
    364,  /* 인천대입구역2번출구 */          368,  /* 인천대입구역1번출구 */
    6742, /* 송도프리미어아울렛 주차장 */    370,  /* 송도타임스페이스 */
    4942, /* 송도더샵마스터뷰21블럭APT */    6747, /* 이마트 에브리데이 */
    389,  /* 테크노파크역3번출구 */          362,  /* 테크노파크역2번출구 */
    376,  /* 연세대 송도학사C동 */           6745, /* 햇무리공원 맞은편 */
    6749, /* 미추홀공원 */                   6744, /* 아미코젠 배지공장 */
    6746, /* 인천대학교 북문 */              378,  /* 지식정보단지역4번출구 */
    6750, /* 송도스마트스퀘어 */             387   /* 라이크홈 기숙사 */
  ];

  /* 송도 경계 (Leaflet Draw로 그린 폴리곤) — 수리/배터리 기기 필터용 */
  var POLY = [
    [126.58842, 37.42839], [126.63460, 37.42825], [126.63923, 37.40957],
    [126.64507, 37.40971], [126.66653, 37.39157], [126.70017, 37.38203],
    [126.70120, 37.37793], [126.66344, 37.33768], [126.58104, 37.34068]
  ];
  function inSongdo(d) {
    var loc = d.adjusted_location || d.location;
    if (!loc) return false;
    var x = loc.lng, y = loc.lat, c = false;
    for (var i = 0, k = POLY.length - 1; i < POLY.length; k = i++) {
      var xi = POLY[i][0], yi = POLY[i][1], xj = POLY[k][0], yj = POLY[k][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function modelOf(d) {
    var m = String(d.code || d.id || '').match(/^[a-zA-Z]+/);
    return m ? m[0].toUpperCase() : '?';
  }

  /* 진행 배너 */
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#185FA5;color:#fff;padding:14px 26px;border-radius:10px;font-size:14px;' +
    'font-weight:700;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.3);' +
    'font-family:sans-serif;white-space:nowrap';
  banner.textContent = '송도 데이터 수집 중...';
  document.body.appendChild(banner);
  function done(msg, color, ms) {
    banner.textContent = msg;
    banner.style.background = color;
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, ms);
  }

  (async function () {
    try {
      var token = localStorage.getItem('token');
      if (!token) throw new Error('토큰 없음 — 운영웹 로그인 상태를 확인하세요');
      var headers = { 'Authorization': 'Bearer ' + token };

      /* ── 1. 배치존 30곳 병렬 호출 ───────────────────────────── */
      var rows = await Promise.all(IDS.map(function (id) {
        return fetch('/api/v2/operating/bike_zones/' + id, { credentials: 'include', headers: headers })
          .then(function (r) { return r.ok ? r.json() : {}; })
          .catch(function () { return {}; });
      }));

      var d = [], o = [], l = [], fail = 0;
      rows.forEach(function (j) {
        if (j.required_amount == null && j.available_device_count == null) fail++;
        d.push(j.available_device_count != null ? j.available_device_count : '');
        o.push(j.required_amount || '');
        var t = j.last_dropoff_dt ? String(j.last_dropoff_dt).replace(/[^0-9]/g, '').slice(0, 12) : '';
        l.push(t ? (t + (j.last_dropoff_count ? '.' + j.last_dropoff_count : '')) : '');
      });
      if (fail === IDS.length) throw new Error('존 조회 실패 — 세션 만료(Ctrl+Shift+R)');

      /* ── 2. 수리 / 배터리 티켓 (Vue 스토어 직접 읽기) ────────── */
      var repairResults = [], batteryResults = [];
      try {
        var store = document.querySelector('#app').__vue_app__.config.globalProperties.$store;
        var devices = store.state.devices || [];

        repairResults = devices
          .filter(function (x) { return x.repairTicket && inSongdo(x); })
          .map(function (x) {
            var t = x.repairTicket;
            return {
              code: x.code || x.id,
              model: modelOf(x),
              repairType: String(t.type || '').indexOf('FIELD') >= 0 ? 'FIELD' : 'WAREHOUSE',
              comments: (t.comments || []).map(function (c) { return (c.comment || '').slice(0, 40); }).filter(Boolean)
            };
          }).slice(0, 80);

        batteryResults = devices
          .filter(function (x) { return x.batteryTicket && inSongdo(x); })
          .map(function (x) { return { code: x.code || x.id, model: modelOf(x), battery: x.battery }; })
          .slice(0, 120);
      } catch (e) {
        /* 스토어 구조가 바뀌어도 존 숫자는 API라 배차 판단은 계속 가능 */
      }

      /* ── 3. 히트맵으로 전달 ─────────────────────────────────── */
      var params = [
        'd=' + d.join(','),
        'o=' + o.join(','),
        'l=' + l.join(',')
      ];
      if (repairResults.length)  params.push('repair='  + encodeURIComponent(JSON.stringify(repairResults)));
      if (batteryResults.length) params.push('battery=' + encodeURIComponent(JSON.stringify(batteryResults)));

      var url = TARGET + '?' + params.join('&');
      done('✓ 존 ' + (IDS.length - fail) + '/' + IDS.length +
           ' · 수리 ' + repairResults.length + ' · 배터리 ' + batteryResults.length, '#0F6E56', 2500);

      setTimeout(function () {
        var w = window.open(url, '_blank');
        if (!w) location.href = url;   /* 팝업 차단 시 현재 탭에서 이동 */
      }, 400);

    } catch (err) {
      done('✗ ' + (err && err.message ? err.message : '수집 실패'), '#B91C1C', 5000);
    }
  })();
})();
