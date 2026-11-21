// SOLARA — HUD: cash, rank, mission panel, wanted stars, health/armour bars,
// ammo, minimap canvas, message line, dialogue box. Written fresh from spec.

import { S, RADIO, WEAPONS } from './config.js';
import { currentMission, currentTarget } from './missions.js';

let els = {};
let dialogueTimer = null;

export function initHud() {
  els = {
    cash: document.getElementById('hud-cash'),
    rank: document.getElementById('hud-rank'),
    mission: document.getElementById('hud-mission'),
    stars: document.getElementById('hud-stars'),
    health: document.getElementById('hud-health-fill'),
    armour: document.getElementById('hud-armour-fill'),
    ammo: document.getElementById('hud-ammo'),
    radio: document.getElementById('hud-radio'),
    message: document.getElementById('hud-message'),
    dialogue: document.getElementById('hud-dialogue'),
    dlgSpeaker: document.getElementById('dlg-speaker'),
    dlgText: document.getElementById('dlg-text'),
    geckos: document.getElementById('hud-geckos'),
    district: document.getElementById('hud-district'),
    minimap: document.getElementById('minimap'),
  };
}

export function showDialogue(text, speaker, secs = 5) {
  if (!els.dialogue) return;
  S.dialogueUntil = S.time + secs;
  els.dlgSpeaker.textContent = speaker;
  els.dlgText.textContent = text;
  els.dialogue.classList.add('show');
  // Hiding is driven by game time (S.dialogueUntil) in updateHud, never by
  // a real-time timer — headless runs at ~2fps, so a wall-clock timeout
  // would kill the line before the screenshot is taken.
}

function fmtTime(s) {
  const m = Math.max(0, Math.floor(s / 60));
  const sec = Math.max(0, Math.floor(s % 60));
  return m + ':' + String(sec).padStart(2, '0');
}

export function updateHud(ctx, dt) {
  if (!els.cash) return;
  els.cash.textContent = '$' + S.cash.toLocaleString('en-US');
  els.rank.textContent = S.rank + ' • ' + S.jobsDone + '/8';
  const m = currentMission();
  if (m) {
    const t = currentTarget();
    const d = t ? Math.round(Math.hypot(S.px - t[0], S.pz - t[1])) : 0;
    if (S.missionActive) {
      els.mission.innerHTML = '<b>' + m.giver + ' — ' + m.name + '</b><br>' +
        m.brief + '<br>DIST ' + d + 'm • ' + fmtTime(S.missionTime) +
        (m.type === 'hold' || (m.type === 'finale' && S.missionStage === 0)
          ? ' • HOLD ' + Math.max(0, 5 - S.missionHold).toFixed(1) + 's' : '') +
        (m.type === 'finale' && S.missionStage === 1 ? ' • GETAWAY — drive to Marina' : '');
    } else {
      els.mission.innerHTML = '<b>Next job: ' + m.giver + ' — ' + m.name + '</b><br>' +
        m.brief + '<br>Press E at the yellow marker at MO\'S';
    }
  }
  els.stars.textContent = '★'.repeat(S.wanted) + '☆'.repeat(Math.max(0, 5 - S.wanted));
  els.stars.style.color = S.wanted >= 3 ? '#ff1744' : '#ffd600';
  els.health.style.width = Math.max(0, S.health) + '%';
  els.armour.style.width = Math.max(0, S.armour) + '%';
  const w = WEAPONS[S.weaponIdx];
  els.ammo.textContent = w.name + '  ' + (S.ammo === Infinity ? '∞' : S.ammo + ' / ' + S.reserve);
  els.radio.textContent = (S.radioOn ? '♪ ' : '♪✕ ') + RADIO[S.station].name;
  els.message.textContent = S.time < S.messageUntil ? S.message : '';
  els.geckos.textContent = '🦎 ' + ctx.geckosGot + '/20';
  els.district.textContent = ctx.districtName || 'SOLARA CITY';
  if (S.time > S.dialogueUntil) els.dialogue.classList.remove('show');

  // minimap
  const mm = els.minimap;
  if (mm) {
    const g = mm.getContext('2d');
    const W = mm.width, H = mm.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,18,28,0.85)';
    g.fillRect(0, 0, W, H);
    const toMap = (x, z) => [(x + 320) / 640 * W, (z + 320) / 640 * H];
    // ocean
    g.fillStyle = '#19b8c9';
    g.fillRect(0, 0, 32 / 640 * W, H);
    // roads
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let v = -256; v <= 256; v += 64) {
      const [x1] = toMap(v, 0);
      g.beginPath(); g.moveTo(x1, 0); g.lineTo(x1, H); g.stroke();
      const [, z1] = toMap(0, v);
      g.beginPath(); g.moveTo(0, z1); g.lineTo(W, z1); g.stroke();
    }
    // geckos
    g.fillStyle = '#ffd600';
    for (const gk of ctx.geckos) {
      if (gk.taken) continue;
      const [gx, gz] = toMap(gk.x, gk.z);
      g.beginPath(); g.arc(gx, gz, 2.5, 0, Math.PI * 2); g.fill();
    }
    // mission target beacon
    const t = currentTarget();
    if (t) {
      const [tx, tz] = toMap(t[0], t[1]);
      g.fillStyle = '#ff1744';
      g.beginPath(); g.arc(tx, tz, 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ff1744';
      g.beginPath(); g.arc(tx, tz, 8 + Math.sin(S.time * 4) * 2, 0, Math.PI * 2); g.stroke();
    }
    // police dots (lookout reveals them)
    if (S.time < S.lookoutUntil) {
      g.fillStyle = '#2979ff';
      for (const c of ctx.cruisers) {
        const [cx, cz] = toMap(c.mesh.position.x, c.mesh.position.z);
        g.beginPath(); g.arc(cx, cz, 3, 0, Math.PI * 2); g.fill();
      }
    }
    // player arrow
    const [px, pz] = toMap(S.px, S.pz);
    g.save();
    g.translate(px, pz);
    g.rotate(Math.atan2(Math.sin(S.heading), Math.cos(S.heading)) * -1 + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
    g.restore();
    // north + map overlay label
    if (S.mapOpen) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.font = 'bold 11px sans-serif';
      g.fillText('MAP — ' + (ctx.districtName || 'SOLARA CITY'), 8, 14);
    }
  }
}
