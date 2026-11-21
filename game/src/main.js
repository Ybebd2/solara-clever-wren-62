// SOLARA — main: boot, game loop (dt clamped), start screen, mission start,
// gecko pickups, debug API. Written fresh from the R5-mirror spec.

import * as THREE from 'three';
import { S, districtAt, setMessage } from './config.js';
import { initInput, endFrameInput, consume } from './input.js';
import { buildWorld } from './world.js';
import { buildTraffic, updateTraffic } from './vehicles.js';
import { makePlayerMesh, updatePlayer } from './player.js';
import { createPolice, updatePolice, policeCount } from './police.js';
import { MISSIONS, MISSION_START, createMissionVisuals, startMission, updateMissions } from './missions.js';
import { initHud, updateHud, showDialogue } from './hud.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const VERSION = '8.0.0';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 8, 72);

const world = buildWorld(scene, THREE);
const traffic = buildTraffic(scene, THREE, 26);
const playerMesh = makePlayerMesh(THREE);
playerMesh.position.set(S.px, 0, S.pz);
playerMesh.rotation.y = S.heading;
scene.add(playerMesh);
const police = createPolice(scene, THREE);
const missionVisuals = createMissionVisuals(scene, THREE);
const audio = createAudio();

const ctx = {
  THREE,
  scene,
  camera,
  playerMesh,
  colliders: world.colliders,
  traffic,
  police,
  missions: { ...missionVisuals, dialogueCb: (t, w, s) => showDialogue(t, w, s), secondLineShown: false },
  audio,
  camYaw: S.heading + Math.PI,
  camPitch: 0.25,
  jumpV: 0,
  jumpY: 0,
  lastShot: -9,
  mouseDown: false,
  fixedCam: null,
  geckosGot: 0,
  geckos: world.geckos,
  peds: world.peds,
  cruisers: police.cruisers,
  districtName: 'SOLARA CITY',
  targetProvider: null,
  showDialogue,
};
ctx.targetProvider = () => {
  if (!S.missionActive) return null;
  const m = MISSIONS[S.missionIdx];
  if (!m) return null;
  if (m.type === 'finale' && S.missionStage === 1) return [-192, -192];
  return m.target;
};

initInput(canvas);
initHud();

canvas.addEventListener('mousedown', (e) => { if (e.button === 0) ctx.mouseDown = true; });
window.addEventListener('mouseup', () => { ctx.mouseDown = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- start screen ---
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
  audio.init();
  S.started = true;
  startScreen.classList.add('hidden');
  setMessage('Welcome to Solara, Kai. Press E at the yellow marker to start your first job.', 6);
});
document.getElementById('load-btn').addEventListener('click', () => {
  setMessage('No save found — starting a new game.', 3);
  startBtn.click();
});
document.getElementById('settings-btn').addEventListener('click', () => {
  S.soundOn = !S.soundOn;
  setMessage(S.soundOn ? 'Sound ON' : 'Sound OFF', 2);
});

// --- staged screenshots (?shot=1..4) ---
const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
let shotMode = false;
if (shotParam) {
  const n = parseInt(shotParam, 10);
  if (n >= 1 && n <= 4) {
    shotMode = applyShot(ctx, n);
    if (n === 1) startScreen.classList.remove('hidden');
    else startScreen.classList.add('hidden');
  }
}

// --- debug API ---
window.__solara = {
  version: VERSION,
  S,
  traffic,
  cruisers: police.cruisers,
  officers: police.officers,
  policeCount: () => policeCount(police),
  getState: () => {
    const snap = JSON.parse(JSON.stringify({ ...S, car: null }));
    if (S.car) snap.car = { x: S.car.x, z: S.car.z, heading: S.car.heading, speed: S.car.speed, health: S.car.health };
    return snap;
  },
};

let lastJobsDone = 0;
let lastWanted = 0;

// --- main loop ---
let lastT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!S.paused) S.time += dt;

  if (S.started && !S.paused) {
    // E: start the current mission at the marker
    if (!S.missionActive) {
      const dStart = Math.hypot(S.px - MISSION_START[0], S.pz - MISSION_START[1]);
      if (dStart <= 10 && consume('KeyE')) {
        const idx = S.missionIdx;
        startMission(idx, (t, w, s) => showDialogue(t, w, s));
        if (idx === 6) S.wanted = 3; // Heat Wave: the heat is on
        if (audio) audio.pickup();
      }
    }

    updatePlayer(ctx, dt);
    updateTraffic(traffic, dt, S.shotMode);
    updatePolice(police, scene, THREE, dt);
    updateMissions(ctx, dt);

    // peds wander around their home spots (frozen in staged shots)
    for (const p of world.peds) {
      if (S.shotMode) continue;
      const t = S.time * p.speed + p.phase;
      p.mesh.position.x = p.homeX + Math.sin(t * 0.5) * 4;
      p.mesh.position.z = p.homeZ + Math.cos(t * 0.35) * 4;
      p.mesh.rotation.y = Math.atan2(Math.cos(t * 0.5), -Math.sin(t * 0.35));
    }

    // gecko pickups
    for (const gk of world.geckos) {
      if (gk.taken) continue;
      gk.mesh.rotation.y += dt * 2;
      gk.mesh.position.y = 1.2 + Math.sin(S.time * 2 + gk.x) * 0.25;
      const d = Math.hypot(S.px - gk.x, S.pz - gk.z);
      if (d < 2.5) {
        gk.taken = true;
        gk.mesh.visible = false;
        ctx.geckosGot++;
        S.cash += 25;
        if (audio) audio.pickup();
        setMessage('Golden Gecko found! +$25  (' + ctx.geckosGot + '/20)', 2);
      }
    }

    // ocean foam drift
    if (world.foam) world.foam.position.x = -288 + Math.sin(S.time * 0.6) * 1.2;

    // district label
    const d = districtAt(S.px, S.pz);
    ctx.districtName = d ? d.name : 'SOLARA CITY';

    // mission-complete / fail stingers
    if (S.jobsDone > lastJobsDone) { if (audio) audio.complete(); lastJobsDone = S.jobsDone; }
    if (S.wanted > lastWanted && S.wanted >= 2) setMessage('HEAT: ' + S.wanted + ' stars — lose them!', 3);
    lastWanted = S.wanted;

    if (audio) audio.update();
  }

  updateHud(ctx, dt);
  renderer.render(scene, camera);
  endFrameInput();
}
loop();

window.addEventListener('error', (e) => {
  const el = document.getElementById('error-line');
  if (el) el.textContent = 'ERROR: ' + e.message;
});
