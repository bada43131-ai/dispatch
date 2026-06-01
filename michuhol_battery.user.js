// ==UserScript==
// @name        미추홀+연수 배터리 현황
// @namespace   https://bada43131-ai.github.io/
// @version     1.0
// @description 카카오바이크 운영웹에서 미추홀구/연수구 배터리 현황 자동 표시
// @author      bada43131-ai
// @match       https://t-bike-operating.kakao.com/*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── 지역 경계 (bounding box) ──────────────────────────────
  const MI = { w: 126.626, e: 126.763, s: 37.435, n: 37.477 }; // 미추홀구
  const YE = { w: 126.634, e: 126.701, s: 37.391, n: 37.434 }; // 연수구

  function inBox(box, d) {
    const l = d.adjusted_location || d.location;
    return l && l.lng >= box.w && l.lng <= box.e && l.lat >= box.s && l.lat <= box.n;
  }

  function modelOf(d) {
    const m = (d.code || '').match(/^[a-zA-Z]+/);
    return m ? m[0].toUpperCase() : '';
  }

  function repType(d, t) {
    const tp = (d.repairTicket || {}).type || '';
    if (t === 'F') return tp.includes('FIELD') && !tp.includes('URGENT') && !tp.includes('EMERGENCY');
    if (t === 'U') return tp.includes('URGENT') || tp.includes('EMERGENCY');
    return tp.includes('WAREHOUSE');
  }

  function countModel(arr, k) { return arr.filter(d => modelOf(d) === k).length; }

  // ── 데이터 수집 ──────────────────────────────────────────
  function collect() {
    const app = document.querySelector('#app')?.__vue_app__;
    if (!app) return null;
    const devices = app.config.globalProperties.$store?.state?.devices || [];

    const MI_bat = devices.filter(d => d.batteryTicket && inBox(MI, d));
    const YE_bat = devices.filter(d => d.batteryTicket && inBox(YE, d));
    const MI_rep = devices.filter(d => d.repairTicket && inBox(MI, d));
    const YE_rep = devices.filter(d => d.repairTicket && inBox(YE, d));
    const total_bat = devices.filter(d => d.batteryTicket).length;

    const models = ['GF','HA','IA','JA','KA','MA','DA'];
    const modelCounts = {};
    models.forEach(k => {
      modelCounts[k] = countModel(MI_bat, k) + countModel(YE_bat, k);
    });

    return {
      mi: {
        gf: countModel(MI_bat,'GF'), other: MI_bat.length - countModel(MI_bat,'GF'), total: MI_bat.length,
        field: MI_rep.filter(d=>repType(d,'F')).length,
        urgent: MI_rep.filter(d=>repType(d,'U')).length,
        wh: MI_rep.filter(d=>repType(d,'W')).length,
      },
      ye: {
        gf: countModel(YE_bat,'GF'), other: YE_bat.length - countModel(YE_bat,'GF'), total: YE_bat.length,
        field: YE_rep.filter(d=>repType(d,'F')).length,
        urgent: YE_rep.filter(d=>repType(d,'U')).length,
        wh: YE_rep.filter(d=>repType(d,'W')).length,
      },
      models: modelCounts,
      bat_incheon: total_bat,
      total: MI_bat.length + YE_bat.length,
      rep_total: MI_rep.length + YE_rep.length,
      updated: new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
    };
  }

  // ── UI 생성 ───────────────────────────────────────────────
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'mi-battery-panel';
    panel.style.cssText = `
      position:fixed; bottom:70px; right:12px; z-index:99999;
      font-family:-apple-system,sans-serif; font-size:12px;
    `;

    // 토글 버튼
    const btn = document.createElement('div');
    btn.style.cssText = `
      background:#7c3aed; color:#fff; padding:10px 14px; border-radius:20px;
      font-weight:700; font-size:12px; cursor:pointer; text-align:center;
      box-shadow:0 3px 12px rgba(124,58,237,.5); white-space:nowrap;
    `;
    btn.textContent = '🔋 미추홀+연수';
    panel.appendChild(btn);

    // 데이터 카드
    const card = document.createElement('div');
    card.style.cssText = `
      display:none; background:#fff; border-radius:14px; padding:14px;
      box-shadow:0 4px 20px rgba(0,0,0,.2); margin-bottom:8px; min-width:240px;
    `;
    card.id = 'mi-battery-card';
    panel.insertBefore(card, btn);

    btn.addEventListener('click', () => {
      if (card.style.display === 'none') {
        refresh(card);
        card.style.display = 'block';
        btn.textContent = '✕ 닫기';
      } else {
        card.style.display = 'none';
        btn.textContent = '🔋 미추홀+연수';
      }
    });

    document.body.appendChild(panel);
  }

  function row(label, val, color) {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f5f5f5">
      <span style="font-size:11px;color:#666">${label}</span>
      <span style="font-weight:700;font-size:15px;color:${color||'#111'}">${val}</span>
    </div>`;
  }

  function section(title, color) {
    return `<div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.03em;margin:10px 0 4px">${title}</div>`;
  }

  function refresh(card) {
    card.innerHTML = `<div style="text-align:center;color:#aaa;font-size:12px;padding:10px">수집 중...</div>`;
    setTimeout(() => {
      const d = collect();
      if (!d) {
        card.innerHTML = `<div style="color:#e02424;font-size:12px;padding:10px">데이터 없음 — 운영웹 메인에서 실행하세요</div>`;
        return;
      }

      const models = Object.entries(d.models).map(([k,v]) =>
        v > 0 ? `<span style="background:#f0f0f0;border-radius:4px;padding:2px 6px;font-size:10px;margin:1px;display:inline-block"><b>${k}</b> ${v}</span>` : ''
      ).join('');

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-weight:700;font-size:13px;color:#7c3aed">🔋 배터리 현황</span>
          <span style="font-size:10px;color:#aaa">${d.updated}</span>
        </div>

        ${section('⚡ 배터리 티켓', '#555')}
        ${row('합계 (미추홀+연수)', d.total+'대', '#7c3aed')}
        ${row('· 미추홀구', `GF ${d.mi.gf} / 기타 ${d.mi.other}`, '#1d4ed8')}
        ${row('· 연수구', `GF ${d.ye.gf} / 기타 ${d.ye.other}`, '#b45309')}

        ${section('📦 모델별', '#555')}
        <div style="margin-top:2px">${models}</div>

        ${section('🔋 배터리 교체 필요', '#555')}
        ${row('인천 전체', d.bat_incheon+'대', '#0369a1')}
        ${row('담당 구역', d.total+'대', '#7c3aed')}

        ${section('🔧 현장 수리 티켓', '#555')}
        ${row('· 미추홀 현장/긴급/창고', `${d.mi.field}/${d.mi.urgent}/${d.mi.wh}`, '#1d4ed8')}
        ${row('· 연수 현장/긴급/창고', `${d.ye.field}/${d.ye.urgent}/${d.ye.wh}`, '#b45309')}
        ${row('수리 합계', d.rep_total+'대', '#374151')}

        <button onclick="document.getElementById('mi-battery-panel').querySelector('div:last-child').click()"
          style="width:100%;margin-top:10px;padding:8px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">
          🔄 새로고침
        </button>
      `;

      // 새로고침 버튼 이벤트
      const refreshBtn = card.querySelector('button');
      refreshBtn.onclick = () => refresh(card);
    }, 300);
  }

  // ── 초기화 ────────────────────────────────────────────────
  function init(attempts = 0) {
    if (attempts > 20) return;
    const app = document.querySelector('#app')?.__vue_app__;
    const devices = app?.config?.globalProperties?.$store?.state?.devices;
    if (devices && devices.length > 0) {
      createPanel();
    } else {
      setTimeout(() => init(attempts + 1), 1000);
    }
  }

  init();
})();
