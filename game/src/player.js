// SOLARA — player: on-foot movement, camera orbit, weapons, crew powers.
// Written fresh from the R5-mirror spec.

import { S, WEAPONS, CREW, districtAt, setMessage } from './config.js';
import { keys, consume, orbit } from './input.js';
import { collide, nearestTrafficCar, spawnPlayerCar } from './vehicles.js';

export function makePlayerMesh(THREE) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xff6d00 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 10), jacket);
  body.position.y = 1.25;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffcc9e }));
  head.position.y = 2.35;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 12), new THREE.MeshLambertMaterial({ color: 0x212121 }));
  cap.position.y = 2.62;
  g.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x1a237e });
  for (const lx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), legMat);
    leg.position.set(lx, 0.42, 0);
    g.add(leg);
  }
  // VESPER pistol in hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: 0x212121 }));
  gun.position.set(0.45, 1.5, 0.3);
  g.add(gun);
  g.scale.setScalar(1.5);
  return g;
}

export function updatePlayer(ctx, dt) {
  const { THREE, scene, camera, playerMesh, colliders, traffic, audio } = ctx;
  if (!S.started || S.paused || S.over) return;

  // camera orbit from mouse drag
  ctx.camYaw -= orbit.dx * 0.005;
  ctx.camPitch = Math.max(-0.1, Math.min(1.1, ctx.camPitch + orbit.dy * 0.003));

  // crew powers
  if (consume('KeyZ') && S.crewCd.MARA <= 0) {
    if (S.wanted > 0) { S.wanted = Math.max(0, S.wanted - 1); setMessage('MARA: GHOST — one star gone', 3); }
    S.crewCd.MARA = CREW.MARA.cd;
  }
  if (consume('KeyX') && S.crewCd.SULLY <= 0) {
    if (S.inCar && S.car) { S.car.health = 100; setMessage('SULLY: PIT CREW — car fully repaired', 3); }
    S.crewCd.SULLY = CREW.SULLY.cd;
  }
  if (consume('KeyC') && S.crewCd.KIKI <= 0) {
    S.lookoutUntil = S.time + 20;
    setMessage('KIKI: LOOKOUT — patrols revealed 20s', 3);
    S.crewCd.KIKI = CREW.KIKI.cd;
  }
  for (const k of Object.keys(S.crewCd)) S.crewCd[k] = Math.max(0, S.crewCd[k] - dt);

  // radio
  if (consume('KeyQ')) {
    S.station = (S.station + 1) % 4;
    setMessage('RADIO: ' + ['PUERTO 88.3', 'CELESTE 98.1', 'SOLARA 98.3', 'NEON 101.5'][S.station], 2);
    if (audio) audio.setStation(S.station);
  }
  if (consume('KeyM')) S.mapOpen = !S.mapOpen;
  if (consume('Escape')) S.paused = !S.paused;
  if (consume('F9')) {
    S.autopilot = !S.autopilot;
    setMessage(S.autopilot ? 'AUTOPILOT ON — Kai drives himself' : 'AUTOPILOT OFF', 2);
  }

  // weapons 1-5
  for (let i = 0; i < 5; i++) {
    if (consume('Digit' + (i + 1))) {
      S.weaponIdx = i;
      S.ammo = WEAPONS[i].mag === Infinity ? Infinity : WEAPONS[i].mag;
      setMessage('WEAPON: ' + WEAPONS[i].name, 2);
    }
  }
  if (consume('KeyR')) {
    const w = WEAPONS[S.weaponIdx];
    if (w.mag !== Infinity && S.reserve > 0 && S.ammo < w.mag) {
      const need = w.mag - S.ammo;
      const take = Math.min(need, S.reserve);
      S.ammo += take;
      S.reserve -= take;
      setMessage('RELOADED ' + w.name, 2);
    }
  }

  // --- driving ---
  if (S.inCar && S.car) {
    const car = S.car;
    const accel = keys['KeyW'] ? 1 : keys['KeyS'] ? -0.55 : 0;
    const target = accel * (S.autopilot ? 16 : 26) * (1 + S.gripBonus * 0.2);
    car.speed += (target - car.speed) * Math.min(1, dt * 1.6);
    if (keys['KeyA']) car.heading += dt * 1.5 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8);
    if (keys['KeyD']) car.heading -= dt * 1.5 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8);
    if (S.autopilot) {
      // steer toward the current mission target / waypoint
      const t = ctx.targetProvider ? ctx.targetProvider() : null;
      if (t) {
        const want = Math.atan2(t[0] - car.x, t[1] - car.z);
        let diff = want - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-dt * 1.4, Math.min(dt * 1.4, diff));
        car.speed += ((18 - car.speed) * Math.min(1, dt * 1.2));
      }
    }
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    [car.x, car.z] = collide(colliders, car.x, car.z, 1.6);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    S.px = car.x; S.pz = car.z; S.heading = car.heading;
    S.carSpeed = car.speed; S.speed = Math.abs(car.speed);
    playerMesh.position.set(car.x, 0, car.z);
    playerMesh.visible = false;
    if (consume('KeyF')) {
      S.inCar = false;
      S.car = null;
      S.carSpeed = 0;
      S.px = car.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
      S.pz = car.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
      playerMesh.visible = true;
      playerMesh.position.set(S.px, 0, S.pz);
      setMessage('Out of the car', 2);
    }
    updateCamera(ctx);
    return;
  }

  // --- on foot ---
  const sprint = keys['ShiftLeft'] || keys['ShiftRight'] ? 1.7 : 1;
  const walkSpeed = 6.5 * sprint;
  let mx = 0, mz = 0;
  if (keys['KeyW']) mz += 1;
  if (keys['KeyS']) mz -= 1;
  if (keys['KeyA']) mx -= 1;
  if (keys['KeyD']) mx += 1;
  // jump
  if (consume('Space')) {
    ctx.jumpV = 7;
    setMessage('', 0.01);
  }
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
    const camA = ctx.camYaw;
    // forward is where the camera looks
    const fx = -Math.sin(camA), fz = -Math.cos(camA);
    const rx = -fz, rz = fx;
    const dx = (fx * mz + rx * mx) * walkSpeed * dt;
    const dz = (fz * mz + rz * mx) * walkSpeed * dt;
    S.px += dx;
    S.pz += dz;
    S.heading = Math.atan2(dx, dz);
    S.speed = walkSpeed;
  } else {
    S.speed = 0;
  }
  [S.px, S.pz] = collide(colliders, S.px, S.pz, 0.9);

  // jump physics
  if (ctx.jumpV === undefined) ctx.jumpV = 0;
  if (ctx.jumpY === undefined) ctx.jumpY = 0;
  if (ctx.jumpY > 0 || ctx.jumpV > 0) {
    ctx.jumpV -= 22 * dt;
    ctx.jumpY = Math.max(0, ctx.jumpY + ctx.jumpV * dt);
  }

  playerMesh.position.set(S.px, ctx.jumpY, S.pz);
  playerMesh.rotation.y = S.heading;

  // enter a car with F
  if (consume('KeyF')) {
    const near = nearestTrafficCar(traffic, S.px, S.pz, 6);
    if (near) {
      // jack it: remove from traffic, it becomes the player's car
      const idx = traffic.indexOf(near);
      if (idx >= 0) traffic.splice(idx, 1);
      S.inCar = true;
      S.car = { mesh: near.mesh, x: near.mesh.position.x, z: near.mesh.position.z, heading: near.mesh.rotation.y, speed: 0, health: 100 };
      S.carsJacked++;
      S.jackedAt = S.time;
      setMessage('Car jacked — go!', 2);
      if (audio) audio.jack();
    } else if (!S.car) {
      const car = spawnPlayerCar(scene, THREE, S.px + 3, S.pz + 3, S.heading);
      S.inCar = true;
      S.car = car;
      setMessage('In the car', 2);
    }
  }

  // shooting (mouse click) — hitscan at nearest traffic car / ped in range
  if (ctx.mouseDown) {
    const w = WEAPONS[S.weaponIdx];
    if (S.time - (ctx.lastShot || -9) >= w.rate) {
      ctx.lastShot = S.time;
      if (w.mag !== Infinity) {
        if (S.ammo <= 0) { setMessage('EMPTY — press R to reload', 1.5); }
        else {
          S.ammo--;
          S.shotsFired++;
          if (audio) audio.shot();
          const target = nearestTrafficCar(traffic, S.px, S.pz, w.range);
          if (target) { S.hits++; setMessage('HIT!', 1); }
        }
      } else {
        S.shotsFired++;
      }
    }
  }

  // district grip bonus
  const d = districtAt(S.px, S.pz);
  S.gripBonus = d ? d.grip / 100 : 0;

  updateCamera(ctx);
}

export function updateCamera(ctx) {
  const { camera } = ctx;
  // staged screenshot camera wins over the orbit camera
  if (ctx.fixedCam) {
    camera.position.set(ctx.fixedCam.pos[0], ctx.fixedCam.pos[1], ctx.fixedCam.pos[2]);
    camera.lookAt(ctx.fixedCam.look[0], ctx.fixedCam.look[1], ctx.fixedCam.look[2]);
    return;
  }
  const dist = 9.5;
  const height = 3.4 + ctx.camPitch * 4;
  const cx = S.px + Math.sin(ctx.camYaw) * dist;
  const cz = S.pz + Math.cos(ctx.camYaw) * dist;
  camera.position.set(cx, height, cz);
  camera.lookAt(S.px, 2.2, S.pz);
}
