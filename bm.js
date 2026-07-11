/* ============================================================
   송도 배차 북마클릿 본체  (v5 · 2026-07-12)
   업로드 위치: https://bada43131-ai.github.io/dispatch/bm.js

   존 현재수량 = 카카오 운영웹이 쓰는 것과 동일한 API를 그대로 사용
     GET /api/v2/operating/bike_zones/{id}
        → available_device_count  = 운영웹 "현재 기기 수"
        → required_amount         = 운영웹 "적정수량"
   기기 전체를 받아 GPS로 세지 않으므로 수리/작업중 기기가 섞일 여지가 없음.

   ※ 이 파일만 고치면 북마클릿을 다시 등록할 필요가 없습니다.
   ============================================================ */
(function () {
  var DISPATCH_URL = 'https://bada43131-ai.github.io/dispatch/dispatch_v4.html';

  var zoneIds = {
    '힐스테이트': 4947, '이편한세상': 386, '송도국제학교': 4941,
    '더샵마스터뷰': 4942, '지식정보단지': 378, '라이크홈': 387,
    '인천대1번': 368, '송도시외버스': 375, '인천대2번': 364,
    '테라스정원': 366, '산책정원': 365, '센트럴파크': 4940,
    '타임스페이스': 370
  };

  // 송도 경계 (Leaflet Draw로 그린 폴리곤) — 수리/배터리 기기 필터용
  var POLY = [
    [126.58842, 37.42839], [126.63460, 37.42825], [126.63923, 37.40957],
    [126.64507, 37.40971], [126.66653, 37.39157], [126.70017, 37.38203],
    [126.70120, 37.37793], [126.66344, 37.33768], [126.58104, 37.34068]
  ];

  var banner = document.createElement('div');
  banner.style = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#185FA5;color:#fff;padding:14px 28px;border-radius:10px;font-size:14px;' +
    'font-weight:700;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.3);' +
    'font-family:sans-serif;white-space:nowrap';
  banner.textContent = '송도 데이터 수집 중...';
  document.body.appendChild(banner);

  function done(msg, color, ms) {
    banner.textContent = msg;
    banner.style.background = color;
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, ms);
  }

  (async function () {
    try {
      var token = localStorage.getItem('token');
      if (!token) throw new Error('토큰 없음 — 운영웹 로그인 상태를 확인하세요');
      var headers = { 'Authorization': 'Bearer ' + token };

      // ── 1. 존 13개 병렬 호출 (약 110ms) ──────────────────────
      var optMap = {};
      var failed = [];

      var zoneResults = await Promise.all(
        Object.entries(zoneIds).map(async function (entry) {
          var name = entry[0], id = entry[1];
          try {
            var res = await fetch('/api/v2/operating/bike_zones/' + id,
              { credentials: 'include', headers: headers });
            var json = await res.json();
            if (typeof json.available_device_count !== 'number') {
              failed.push(name);
              return [name, 0];
            }
            optMap[name] = json.required_amount;
            return [name, json.available_device_count];
          } catch (err) {
            failed.push(name);
            return [name, 0];
          }
        })
      );

      // 조용히 0으로 넘어가지 않는다 — 실패하면 즉시 멈추고 알린다
      if (failed.length > 0) {
        throw new Error('존 조회 실패 (' + failed.length + '개): ' + failed.join(', '));
      }

      // ── 2. 수리 / 배터리 (Vue 스토어 + 송도 폴리곤) ───────────
      var repairResults = [];
      var batteryResults = [];

      try {
        var store = document.querySelector('#app').__vue_app__
          .config.globalProperties.$store;
        var devices = store.state.devices || [];

        var isSongdo = function (d) {
          var loc = d.location || d.adjusted_location;
          if (!loc) return false;
          var x = loc.lng, y = loc.lat, inside = false;
          for (var i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
            var xi = POLY[i][0], yi = POLY[i][1];
            var xj = POLY[j][0], yj = POLY[j][1];
            if (((yi > y) != (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
          }
          return inside;
        };

        var modelOf = function (d) {
          return ((d.code || '').match(/^[a-zA-Z]+/) || ['??'])[0].toUpperCase();
        };

        repairResults = devices
          .filter(function (d) { return d.repairTicket && isSongdo(d); })
          .map(function (d) {
            var t = d.repairTicket || {};
            return {
              code: d.code || d.id,
              model: modelOf(d),
              repairType: (t.type || '').indexOf('FIELD') >= 0 ? 'FIELD' : 'WAREHOUSE',
              comments: (t.comments || [])
                .map(function (c) { return c.comment || ''; })
                .filter(Boolean)
            };
          });

        batteryResults = devices
          .filter(function (d) { return d.batteryTicket && isSongdo(d); })
          .map(function (d) {
            return { code: d.code || d.id, model: modelOf(d), battery: d.battery };
          });
      } catch (e) {
        /* 스토어 구조가 바뀌어도 존 숫자는 API라 배차 판단은 계속 가능 */
      }

      // ── 3. 플래너로 전달 (해시 형식은 기존과 동일) ─────────────
      var params = zoneResults.map(function (r) {
        return encodeURIComponent(r[0]) + '=' + r[1];
      });
      params.push('opt=' + encodeURIComponent(JSON.stringify(optMap)));
      if (repairResults.length) {
        params.push('repair=' + encodeURIComponent(JSON.stringify(repairResults)));
      }
      if (batteryResults.length) {
        params.push('battery=' + encodeURIComponent(JSON.stringify(batteryResults)));
      }

      var hash = params.join('&');
      var total = zoneResults.reduce(function (s, r) { return s + r[1]; }, 0);
      var gf = batteryResults.filter(function (d) { return d.model === 'GF'; }).length;

      done('현재 ' + total + '대 · 수리 ' + repairResults.length +
           '대 · 배터리 GF:' + gf + '/기타:' + (batteryResults.length - gf) +
           ' → 이동...', '#059669', 800);

      setTimeout(function () {
        window.open(DISPATCH_URL + '#' + hash, '_blank');
      }, 800);

    } catch (e) {
      done('실패: ' + e.message, '#DC2626', 5000);
    }
  })();
})();
